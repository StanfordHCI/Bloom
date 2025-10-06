from backend.api.models import UserChatMessage, ToolResponseMessage
from backend.llm.models import AnnotatedMessage, ResponseChunk, ToolRequest
from backend.agents.chat_agent import ChatAgent
from typing import Callable, Awaitable, Optional, AsyncGenerator, Union
from backend.llm.llm_provider import LLMProvider
from backend.llm.prompts import PromptLoader
from backend.api.models import ChatState
from backend.managers.firebase_manager import FirebaseManager
from backend.modules.memory_module import MemoryModule
from backend.modules.safety_module import SafetyModule
from backend.modules.plan_module import PlanModule
from backend.modules.strategy_module import StrategyModule
from backend.modules.tool_module import ToolModule
from backend.llm.prompts import AT_WILL_CHAT_TASK
import uuid

import logging
logger = logging.getLogger(__name__)

firebase_manager = FirebaseManager()
safety_module = SafetyModule()

class AtWillAgent(ChatAgent):
    def __init__(self):
        super().__init__()     
        self.strategy_module = StrategyModule()  
        self.memory_module = MemoryModule()      
        self.tool_module = ToolModule(ChatState.AT_WILL.value)
        self.llm_client = LLMProvider.get_client()

    @property
    def intro_message(self) -> AnnotatedMessage:
        return AnnotatedMessage(
            type="message",
            role="assistant",
            content="Hello, it's wonderful to meet you! I'm a health coaching chatbot and am excited that you're here to start this journey with me. How are you doing today?",
            start_state="introduction",
            end_state="introduction",
            strategy="Filler"            
        )
        
    async def stream_intro_message(
        self,
        uid: str,
        response_callback: Callable[
            [str, AnnotatedMessage, Optional[AsyncGenerator[ResponseChunk | ToolRequest, None]], bool],
            Awaitable[None]
        ],
    ) -> None:
        """
        Dynamically generates and streams an intro message using prior conversation summaries.
        """
        # 1. Retrieve the user’s previous chat summaries
        previous_summaries = await self.memory_module.retrieve_memory(uid)
        summaries_text = previous_summaries if previous_summaries else ""
        
        tz_str = await firebase_manager.get_user_timezone(uid)
        
        full_plan_history = await PlanModule.get_weekly_plan_history(uid)        
        
        # 2. Build the system prompt
        system_prompt = PromptLoader.at_will_dynamic_intro_prompt(summaries_text, tz_str, full_plan_history)
        
        # 3. We'll create the list of messages to pass to the LLM
        #    Usually, we only need a single system message in this scenario.
        intro_messages = [
            {"role": "system", "content": system_prompt}
        ]
        
        # 4. Prepare an empty annotated message for the assistant
        annotated_intro = AnnotatedMessage(
            type="message",
            role="assistant",
            content=None,  # We'll fill via the streaming generator
            start_state="introduction",
            end_state="introduction"
        )

        # 5. Create a streaming generator
        response_generator = self._generate_response_stream(
            user_input="",  # There's no direct user input here
            response_prediction_messages=intro_messages,
            conversation_history=[],
            tool_module=self.tool_module,
            allow_tool_requests=True
        )
        
        # 6. Send that back via response_callback. 'store=True' so it’s saved in DB
        await response_callback(uid, annotated_intro, response_generator, True)        

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
        Given a user message and the conversation history, generates a response from the assistant.
        """
        if message.role == "tool_responses":
            for msg in message.tool_responses[:-1]:
                annotated_message = AnnotatedMessage(type="message", role="tool", content=msg["content"], tool_call_id=msg["tool_call_id"])
                dialogue_history.append(annotated_message)
                if store:
                    await response_callback(uid, annotated_message, None, store)
            msg = message.tool_responses[-1]
            processed_message = AnnotatedMessage(type="message", role="tool", content=msg["content"], tool_call_id=msg["tool_call_id"])
        else:
            processed_message = AnnotatedMessage(type=message.type, role=message.role, content=message.content, id=message.id)

        annotated_message = AnnotatedMessage(
            type="message", 
            role=processed_message.role,
            content=processed_message.content, 
            id=processed_message.id
        )

        if message.role == "tool_responses":
            annotated_message.tool_call_id = processed_message.tool_call_id

        
        is_harmful, harm_categories = await safety_module.moderate_user_message(processed_message.content)     
        annotated_message.user_input_harmful = is_harmful       
        if is_harmful:
            logger.info(f"Detected harmfulness in user message. Categories: {harm_categories}")

            annotated_message.user_input_harmful_categories = harm_categories

            response = safety_module.harmful_user_message_response()
            annotated_safety_response = AnnotatedMessage(type="message", role="assistant", content=response, id=str(uuid.uuid4()))
            await response_callback(uid, annotated_message, None, store)
            await response_callback(uid, annotated_safety_response, None, store)
            return 
                        

        strategy, strategy_description = await self.strategy_module.predict_strategy(
            dialogue_history + [processed_message], AT_WILL_CHAT_TASK
        )            
                
        # Retrieve previous summaries    
        previous_summaries = await self.memory_module.retrieve_memory(uid)
        if previous_summaries:
            previous_summaries_content = f"\n\n# Summary of Past Conversations:\n{previous_summaries}\n\n"
        else:
            previous_summaries_content = ""
            
        tz_str = await firebase_manager.get_user_timezone(uid)
        
        full_plan_history = await PlanModule.get_weekly_plan_history(uid)        
        
        # Get ambient display history
        ambient_display_history = await PlanModule.get_ambient_display_history(uid)
        
        system_prompt = PromptLoader.at_will_response_generation_system_prompt(
            tz_str, strategy_description, previous_summaries_content, full_plan_history, ambient_display_history
        )
        
        response_prediction_messages = [{"role": "system", "content": system_prompt}] + \
            AnnotatedMessage.convert_message_history_for_openai(dialogue_history) + \
            [processed_message.to_openai()]  
        
        annotated_agent_message = AnnotatedMessage(
            type="message", 
            role="assistant",
            content=None, 
            strategy=strategy,
            tool_call_id=processed_message.tool_call_id
        )
                            
        if store:
            await response_callback(uid, annotated_message, None, store)
            
        response_generator = self._generate_response_stream(
                                user_input=processed_message.content,
                                response_prediction_messages=response_prediction_messages, 
                                conversation_history=dialogue_history,
                                tool_module=self.tool_module,
                                allow_tool_requests=allow_tool_requests)
            
        await response_callback(uid, annotated_agent_message, response_generator, store)        
        
    def get_chat_state(self):
        return ChatState.AT_WILL.value
    
    async def save_memory(self, uid: str, session_id: str, dialogue_history: list[AnnotatedMessage]) -> None:
        """
        Schedule summary task for the dialogue history.
        """
        if dialogue_history:
            logger.debug(f"Scheduling summary for user {uid} with {len(dialogue_history)} messages in session {session_id}.")
            self.memory_module.schedule_summary(uid, session_id, dialogue_history)
        else:
            logger.warning(f"No dialogue history to summarize for user {uid}.")
