"""
AI Intelligence Hub — FastAPI Backend
Modular design: swap Cloud APIs ↔ Local LLMs (Ollama/LM Studio) via providers.
"""

import os
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import process, health

load_dotenv()

app = FastAPI(
    title="AI Intelligence Hub API",
    description="Orchestrates multiple AI models and local LLM backends.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(process.router, prefix="/api", tags=["AI Processing"])


@app.get("/")
def root():
    return {"status": "online", "service": "AI Intelligence Hub API", "version": "0.1.0"}
