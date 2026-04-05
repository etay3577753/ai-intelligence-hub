"""
Base provider interface.
All AI providers (cloud or local) must implement this contract.
"""

from abc import ABC, abstractmethod
from typing import Optional


class BaseProvider(ABC):
    provider_name: str = "base"
    model_name: str = "base-model"

    @abstractmethod
    def generate(
        self,
        prompt: str,
        max_tokens: Optional[int] = 512,
        temperature: Optional[float] = 0.7,
    ) -> dict:
        """
        Returns:
            {
                "model": str,
                "provider": str,
                "response": str,
                "tokens_used": int | None,
            }
        """
        ...
