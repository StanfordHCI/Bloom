from dataclasses import dataclass, field, asdict
from typing import Optional, Any, Literal
from backend.utils.date_utils import get_current_iso_datetime_str
import uuid
import json

@dataclass
class AnnotatedMessage:
    """
    A dataclass representing an annotated message, which contains information
    about the conversation, the system states, strategies, and tool calls.
    
    Fields:
    - id: A unique identifier for the message.
    - type: The type of message.
    - role: The role of the message sender.
    - content: The content of the message.
    - timestamp: The time the message was created.
    - start_state: The system state before the message.
    - end_state: The system state after the message.
    - strategy: The strategy used to generate the response, if applicable.
    - tool_calls: A list of tool calls, if any were used.
    - hidden: A flag markeing hidden messages, enabling chat rewind.
    """
    type: Literal["message", "stream", "visualization", "tool", "acknowledgement", "closing", "progress", "plan-widget"]
    role: Literal["system", "user", "assistant", "tool"]
    content: Any
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: get_current_iso_datetime_str())
    start_state: Optional[str] = None
    end_state: Optional[str] = None
    strategy: Optional[str] = None
    tool_calls: Optional[list[dict[str, Any]]] = None
    hidden: bool = False
    tool_call_id: Optional[str] = None
    should_respond_tool_call: bool = True
    user_input_harmful: Optional[bool] = None
    user_input_harmful_categories: Optional[list[str]] = None
    model_output_harmful: Optional[bool] = None
    model_output_harmful_categories: Optional[list[str]] = None
    model_output_harmful_rationales: Optional[list[str]] = None
    original_harmful_output: Optional[str] = None

    def to_dict(self) -> dict[str, Any]:
        result = asdict(self)
        result.pop('should_respond_tool_call', None)
        return result

    @staticmethod
    def from_dict(data: dict[str, Any]) -> "AnnotatedMessage":
        return AnnotatedMessage(**data)

    def to_openai(self) -> dict[str, Any]:
        message: dict[str, Any] = {
            "role": self.role,
            "content": self.content,
        }
        # Optionally add tool calls if they exist
        if self.tool_calls:
            message["tool_calls"] = self.tool_calls
        if self.tool_call_id:
            message["tool_call_id"] = self.tool_call_id
        return message
    
    def to_websocket(self) -> dict[str, Any]:
        return {
            "type": self.type,
            "role": self.role,
            "content": self.content if isinstance(self.content, str) else str(self.content),
            "id": self.id,
            "tool_calls": self.tool_calls if self.tool_calls else str([]),
            "should_respond_tool_call": self.should_respond_tool_call,
        }

    def to_start_conversation(self) -> dict[str, Any]:
        msg = self.to_websocket()

        try:
            content_data = json.loads(msg['content'])
            if self.role == 'tool' and isinstance(content_data, dict) and set(content_data.keys()) == {'message', 'revision_message', 'plan'}:
                msg["type"] = 'plan-widget'
                msg["role"] = 'assistant'
        except (json.JSONDecodeError, TypeError):
            pass

        msg['should_respond_tool_call'] = False
        return msg
    
    @staticmethod
    def get_annotated_message_history(messages: list[dict[str, Any]]) -> list["AnnotatedMessage"]:
        """
        Constructs a list of AnnotatedResponse objects from a list of message dictionaries fetches from Firebase.
        """
        return [AnnotatedMessage(**msg) for msg in messages]

    @staticmethod
    def convert_message_history_for_openai(annotated_history: list["AnnotatedMessage"]) -> list[dict[str, Any]]:
        """
        Converts annotated message history into the format required by the OpenAI Chat Completions API.
        """
        gpt_history = []
        for message in annotated_history:
            if message.hidden or message.type == 'visualization':
                continue

            gpt_history.append(message.to_openai())
        return gpt_history
    
    def __repr__(self) -> str:
        return "AnnotatedMessage(type={}, role={}, content={}, id={}, tool_calls={})".format(self.type, self.role, self.content, self.id, self.tool_calls)

@dataclass
class ResponseChunk:
    """
    A dataclass representing a response chunk from the OpenAI streaming API.
    Fields:
    - type: The type of response chunk (e.g., 'stream', 'tool').
    - role: The role of the message sender (e.g., 'system', 'user', 'assistant', 'tool').
    - content: The content of the response chunk.
    - id: A unique identifier for each message. Subsequent chunks from the same message will have the same id.
    """
    type: Literal["stream", "tool"]
    role: Literal["system", "user", "assistant", "tool"]
    content: Any
    id: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
    
    def to_websocket(self) -> dict[str, Any]:
        return {
            "type": self.type,
            "role": self.role,
            "content": self.content,
            "id": self.id
        }
    
    def __repr__(self) -> str:
        return "ResponseChunk(type={}, role={}, content={}, id={})".format(self.type, self.role, self.content, self.id)

@dataclass
class ToolRequest:
    """
    A dataclass representing a response chunk from the OpenAI streaming API.
    Fields:
    - type: The type of response chunk ('tool', 'visualization').
    - role: The role of the message sender, must be 'assistant'.
    - content: The content of the response chunk.
    - id: A unique identifier for each message. Subsequent chunks from the same message will have the same id.
    """
    type: Literal["tool"]
    role: Literal["assistant"]
    tool_calls: list[dict[str, Any]]
    id: str
    content: Any = ''

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
    
    def to_websocket(self) -> dict[str, Any]:
        return {
            "type": self.type,
            "role": self.role,
            "tool_calls": self.tool_calls,
            "id": self.id,
            "content": self.content,
        }
    
    def __repr__(self) -> str:
        return "ToolRequest(type={}, role={}, content='' tool_calls={}, id={})".format(self.type, self.role, self.tool_calls, self.id)

@dataclass
class SafetyResponseChunk(ResponseChunk):
    model_output_harmful: Optional[bool] = None
    model_output_harmful_categories: Optional[list[str]] = None
    model_output_harmful_rationales: Optional[list[str]] = None
    original_harmful_output: Optional[str] = None
    user_input: Optional[str] = None