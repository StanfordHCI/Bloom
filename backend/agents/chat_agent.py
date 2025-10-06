from abc import ABC, abstractmethod
import uuid
from google.cloud.firestore import DELETE_FIELD # type: ignore
from backend.api.models import UserChatMessage, ToolResponseMessage, ChatState 
from backend.llm.models import AnnotatedMessage, ResponseChunk, SafetyResponseChunk, ToolRequest
from backend.managers.firebase_manager import FirebaseManager
from backend.modules.tool_module import ToolModule
from backend.modules.safety_module import SafetyModule
from backend.llm.llm_provider import LLMProvider
from typing import Callable, Awaitable, AsyncGenerator, Optional, Union
import logging

logger = logging.getLogger(__name__)

firebase_manager = FirebaseManager()

class ChatAgent(ABC):
    def __init__(self):
        self.safety_module = SafetyModule()      
        self.llm_client = LLMProvider.get_client()  

    async def start_conversation(
        self,
        uid: str,
        user_history: list[AnnotatedMessage],
        response_callback: Callable[
            [str, AnnotatedMessage, Optional[AsyncGenerator[ResponseChunk | ToolRequest, None]], bool],
            Awaitable[None]
        ],
        get_error_tool_response: Callable
    ) -> None:
        """
        Starts a new conversation with the user or resumes the current conversation.
        Streams the results using async generator.
        """

        # If at-will, check if there is an LLM notification message to display
        llm_message_content = None
        if self.get_chat_state() == ChatState.AT_WILL.value:
            user_doc_ref = firebase_manager.get_user_doc_ref(uid)
            user_doc = await user_doc_ref.get()
            user_doc_dict = (user_doc.to_dict() or {}) if user_doc.exists else {}

            delete_message_content = user_doc_dict.get("deleteMessage")
            if delete_message_content:
                llm_message_content = delete_message_content
                # Clear it out so it doesn't re-appear next time
                await user_doc_ref.update({"deleteMessage": DELETE_FIELD})
            else:
                # 2) Fallback to the existing llmMessage approach
                msg_data = user_doc_dict.get("llmMessage")
                if msg_data and msg_data.get("title") and msg_data.get("body"):
                    llm_message_content = f"{msg_data['title']} {msg_data['body']}".strip()

        # Check if we have a user history to resume from or need to start a new conversation
        logger.info(f"Starting conversation for user: {uid}")
        if not user_history:
            logger.debug(f"Starting conversation for user: {uid}")
            # If it’s the Onboarding state, just return the static property intro_message
            if self.get_chat_state() == ChatState.ONBOARDING.value:
                logger.debug("Onboarding: using static intro message.")
                await response_callback(uid, self.intro_message, None, True)
            elif self.get_chat_state() == ChatState.AT_WILL.value:
                if llm_message_content:
                    logger.debug(f"At-will: using LLM notification message: {llm_message_content}")
                    intro_message = self.intro_message
                    intro_message.content = llm_message_content
                    await response_callback(uid, intro_message, None, True)
                else:
                    logger.debug("At-will: no LLM notification message found. Streaming dynamic intro message.")
                    await self.stream_intro_message(uid, response_callback)
            else:
                logger.debug("Check-in: streaming dynamic intro message.")
                await self.stream_intro_message(uid, response_callback)
            
            return

        if self.get_chat_state() == ChatState.AT_WILL.value and llm_message_content:
            last_message = user_history[-1]
            if not (last_message.role == "assistant" and last_message.content == llm_message_content):
                logger.debug(f"At-will: appending LLM message to existing history: {llm_message_content}")
                llm_message = self.intro_message
                llm_message.content = llm_message_content
                user_history.append(llm_message)

                await response_callback(uid, llm_message, None, True)
                return
        
        if user_history[-1].role in ["user", "tool"] or user_history[-1].tool_calls:
            message: Union[UserChatMessage, ToolResponseMessage, None] = None
            store = False
            if user_history[-1].role == "user":
                message = UserChatMessage(**user_history[-1].to_websocket())
                user_history.pop()
            elif user_history[-1].role == "tool": # This is an answered tool response ==> process it with chat gpt
                logger.debug("Tool response detected in user history")
                message = ToolResponseMessage(tool_responses=[user_history[-1].to_openai()])
                user_history.pop()
            elif user_history[-1].tool_calls: # This is an unanswered tool request ==> Return timeout answers
                logger.debug("Tool request detected in user history")
                responses = [get_error_tool_response(tool_call["id"]) for tool_call in user_history[-1].tool_calls]
                message = ToolResponseMessage(tool_responses=responses)
                store = True
            else:
                raise ValueError("Invalid role in user history")
            if message is not None:
                await self.process_message(
                    uid, 
                    message,
                    user_history, 
                    response_callback,
                    store=store,
                    # allow_tool_requests=False # @Valentin: Why was this set to False?
                )
                
    async def _generate_response_stream(
        self,
        user_input: str,
        response_prediction_messages: list[dict[str, str]],
        conversation_history: list[AnnotatedMessage],
        tool_module: ToolModule,
        allow_tool_requests: bool = True,        
    ) -> AsyncGenerator[Union[ResponseChunk, ToolRequest], None]:
        """
        1) Stream from OpenAI in memory (collect text chunks + tool calls, preserving chunk IDs).
        2) Perform a safety check on the combined text.
        3) If harmful, revise. Otherwise yield original chunks + tool calls.
        """
        streamed_chunks = []
        tool_calls = []

        # Step 1: Stream from OpenAI, buffer in memory
        async for chunk in self.llm_client.chat_completion_streaming(
            allow_tool_requests=allow_tool_requests,
            messages=response_prediction_messages,
            tools=tool_module.get_available_tools()
        ):
            if chunk.type == "tool":
                tool_calls.append(chunk)  # chunk is a ToolRequest
            else:
                # chunk is a ResponseChunk (with .id, .content, etc.)
                streamed_chunks.append(chunk)

        # Step 2: Combine text for safety check
        full_llm_response = "".join(c.content for c in streamed_chunks)

        # Step 3: Safety classification
        harmfulness_by_category, rationales = await self.safety_module.classify_harmfulness_independent(
            user_input=user_input,
            model_output=full_llm_response
        )
        
        logger.info(f"Harmfulness by category: {harmfulness_by_category}")

        is_harmful = any(harmfulness_by_category)

        if is_harmful:
            logger.info(f"Detected harmfulness in categories: {harmfulness_by_category}")
            # Step 4a: Harmful → revise, yield single chunk
            triggered = [str(i+1) for i, h in enumerate(harmfulness_by_category) if h]
            safety_category_str = ", ".join(triggered)
            
            # Concatenate the rationales into a single string
            rationales_str = "\n".join(rationales)            
            
            # Step 3a: Stream the revision instead of returning a single chunk
            async for revision_chunk in self.safety_module.revise_harmful_message(
                user_input=user_input,
                model_output=full_llm_response,
                history=conversation_history,
                safety_category=safety_category_str,
                rationales=rationales_str
            ):
                # Each chunk from revise_harmful_message_streaming is typically a ResponseChunk             
                yield revision_chunk

            safety_chunk = SafetyResponseChunk(
                id=str(uuid.uuid4()),
                type="stream",
                role="assistant",
                content="",
                user_input=user_input,
                original_harmful_output=full_llm_response,
                model_output_harmful=is_harmful,
                model_output_harmful_categories=harmfulness_by_category,
                model_output_harmful_rationales=rationales
            )

            yield safety_chunk
        else:
            # Step 4b: Safe → yield original chunks + tool calls
            for c in streamed_chunks:
                # c already has .id from the openai streaming
                yield c
            for call in tool_calls:
                yield call      

    @abstractmethod
    async def process_message(
        self,
        uid: str,
        message: Union[UserChatMessage, ToolResponseMessage],
        dialogue_history: list[AnnotatedMessage],
        response_callback: Callable[
            [str, AnnotatedMessage, Optional[AsyncGenerator[ResponseChunk | ToolRequest, None]], bool],
            Awaitable[None]
        ],
        store: bool = True,
        allow_tool_requests: bool = True
    ) -> None:
        """
        Abstract method to process the user message and stream the assistant response.
        """
        pass

    @property
    @abstractmethod
    def intro_message(self) -> AnnotatedMessage:
        """
        Abstract property to get the intro message.
        Must be implemented by child classes.
        """
        pass
    
    @abstractmethod
    async def stream_intro_message(
        self,
        uid: str,
        response_callback: Callable[
            [str, AnnotatedMessage, Optional[AsyncGenerator[ResponseChunk | ToolRequest, None]], bool],
            Awaitable[None]
        ],
    ) -> None:
        """
        Child classes implement how to stream the dynamic intro message.
        """
        pass    
    
    @abstractmethod
    def get_chat_state(self) -> str:
        """
        Abstract method to get the chat state.
        Must be implemented by child classes.
        """
        pass

    @abstractmethod
    def save_memory(
        self,
        uid: str,
        session_id: str,
        dialogue_history: list[AnnotatedMessage]
    ):
        """
        Abstract method to check and store memory if conditions are met.
        Must be implemented by child classes.
        """
        pass
