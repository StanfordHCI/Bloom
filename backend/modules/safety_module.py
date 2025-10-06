from pydantic import BaseModel, Field
from backend.llm.clients.openai_client import OpenAIClient
from backend.llm.models import AnnotatedMessage, ResponseChunk, ToolRequest
from backend.llm.llm_provider import LLMProvider
import logging
from typing import AsyncGenerator

from backend.llm.prompts import PromptLoader
import asyncio
logger = logging.getLogger(__name__)

llm_client = LLMProvider.get_client()
openai_client = OpenAIClient()

# Used for classifying harmfulness using independent prompts per category
class CategoryHarmfulnessResponse(BaseModel):
    rationale: str = Field(..., description="The rationale for the harmfulness of the message in the provided category.")
    harmful: bool = Field(..., description="Whether the output is harmful")

# Used for classifying harmfulness using a joint prompt across all categories
class TaxonomyHarmfulnessResponse(BaseModel):
    rationale: str = Field(..., description="The rationale for the harmfulness of the message in each category.")
    bodily_harm: bool = Field(..., description="Whether the output is harmful in the bodily harm category")
    body_image: bool = Field(..., description="Whether the output is harmful in the body image category")
    mental_health: bool = Field(..., description="Whether the output is harmful in the mental health category") 
    negative_mindset: bool = Field(..., description="Whether the output is harmful in the negative mindset category")
    out_of_scope: bool = Field(..., description="Whether the output is harmful in the out of scope category")
    
class RevisionResponse(BaseModel):
    revised_message: str = Field(..., description="The revised, safe version of the message")

class SafetyModule:
    async def moderate_user_message(self, user_message: str) -> tuple[bool, list[str]]:
        """Moderates a user message for harmful content.

        Returns:
            bool: Whether the message is harmful
            list[str]: A list of content categories that the message is harmful in
                       See here for all categories: https://platform.openai.com/docs/guides/moderation
        """
        return await llm_client.moderate_text(user_message)
    
    async def classify_harmfulness(self, category: int, user_input: str, model_output: str) -> tuple[bool, str]:
        """Classifies the harmfulness of a model output in a given category.

        Args:
            category (int): The category to classify the message in. 
                1. Bodily harm
                2. Body image
                3. Mental health
                4. Negative mindset
                5. Out of scope
            user_input (str): The user input message.
            model_output (str): The model output message.

        Returns:
            bool: Whether the message is harmful in the given category.
            str: The rationale for the harmfulness of the message in the given category.
        """
        assert category in [1, 2, 3, 4, 5], "Category must be between 1 and 5"
        prompt = PromptLoader.safety_classification_prompt(category, user_input, model_output)
        try:
            response: CategoryHarmfulnessResponse = await openai_client.chat_completion_structured(
                messages=[{"role": "system", "content": prompt}],
                response_format=CategoryHarmfulnessResponse,
                temperature=0.0
            )
            
            return response.harmful, response.rationale
        except Exception as e:
            logger.error(f"Failed to parse response: {str(e)}")
            raise

    async def classify_harmfulness_independent(self, user_input: str, model_output: str) -> tuple[list[bool], list[str]]:
        """Classifies the harmfulness of a model output in all categories using independent classifier prompts.
        
        Args:
            user_input (str): The user input message.
            model_output (str): The model output message.
        
        Returns:
            list[bool]: A list of whether the message is harmful in each category.
            list[str]: A list of rationales for the harmfulness of the message in each category.
        """
        categories = [1, 2, 3, 4, 5]
        tasks = [self.classify_harmfulness(category, user_input, model_output) for category in categories]
        results = await asyncio.gather(*tasks)

        harmfulness_by_category = [result[0] for result in results]
        rationale_by_category = [result[1] for result in results]

        return harmfulness_by_category, rationale_by_category
    
    async def classify_harmfulness_joint(self, user_input: str, model_output: str) -> tuple[list[bool], str]:
        """Classifies the harmfulness of a model output across all categories using a joint classifier prompt.

        Args:
            user_input (str): The user input message.
            model_output (str): The model output message.
        
        Returns:
            list[bool]: A list of whether the message is harmful in each category.
            str: The rationale for the harmfulness of the message in each category.
        """

        prompt = PromptLoader.safety_classification_prompt(-1, user_input, model_output)
        try:
            response: TaxonomyHarmfulnessResponse = await openai_client.chat_completion_structured(
                messages=[{"role": "system", "content": prompt}],
                response_format=TaxonomyHarmfulnessResponse,
                temperature=0.0
            )

            # Any category being true means the message is harmful
            harmfulness_by_category = [
                response.bodily_harm,
                response.body_image,
                response.mental_health,
                response.negative_mindset,
                response.out_of_scope
            ]
            
            return harmfulness_by_category, response.rationale
        except Exception as e:
            logger.error(f"Failed to parse response: {str(e)}")
            raise

    async def revise_harmful_message(self, user_input: str, model_output: str, history: list[AnnotatedMessage], safety_category: str, rationales: str) -> AsyncGenerator[ResponseChunk | ToolRequest, None]:
        """Revises a harmful message to make it safe."""
        prompt = PromptLoader.revision_prompt(user_input, model_output, history, safety_category, rationales)
        try:
            # Step 1: Stream from OpenAI, buffer in memory
            async for chunk in llm_client.chat_completion_streaming(
                allow_tool_requests=False,                            
                messages=[{"role": "system", "content": prompt}],                
                temperature=0.0
            ):        
                yield chunk
        except Exception as e:
            logger.error(f"Failed to revise message: {str(e)}")
            raise
        
    def harmful_user_message_response(self):
        revised_message = "I’m sorry, but your message has been flagged by our safety filters. I’m here to focus on physical activity and am unable to respond to topics outside of that scope. If you believe this was flagged in error, please let our research staff know (for example, by long-pressing this message)."
        return revised_message
