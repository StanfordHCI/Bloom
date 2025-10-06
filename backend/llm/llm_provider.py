from backend import config
from backend.llm.clients.llm_client import LLMClient
from backend.llm.clients.openai_client import OpenAIClient

class LLMProvider:
    @staticmethod
    def get_client() -> LLMClient:
        provider = config.LLM_PROVIDER.lower()
        if provider == "openai":
            return OpenAIClient()
        else:
            raise ValueError(f"Unsupported LLM provider: {config.LLM_PROVIDER}")