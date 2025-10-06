from abc import ABC, abstractmethod
from typing import AsyncGenerator, TypeVar, Union

from pydantic import BaseModel

from backend.llm.models import ResponseChunk, ToolRequest

import logging
logger = logging.getLogger(__name__)

GenericBaseModel = TypeVar('GenericBaseModel', bound=BaseModel)

class LLMClient(ABC):
    """
    Abstract base class for LLM Clients.
    """
    @abstractmethod
    async def chat_completion(self, **kwargs) -> str:
        """
        Abstract method for chat completion.
        """
        pass

    @abstractmethod
    async def chat_completion_structured(self, **kwargs) -> GenericBaseModel:
        """
        Abstract method for structured chat completion.
        """
        pass

    @abstractmethod
    def chat_completion_streaming(
        self,
        allow_tool_requests: bool,
        **kwargs
    ) -> AsyncGenerator[Union[ResponseChunk, ToolRequest], None]:
        """
        Abstract method for streaming chat completion.
        """
        pass

    @abstractmethod
    async def moderate_text(self, text: str) -> tuple[bool, list[str]]:
        """
        Abstract method to moderate text.
        Returns a tuple containing: a boolean indicating if the text is safe and a list of reasons if it is not.
        """
        pass
    
    @abstractmethod
    def update_model(self, new_model: str):
        """
        Abstract method to update the model used by the client.
        """
        pass
