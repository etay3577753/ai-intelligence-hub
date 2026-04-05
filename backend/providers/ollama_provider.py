"""
Ollama local provider — drop-in replacement for any cloud provider.
Point OLLAMA_BASE_URL to your Ollama instance and set OLLAMA_MODEL
to the model tag you have pulled (e.g. "llama3", "mistral", "phi3").

GTX 1070 Ti (8 GB VRAM) sweet spots:
  - mistral:7b-instruct-q4_K_M  (~4.1 GB)
  - phi3:mini                   (~2.3 GB)
  - llama3:8b-instruct-q4_K_M   (~4.7 GB)
"""

import os
import requests
from typing import Optional
from .base import BaseProvider


class OllamaProvider(BaseProvider):
    provider_name = "Ollama (local)"

    def __init__(self, model: str | None = None):
        self.base_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        self.model_name = model or os.getenv("OLLAMA_MODEL", "mistral")

    def generate(self, prompt: str, max_tokens: Optional[int] = 512, temperature: Optional[float] = 0.7) -> dict:
        payload = {
            "model": self.model_name,
            "prompt": prompt,
            "options": {"num_predict": max_tokens, "temperature": temperature},
            "stream": False,
        }
        resp = requests.post(f"{self.base_url}/api/generate", json=payload, timeout=120)
        resp.raise_for_status()
        data = resp.json()
        return {
            "model": self.model_name,
            "provider": self.provider_name,
            "response": data["response"],
            "tokens_used": data.get("eval_count"),
        }
