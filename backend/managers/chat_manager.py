import asyncio
import threading
import uuid

from backend.agents.at_will_chat import AtWillAgent
from backend.agents.checkin_chat import CheckInAgent
from backend.agents.onboarding import OnboardingAgent

from backend.api.models import ChatState, UserChatMessage, ToolResponseMessage
from backend.llm.models import AnnotatedMessage, SafetyResponseChunk, ToolRequest, ResponseChunk

from backend.managers.connection_manager import ConnectionManager
from backend.managers.firebase_manager import FirebaseManager

from typing import Union, AsyncGenerator
import logging


logger = logging.getLogger(__name__)

connection_manager = ConnectionManager()
firebase_manager = FirebaseManager()


class ChatManager:
    _instance = None
    _singleton_lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._singleton_lock:
                if cls._instance is None:
                    cls._instance = super(ChatManager, cls).__new__(cls)
        return cls._instance

    def __init__(self):
        if not hasattr(self, "initialized"):
            self._chat_agents: dict[str, Union[OnboardingAgent, CheckInAgent, AtWillAgent]] = {}

            self._dialogue_histories: dict[str, list[AnnotatedMessage]] = {}
            self._session_ids: dict[str, str] = {}

            self.lock = asyncio.Lock()
            self.initialized = True

    def _filter_tool_plan_history(
        self,
        history: list[AnnotatedMessage]
    ) -> list[AnnotatedMessage]:
        """
        Given a conversation history, skip showing:
        All but the *last* 'tool+message' plan from that stub.
        """
        filtered = []
        tool_calls_remaining = 0

        for msg in history:
            # Detect the assistant+tool stub message that announces multiple calls
            if (
                msg.role == "assistant"
                and msg.type == "tool"
                and msg.tool_calls
                and len(msg.tool_calls) > 1
            ):
                tool_calls_remaining = len(msg.tool_calls)

            # For each subsequent 'tool+message', skip it if we still have
            # more than 1 call left. Only show the *final* one.
            if msg.role == "tool" and msg.type == "message" and tool_calls_remaining > 0:
                if tool_calls_remaining > 1:
                    # Skip this one
                    tool_calls_remaining -= 1
                    continue
                else:
                    # This is the last in that chain; show it
                    tool_calls_remaining = 0

            filtered.append(msg)

        return filtered

    async def start_conversation(self, uid: str, chat_state: ChatState) -> None:
        logger.info(f'''Starting conversation for user: {
                    uid} and chat state {chat_state.value}''')
        await connection_manager.send(uid, {"type": "acknowledgement", "role": "system", "content": "start_conversation", "id": str(uuid.uuid4())})
        session_id, user_history = await firebase_manager.load_conversation_history(uid, chat_state)
        user_history = self.sanitize_message_history(user_history)

        filtered_history = self._filter_tool_plan_history(user_history)

        for message in filtered_history:
            await connection_manager.send(uid, message.to_start_conversation())

        if not chat_state:
            logger.error('No chat state passed to web socket')
            chat_state = ChatState.ONBOARDING

        async with self.lock:
            self._dialogue_histories[uid] = user_history
            self._session_ids[uid] = session_id

            if chat_state.value == ChatState.ONBOARDING.value:
                self._chat_agents[uid] = OnboardingAgent()
            elif chat_state.value == ChatState.AT_WILL.value:
                self._chat_agents[uid] = AtWillAgent()
            elif chat_state.value == ChatState.CHECK_IN.value:
                self._chat_agents[uid] = CheckInAgent()
            else:
                logger.error(f'''Unsupported chat state: {chat_state}''')

        chat_agent = self._chat_agents[uid]
        logger.info(f'Initialized chat agent: {chat_agent}')
        await connection_manager.send(uid, {"type": "progress", "content": str(user_history[-1].end_state) if len(user_history) > 0 else '', "id": str(uuid.uuid4())})
        await connection_manager.send(uid, {"type": "acknowledgement", "role": "system", "content": "", "id": str(uuid.uuid4())})
        await chat_agent.start_conversation(uid, user_history.copy(), self._response_callback_handler, chat_agent.tool_module.get_error_tool_response)
        await connection_manager.send(uid, {"type": "closing", "role": "system", "content": "", "id": str(uuid.uuid4())})

    async def end_conversation(self, uid: str) -> None:
        logger.info(f"Ending conversation for user: {uid}")

        if uid in self._dialogue_histories and uid in self._session_ids:
            await firebase_manager.end_conversation(uid, self._dialogue_histories[uid])

        async with self.lock:
            del self._dialogue_histories[uid]
            del self._session_ids[uid]
            del self._chat_agents[uid]

    async def process_message(self, uid: str, message: Union[UserChatMessage, ToolResponseMessage]) -> None:
        if isinstance(message, UserChatMessage):
            await connection_manager.send(uid, {"type": "acknowledgement", "role": "system", "content": "", "id": str(uuid.uuid4())})

        chat_agent = self._chat_agents[uid]

        history = self._dialogue_histories[uid].copy()
        history = self.sanitize_message_history(history)

        if isinstance(message, ToolResponseMessage):
            tool_response_message = await chat_agent.tool_module.finish_tool_responses(uid, message)
            if tool_response_message.tool_responses:
                await connection_manager.send(uid, {"type": "acknowledgement", "role": "system", "content": "", "id": str(uuid.uuid4())})
                await chat_agent.process_message(uid, tool_response_message, history, self._response_callback_handler)
        else:
            await chat_agent.process_message(uid, message, history, self._response_callback_handler)

        if isinstance(message, UserChatMessage):
            await connection_manager.send(uid, {"type": "closing", "role": "system", "content": "", "id": str(uuid.uuid4())})

    def sanitize_message_history(self, history: list[AnnotatedMessage]) -> list[AnnotatedMessage]:
        """
        Returns a sanitized copy of the history such that for each tool request at most one tool response (role "tool") is retained.
        """
        # Find the last index of each tool call by tool_call_id
        last_tool_response_idx: dict[str, int] = {}
        for idx, msg in enumerate(history):
            role = msg.role
            tool_call_id = msg.tool_call_id
            if role == "tool" and tool_call_id is not None:
                last_tool_response_idx[tool_call_id] = idx

        # Create a new list with only the last tool response for each tool call
        sanitized = []
        for idx, msg in enumerate(history):
            role = msg.role
            tool_call_id = msg.tool_call_id
            if role == "tool" and tool_call_id is not None:
                if last_tool_response_idx[tool_call_id] == idx:
                    sanitized.append(msg)
                else:
                    logger.warning("Duplicate tool response found in history, skipping: " + str(msg))
            else:
                sanitized.append(msg)
        return sanitized

    async def _response_callback_handler(
        self,
        uid: str,
        annotated_message: AnnotatedMessage,
        response_generator: Union[None, AsyncGenerator[Union[ResponseChunk, ToolRequest], None]] = None,
        store: bool = True
    ) -> None:
        if response_generator is None:
            await self._handle_single_response(uid, annotated_message, store)
        else:
            await self._handle_streamed_response(uid, response_generator, annotated_message)

    async def _handle_single_response(
        self, 
        uid: str, 
        annotated_message: AnnotatedMessage,
        store: bool
    ) -> None:
        if annotated_message.role not in ["user", "tool"]:
            await connection_manager.send(uid, annotated_message.to_websocket())
        if store:
            await self._save_annotated_message(uid, annotated_message)

    async def _handle_streamed_response(
        self,
        uid: str,
        response_generator: AsyncGenerator[Union[ResponseChunk, ToolRequest], None],
        annotated_message: AnnotatedMessage
    ) -> None:
        current_message = AnnotatedMessage(type=annotated_message.type, role="assistant", content="")
        current_message.strategy = annotated_message.strategy
        current_message.start_state = annotated_message.start_state
        current_message.end_state = annotated_message.end_state

        async for chunk in response_generator:
            if type(chunk) is SafetyResponseChunk:
                current_message.model_output_harmful = chunk.model_output_harmful
                current_message.model_output_harmful_categories = chunk.model_output_harmful_categories
                current_message.model_output_harmful_rationales = chunk.model_output_harmful_rationales
                current_message.original_harmful_output = chunk.original_harmful_output

            elif type(chunk) is ResponseChunk:
                msg = chunk.to_websocket()
                msg['id'] = current_message.id
                await connection_manager.send(uid, msg)
                current_message.content += chunk.content

            elif type(chunk) is ToolRequest:
                current_message.tool_calls = chunk.tool_calls
                current_message.type = chunk.type

        await self._save_annotated_message(uid, current_message)
        # Process collected tool requests
        logger.info(f"Tool calls: {current_message.tool_calls}")
        if current_message.tool_calls:
            await self.process_tool_calls(uid, current_message)

    async def process_tool_calls(self, uid: str, current_message: AnnotatedMessage) -> None:
        chat_agent = self._chat_agents[uid]

        chat_state = chat_agent.get_chat_state()

        logger.info(f"Processing collected tool requests {current_message.tool_calls} for UID: {uid}")
        frontend_tool_requests = await chat_agent.tool_module.process_tool_calls(
            uid, 
            current_message.tool_calls, 
            self._dialogue_histories[uid].copy(),
            self.process_message,
            self._response_callback_handler,
            chat_state
        )
        logger.info(f"Frontend tool requests: {frontend_tool_requests}")

        if frontend_tool_requests:
            # there are frontend tool calls, so send them
            tool_response_message = AnnotatedMessage(
                type="tool",
                role="assistant",
                content="",
                tool_calls=frontend_tool_requests,
                id=str(uuid.uuid4())
            )
            await connection_manager.send(uid, tool_response_message.to_websocket())
        else:
            await self.process_message(uid, ToolResponseMessage(tool_responses=[]))

    async def _save_annotated_message(self, uid: str, message: AnnotatedMessage) -> None:
        """
        Saves the annotated message to Firebase and appends it to the dialogue history.
        Also calls chat_module.save_memory to potentially store a summary if conditions are met.
        """ 
        logger.info(f"Saving annotated message for user: {uid}: {message}")
        session_id = self._session_ids[uid]
        await firebase_manager.write_message_to_firebase(uid, session_id, message)
        async with self.lock:
            self._dialogue_histories[uid].append(message)
        chat_agent = self._chat_agents[uid]
        await chat_agent.save_memory(uid, session_id, self._dialogue_histories[uid])
