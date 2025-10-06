import asyncio
from backend.api.models import UserChatMessage, ToolResponseMessage, ChatState
from backend.llm.models import AnnotatedMessage, ResponseChunk, ToolRequest
from backend.task_queue import TaskQueue
from backend.agents.chat_agent import ChatAgent
from backend.modules.tool_module import ToolModule
from backend.modules.dialogue_state_module import DialogueStateModule
from backend.modules.strategy_module import StrategyModule
from backend.modules.memory_module import MemoryModule
from backend.modules.safety_module import SafetyModule
from backend.llm.prompts import PromptLoader
from backend.managers.firebase_manager import FirebaseManager
from datetime import datetime, timedelta
from backend.config import CHECK_IN_DELAY
from apscheduler.triggers.date import DateTrigger # type: ignore
import uuid

from typing import Callable, Awaitable, Optional, AsyncGenerator, Union
import logging
logger = logging.getLogger(__name__)

firebase_manager = FirebaseManager()
task_queue = TaskQueue() 
safety_module = SafetyModule()

class OnboardingAgent(ChatAgent):
    def __init__(self):
        super().__init__()
        self.dialogue_module = DialogueStateModule("backend/llm/prompts/dialogue_module/onboarding")        
        self.strategy_module = StrategyModule()  
        self.memory_module = MemoryModule()      
        self.tool_module = ToolModule(ChatState.ONBOARDING.value)        

    @property
    def intro_message(self) -> AnnotatedMessage:
        return AnnotatedMessage(
            type="message",
            role="assistant",
            content="Hello, it's wonderful to meet you! I'm Beebo, a health coaching chatbot and I'm excited that you're here to start this journey with me. How are you doing today?",
            start_state="introduction",
            end_state="introduction",
            strategy="Filler"
        )

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

        if last_state == 'goal_setting' and next_state == 'advice':
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
        system_prompt = PromptLoader.onboarding_response_generation_system_prompt(
            tz_str, dialogue_task_prompt, strategy_description
        )
        
        # logger.info(f"System prompt: {system_prompt}")
                    
        agent_prompt = PromptLoader.onboarding_response_generation_agent_prompt(
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
                                allow_tool_requests=allow_tool_requests,)

        await response_callback(uid, annotated_agent_message, response_generator, store)        
    
    @staticmethod
    async def update_check_in_chat(uid: str) -> None:
        """
        Actually updates the user's chat state to 'check_in'.
        """
        logger.info(f"Updating chat state for user {uid} to 'check_in'.")
        try:
            await firebase_manager.update_user_chat_state(uid, "check-in")
        except Exception as e:
            logger.error(f"Failed to update chat state to 'check_in' for user {uid}: {e}")

    def schedule_check_in_chat(self, uid: str) -> None:
        """
        Schedule a background job that updates the user's chat_state to 'check_in'
        after CHECK_IN_DELAY minutes.
        """
        logger.debug(f"Scheduling 'check_in' chat update for user {uid}.")

        # 1. Remove any existing job for this user & session
        timestamp = datetime.now().isoformat()[:23] + "Z"
        job_id = f"check_in_{uid}_{timestamp}"
        
        # 2. Determine the run_time
        run_time = datetime.now() + timedelta(minutes=CHECK_IN_DELAY)

        # 3. Add a new job
        logger.debug(f"Scheduling new check-in chat update at {run_time.isoformat()} with job_id={job_id}.")
        task_queue.add_task(
            func=OnboardingAgent.update_check_in_chat,
            trigger=DateTrigger(run_date=run_time),
            args=[uid],
            job_id=job_id
        )
        logger.info(f"Scheduled check-in chat update for user {uid} at {run_time}")
        
    def get_chat_state(self):
        return ChatState.ONBOARDING.value

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

    async def stream_intro_message(self, uid, response_callback):
        raise NotImplementedError("stream_intro_message is not implemented for OnboardingAgent")
