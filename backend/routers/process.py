"""
/api/process endpoint — orchestrates prompt across multiple AI providers.
Provider selection is driven by environment variables so you can swap
Cloud APIs for Ollama/LM Studio without touching this file.
"""

import time
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

from providers.gemini import GeminiProvider
from providers.openai_provider import OpenAIProvider
from providers.claude_provider import ClaudeProvider

router = APIRouter()


class ProcessRequest(BaseModel):
    prompt: str
    max_tokens: Optional[int] = 512
    temperature: Optional[float] = 0.7


class ModelResult(BaseModel):
    model: str
    provider: str
    response: str
    latency_ms: float
    tokens_used: Optional[int] = None
    error: Optional[str] = None


class ProcessResponse(BaseModel):
    prompt: str
    results: list[ModelResult]
    total_latency_ms: float


@router.post("/process", response_model=ProcessResponse)
def process_prompt(body: ProcessRequest):
    if not body.prompt.strip():
        raise HTTPException(status_code=400, detail="Prompt cannot be empty.")

    providers = [
        GeminiProvider(),
        OpenAIProvider(),
        ClaudeProvider(),
    ]

    overall_start = time.perf_counter()
    results: list[ModelResult] = []

    for provider in providers:
        start = time.perf_counter()
        try:
            result = provider.generate(body.prompt, body.max_tokens, body.temperature)
            latency = (time.perf_counter() - start) * 1000
            results.append(ModelResult(
                model=result["model"],
                provider=result["provider"],
                response=result["response"],
                latency_ms=round(latency, 2),
                tokens_used=result.get("tokens_used"),
            ))
        except Exception as exc:
            latency = (time.perf_counter() - start) * 1000
            results.append(ModelResult(
                model=provider.model_name,
                provider=provider.provider_name,
                response="",
                latency_ms=round(latency, 2),
                error=str(exc),
            ))

    total_latency = (time.perf_counter() - overall_start) * 1000
    return ProcessResponse(
        prompt=body.prompt,
        results=results,
        total_latency_ms=round(total_latency, 2),
    )
