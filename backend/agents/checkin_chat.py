import asyncio
from backend.api.models import UserChatMessage, ToolResponseMessage, ChatState
from backend.llm.models import AnnotatedMessage, ResponseChunk, ToolRequest
from backend.task_queue import TaskQueue
from backend.agents.chat_agent import ChatAgent
from backend.modules.tool_module import ToolModule
from backend.modules.dialogue_state_module import DialogueStateModule
from backend.modules.strategy_module import StrategyModule
from backend.modules.memory_module import MemoryModule
from backend.llm.llm_provider import LLMProvider
from backend.modules.safety_module import SafetyModule
from backend.llm.prompts import PromptLoader
from backend.modules.plan_module import PlanModule
from backend.managers.firebase_manager import FirebaseManager

from typing import Callable, Awaitable, Optional, AsyncGenerator, Union
import logging
import uuid 
logger = logging.getLogger(__name__)

firebase_manager = FirebaseManager()
task_queue = TaskQueue()
safety_module = SafetyModule() 

class CheckInAgent(ChatAgent):    
    def __init__(self):     
        super().__init__()
        self.dialogue_module = DialogueStateModule("backend/llm/prompts/dialogue_module/check_in")        
        self.strategy_module = StrategyModule()  
        self.memory_module = MemoryModule()      
        self.tool_module = ToolModule(ChatState.CHECK_IN.value)
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
        plan_history = await PlanModule.get_weekly_plan_history(uid)

        # 2. Build the system prompt
        system_prompt = PromptLoader.check_in_dynamic_intro_prompt(summaries_text, plan_history)
        
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
        Process assistant messages by streaming response chunks using a provided stream_response function.
        """

        # Get dialogue state and create annotated user message
        if message.role == "tool_responses":
            for msg in message.tool_responses[:-1]:
                annotated_message = AnnotatedMessage(type="message", role="tool", content=msg["content"], tool_call_id=msg["tool_call_id"])
                dialogue_history.append(annotated_message)
                await response_callback(uid, annotated_message, None, store)
            msg = message.tool_responses[-1]
            processed_message = AnnotatedMessage(type="message", role="tool", content=msg["content"], tool_call_id=msg["tool_call_id"])
        else:
            processed_message = AnnotatedMessage(type=message.type, role=message.role, content=message.content, id=message.id)

        last_state, next_state, dialogue_task_prompt = await self.dialogue_module.get_next_state(
            dialogue_history + [processed_message]
        )

        if last_state == 'goal_setting' and next_state == 'counseling':
            # check if there is a generate_plan tool call in the history
            found_generate_plan_tool_call = False
            for msg_ in dialogue_history: # using msg_ to avoid typing conflicts with msg (mypy)
                if msg_.tool_calls:
                    for tool_call in msg_.tool_calls:
                        if tool_call['function']['name'] == 'generate_plan':
                            found_generate_plan_tool_call = True
                            break
            
            # prevent transition to advice state if no generate_plan tool call is found
            if not found_generate_plan_tool_call:
                logger.error("No generate-plan tool call found in the history. Preventing transition to advice state.")
                next_state = 'goal_setting'
                last_state = 'goal_setting'
                dialogue_task_prompt = self.dialogue_module.get_state('goal_setting').prompt
            else:
                logger.info("Found generate-plan tool call in the history. Allowing transition to advice state.")
        
        annotated_message = AnnotatedMessage(
            type="message", 
            role=processed_message.role,
            content=processed_message.content, 
            start_state=last_state, 
            end_state=next_state,
            id=processed_message.id
        )

        await response_callback(
            uid,
            AnnotatedMessage(type="progress", role='system', content=annotated_message.end_state),
            None, False
        )

        if message.role == "tool_responses":
            annotated_message.tool_call_id = processed_message.tool_call_id
        
        is_harmful, harm_categories = await safety_module.moderate_user_message(processed_message.content)        
        annotated_message.user_input_harmful = is_harmful    
        if is_harmful:
            logger.info(f"Detected harmfulness in user message. Categories: {harm_categories}")

            annotated_message.user_input_harmful_categories = harm_categories

            response = safety_module.harmful_user_message_response()
            annotated_safety_response = AnnotatedMessage(type="message", role="assistant", content=response, start_state=last_state, end_state=next_state, id=str(uuid.uuid4()))
            await response_callback(uid, annotated_message, None, store)
            await response_callback(uid, annotated_safety_response, None, store)
            return         

        strategy, strategy_description = await self.strategy_module.predict_strategy(
            dialogue_history + [processed_message],
            dialogue_task_prompt
        )

        tz_str = await firebase_manager.get_user_timezone(uid)
        
        full_plan_history = await PlanModule.get_weekly_plan_history(uid)
        ambient_display_history = await PlanModule.get_ambient_display_history(uid)

        system_prompt = PromptLoader.check_in_response_generation_system_prompt(
            tz_str, dialogue_task_prompt, strategy_description, full_plan_history, ambient_display_history
        )
                
        agent_prompt = PromptLoader.check_in_response_generation_agent_prompt(
            dialogue_task_prompt, strategy_description
        )                
        
        response_prediction_messages = [{"role": "system", "content": system_prompt}] + \
            AnnotatedMessage.convert_message_history_for_openai(dialogue_history) + \
            [processed_message.to_openai()] + [{"role": "assistant", "content": agent_prompt}]
            
        annotated_agent_message = AnnotatedMessage(
            type="message", 
            role="assistant",
            content=None, 
            start_state=next_state, 
            end_state=next_state,
            strategy=strategy,
            tool_call_id=processed_message.tool_call_id
        )

        await response_callback(uid, annotated_message, None, store)

        response_generator = self._generate_response_stream(
                                user_input=processed_message.content,
                                response_prediction_messages=response_prediction_messages, 
                                conversation_history=dialogue_history,
                                tool_module=self.tool_module,
                                allow_tool_requests=allow_tool_requests)
        
        await response_callback(uid, annotated_agent_message, response_generator, store)        
            
    def get_chat_state(self):
        return ChatState.CHECK_IN.value

    async def save_memory(self, uid: str, session_id: str, dialogue_history: list[AnnotatedMessage]):
        """
        Checks if the conversation reached a goodbye state. If so, generates and stores a summary for the session.
        """
        last_message = dialogue_history[-1]
        
        if last_message.end_state == "goodbye":
            logger.info(f"Goodbye state reached for session ID: {session_id}. Saving memory.")
            asyncio.create_task(self.memory_module.save_summary(uid, session_id, dialogue_history))                       
        else:
            logger.debug(f"End state is not in goodbye state for session ID: {session_id}. Memory not saved.")
