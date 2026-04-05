"""
OpenAI provider.
If OPENAI_API_KEY is set, calls the real API.
Otherwise returns a mock response.
"""

import os
from typing import Optional
from .base import BaseProvider


class OpenAIProvider(BaseProvider):
    provider_name = "OpenAI"
    model_name = "gpt-4o-mini"

    def __init__(self):
        self.api_key = os.getenv("OPENAI_API_KEY", "")

    def generate(self, prompt: str, max_tokens: Optional[int] = 512, temperature: Optional[float] = 0.7) -> dict:
        if self.api_key:
            return self._call_api(prompt, max_tokens, temperature)
        return self._mock(prompt)

    def _mock(self, prompt: str) -> dict:
        return {
            "model": self.model_name,
            "provider": self.provider_name,
            "response": (
                f"[MOCK — GPT-4o Mini] Your prompt was: \"{prompt[:80]}...\"\n\n"
                "This is a simulated response. Set OPENAI_API_KEY in .env to use the real API. "
                "GPT-4o mini is fast, cost-efficient, and great for structured output tasks."
            ),
            "tokens_used": None,
        }

    def _call_api(self, prompt: str, max_tokens: int, temperature: float) -> dict:
        import requests
        headers = {"Authorization": f"Bearer {self.api_key}", "Content-Type": "application/json"}
        payload = {
            "model": self.model_name,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
            "temperature": temperature,
        }
        resp = requests.post("https://api.openai.com/v1/chat/completions", headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return {
            "model": self.model_name,
            "provider": self.provider_name,
            "response": data["choices"][0]["message"]["content"],
            "tokens_used": data["usage"]["total_tokens"],
        }
