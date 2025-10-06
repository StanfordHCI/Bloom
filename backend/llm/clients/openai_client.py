from typing import AsyncGenerator, Union
import openai
from openai.types.chat.chat_completion import ChatCompletion
from openai.types.chat.parsed_chat_completion import ParsedChatCompletion
from backend.llm.clients.llm_client import LLMClient, GenericBaseModel
from backend.llm.models import ResponseChunk, ToolRequest 
from backend import config
import uuid

import logging
logger = logging.getLogger(__name__)

class OpenAIClient(LLMClient):
    model: str
    client: openai.AsyncClient

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            logger.info("Initializing OpenAI Client ...")
            cls._instance = super(OpenAIClient, cls).__new__(cls)
            cls._instance.model = config.OPENAI_MODEL
            cls._instance.client = openai.AsyncClient(
                api_key=config.OPENAI_API_KEY,
                max_retries=10,
            )
        return cls._instance

    async def chat_completion(self, **kwargs) -> str:
        response: ChatCompletion = await self.client.chat.completions.create(model=self.model, **kwargs)
        return response.choices[0].message.content or ""
    
    async def chat_completion_structured(self, retries=3, **kwargs) -> GenericBaseModel:
        try:
            response: ParsedChatCompletion = await self.client.beta.chat.completions.parse(model=self.model, **kwargs)
            if response.choices[0].message.parsed:
                parsed_response: GenericBaseModel = response.choices[0].message.parsed
                return parsed_response
            else:
                raise Exception("Failed to parse structured response.")
        except Exception as e:
            logger.error(f"Failed to parse structured response: {str(e)}")
            logger.debug("Retrying ...")
            if retries > 0:
                return await self.chat_completion_structured(retries=retries-1, **kwargs)
            else:
                raise

    async def chat_completion_streaming(self, allow_tool_requests, **kwargs) -> AsyncGenerator[Union[ResponseChunk, ToolRequest], None]:
        logger.info("Streaming inside OpenAI Client completion ...")
        if not allow_tool_requests and "tools" in kwargs:
            del kwargs["tools"]

        stream = await self.client.chat.completions.create(
            model=self.model,
            stream=True,
            **kwargs
        )

        async with stream as stream:
            current_tool_call = None
            tool_calls = []

            async for chunk in stream:
                delta = chunk.choices[0].delta

                # Check if this chunk has tool calls
                if hasattr(delta, 'tool_calls') and delta.tool_calls:
                    tool_call = delta.tool_calls[0]
                    function = tool_call.function

                    tool_call_id = None
                    if tool_call and tool_call.id:
                        tool_call_id = tool_call.id
                    elif current_tool_call and current_tool_call["id"]:
                        tool_call_id = current_tool_call["id"]

                    # Initialize or update the current tool call
                    if current_tool_call is None or (tool_call_id and tool_call_id != current_tool_call["id"]): # New tool call
                        # Append the completed tool call to the list
                        if current_tool_call:
                            tool_calls.append({
                                "id": current_tool_call["id"],
                                "type": "function",
                                "function": {
                                    "name": current_tool_call["name"],
                                    "arguments": current_tool_call["arguments"]
                                }
                            })
                        # Initialize a new tool call object
                        current_tool_call = {
                            "id": tool_call_id,
                            "name": function.name if function and function.name else "",
                            "arguments": function.arguments if function and function.arguments else ""
                        }
                    else: # No new tool call
                        # Append to existing arguments for the current tool call
                        if function.arguments:
                            current_tool_call["arguments"] += function.arguments

                # Yield content chunk if present
                if delta.content:
                    text_chunk = delta.content
                    logger.info(f"Yielding text chunk: {text_chunk}")
                    yield ResponseChunk(content=text_chunk, type="stream", role="assistant", id=chunk.id)

            # Append any remaining tool call after the loop completes
            if current_tool_call:
                tool_calls.append({
                    "id": current_tool_call["id"],
                    "type": "function",
                    "function": {
                        "name": current_tool_call["name"],
                        "arguments": current_tool_call["arguments"]
                    }
                })

            # Yield the aggregated ToolRequest at the end
            if tool_calls:
                yield ToolRequest(
                    type="tool",
                    role="assistant",
                    tool_calls=tool_calls,
                    id=str(uuid.uuid4())
                )

    async def moderate_text(self, text: str) -> tuple[bool, list[str]]:
        response = await self.client.moderations.create(
            model="omni-moderation-latest",
            input=text
        )

        is_flagged = False
        flagged_categories = []
        for result in response.results:
            for category, flag in dict(result.categories).items():
                if category == "violence":
                    if result.category_scores.violence < 0.8: # If we want to ignore violence category below a threshold
                        continue
                if flag:
                    is_flagged = True
                    flagged_categories.append(category)

        return is_flagged, flagged_categories


    def update_model(self, new_model):
        self.model = new_model
