# AI Intelligence Hub

Side-by-side AI model comparison dashboard with a FastAPI backend and Next.js frontend.
Runs entirely on a GTX 1070 Ti (8 GB VRAM) — supports cloud APIs and local LLMs.

---

## Quick Start

### 1. Clone & configure environment

```bash
cp .env.example .env
# Fill in API keys (optional — mock responses work without keys)
```

### 2. Backend (FastAPI)

```bash
cd backend
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

API docs available at: http://localhost:8000/docs

### 3. Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

Open: http://localhost:3000

---

## Architecture

```
/
├── backend/
│   ├── main.py                  # FastAPI app entry point
│   ├── routers/
│   │   ├── health.py            # GET /health
│   │   └── process.py           # POST /api/process
│   ├── providers/
│   │   ├── base.py              # BaseProvider interface
│   │   ├── gemini.py            # Google Gemini
│   │   ├── openai_provider.py   # OpenAI GPT
│   │   ├── claude_provider.py   # Anthropic Claude
│   │   └── ollama_provider.py   # Local models via Ollama
│   └── requirements.txt
│
└── frontend/
    └── src/
        ├── app/                 # Next.js App Router
        ├── components/
        │   ├── DashboardLayout.tsx
        │   ├── Sidebar.tsx
        │   ├── ComparisonView.tsx   # Side-by-side model outputs
        │   ├── HardwareGuard.tsx    # VRAM usage monitor
        │   └── ui/                  # Shadcn/UI primitives
        └── lib/utils.ts
```

---

## Switching to Local LLMs (Ollama / LM Studio)

**Ollama** — recommended for GTX 1070 Ti:

```bash
# Pull a VRAM-friendly model (~4 GB)
ollama pull mistral:7b-instruct-q4_K_M

# Then in .env:
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral:7b-instruct-q4_K_M
```

In `backend/routers/process.py`, replace a cloud provider with `OllamaProvider()`:

```python
from providers.ollama_provider import OllamaProvider
providers = [OllamaProvider(), OpenAIProvider(), ClaudeProvider()]
```

**LM Studio** exposes an OpenAI-compatible endpoint — point `OPENAI_API_KEY=lm-studio`
and set the base URL in `openai_provider.py`.

---

## API Reference

### `POST /api/process`

```json
{
  "prompt": "Explain transformers in one sentence.",
  "max_tokens": 512,
  "temperature": 0.7
}
```

**Response:**

```json
{
  "prompt": "...",
  "results": [
    {
      "model": "gemini-1.5-flash",
      "provider": "Google",
      "response": "...",
      "latency_ms": 823.4,
      "tokens_used": null
    }
  ],
  "total_latency_ms": 2541.0
}
```
