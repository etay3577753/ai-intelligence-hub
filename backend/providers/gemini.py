"""
Gemini provider.
If GEMINI_API_KEY is set, calls the real API.
Otherwise returns a deterministic mock response.
"""

import os
from typing import Optional
from .base import BaseProvider


class GeminiProvider(BaseProvider):
    provider_name = "Google"
    model_name = "gemini-1.5-flash"

    def __init__(self):
        self.api_key = os.getenv("GEMINI_API_KEY", "")

    def generate(self, prompt: str, max_tokens: Optional[int] = 512, temperature: Optional[float] = 0.7) -> dict:
        if self.api_key:
            return self._call_api(prompt, max_tokens, temperature)
        return self._mock(prompt)

    def _mock(self, prompt: str) -> dict:
        return {
            "model": self.model_name,
            "provider": self.provider_name,
            "response": (
                f"[MOCK — Gemini 1.5 Flash] Your prompt was: \"{prompt[:80]}...\"\n\n"
                "This is a simulated response. Set GEMINI_API_KEY in .env to use the real API. "
                "Gemini excels at multi-modal reasoning and long-context tasks."
            ),
            "tokens_used": None,
        }

    def _call_api(self, prompt: str, max_tokens: int, temperature: float) -> dict:
        import requests
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.model_name}:generateContent"
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"maxOutputTokens": max_tokens, "temperature": temperature},
        }
        resp = requests.post(url, params={"key": self.api_key}, json=payload, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        text = data["candidates"][0]["content"]["parts"][0]["text"]
        return {
            "model": self.model_name,
            "provider": self.provider_name,
            "response": text,
            "tokens_used": data.get("usageMetadata", {}).get("totalTokenCount"),
        }
