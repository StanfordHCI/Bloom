from typing import Literal
from pydantic import BaseModel, Field
from backend.llm.models import AnnotatedMessage
from backend.llm.prompts import PromptLoader
from backend.llm.llm_provider import LLMProvider

import logging
logger = logging.getLogger(__name__)

llm_client = LLMProvider.get_client()

MI_STRATEGIES = [
    "Advise with Permission", 
    "Affirm", 
    "Emphasize Control",
    "Facilitate", 
    "Filler", 
    "Giving Information", 
    "Question",
    "Reflect", 
    "Reframe", 
    "Support", 
    "Structure"
]

class StrategyPrediction(BaseModel):
    """
    Defines the structure for predicting the most appropriate motivational interviewing strategy
    for a health coach agent based on dialogue history and the agent's current task.
    """
    strategy: Literal[
        "Advise with Permission", 
        "Affirm", 
        "Emphasize Control",
        "Facilitate", 
        "Filler", 
        "Giving Information", 
        "Question",
        "Reflect", 
        "Reframe", 
        "Support", 
        "Structure"
    ] = Field(
        ..., 
        description="The name of the chosen motivational interviewing strategy."
    )

class StrategyModule:
    def __init__(self):
        self.STRATEGIES = MI_STRATEGIES
        self.STRATEGY_PROMPTS = {}

        for strategy in self.STRATEGIES:
            file_name = f"backend/llm/prompts/strategy_module/strategy_prompts/{''.join('_' if c == ' ' else c for c in strategy.lower())}.txt"
            with open(file_name, "r") as file:
                self.STRATEGY_PROMPTS[strategy] = file.read()

    async def predict_strategy(self, dialogue_history: list[AnnotatedMessage], task_prompt: str) -> tuple[str, str]:
        classification_prompt = PromptLoader.strategy_classification_prompt(dialogue_history, task_prompt)   
           
        output: StrategyPrediction = await llm_client.chat_completion_structured(
            messages=[{"role": "system", "content": classification_prompt}],
            response_format=StrategyPrediction
        )
        
        logger.info(f"Strategy classification: {output.strategy}")
        
        return output.strategy, self.STRATEGY_PROMPTS[output.strategy] 
