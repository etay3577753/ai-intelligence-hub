"""
AI Intelligence Hub — FastAPI Backend
Modular design: swap Cloud APIs ↔ Local LLMs (Ollama/LM Studio) via providers.
"""

import os
import time
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from routers import process, health, chat, notifications, wiki, base44, credit, vector

load_dotenv()

app = FastAPI(
    title="AI Intelligence Hub API",
    description="Orchestrates multiple AI models and local LLM backends.",
    version="0.1.0",
)

ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5050",
    "http://127.0.0.1:5050",
    "https://*.base44.com",
    "https://*.base44.app",
    "https://base44.com",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"https://.*\.base44\.(com|app)",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router, tags=["Health"])
app.include_router(process.router, prefix="/api", tags=["AI Processing"])
app.include_router(chat.router, prefix="/api", tags=["Chat & Projects"])
app.include_router(notifications.router, prefix="/api", tags=["Notifications"])
app.include_router(wiki.router, prefix="/api", tags=["Wiki"])
app.include_router(base44.router, prefix="/api", tags=["Base44 Integration"])
app.include_router(credit.router, prefix="/api", tags=["Credit Card Parser"])
app.include_router(vector.router, tags=["Vector Search"])


@app.get("/")
def root():
    return {"status": "online", "service": "AI Intelligence Hub API", "version": "0.1.0"}
