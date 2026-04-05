"""
Anthropic Claude provider.
If ANTHROPIC_API_KEY is set, calls the real API.
Otherwise returns a mock response.
"""

import os
from typing import Optional
from .base import BaseProvider


class ClaudeProvider(BaseProvider):
    provider_name = "Anthropic"
    model_name = "claude-sonnet-4-6"

    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY", "")

    def generate(self, prompt: str, max_tokens: Optional[int] = 512, temperature: Optional[float] = 0.7) -> dict:
        if self.api_key:
            return self._call_api(prompt, max_tokens, temperature)
        return self._mock(prompt)

    def _mock(self, prompt: str) -> dict:
        return {
            "model": self.model_name,
            "provider": self.provider_name,
            "response": (
                f"[MOCK — Claude Sonnet 4.6] Your prompt was: \"{prompt[:80]}...\"\n\n"
                "This is a simulated response. Set ANTHROPIC_API_KEY in .env to use the real API. "
                "Claude excels at nuanced reasoning, code generation, and long-form analysis."
            ),
            "tokens_used": None,
        }

    def _call_api(self, prompt: str, max_tokens: int, temperature: float) -> dict:
        import requests
        headers = {
            "x-api-key": self.api_key,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }
        payload = {
            "model": self.model_name,
            "max_tokens": max_tokens,
            "temperature": temperature,
            "messages": [{"role": "user", "content": prompt}],
        }
        resp = requests.post("https://api.anthropic.com/v1/messages", headers=headers, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        return {
            "model": self.model_name,
            "provider": self.provider_name,
            "response": data["content"][0]["text"],
            "tokens_used": data["usage"]["input_tokens"] + data["usage"]["output_tokens"],
        }
