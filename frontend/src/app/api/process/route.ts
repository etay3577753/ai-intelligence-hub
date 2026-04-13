import { NextRequest, NextResponse } from "next/server";

// Standalone handler — tries FastAPI backend first, falls back to demo mode
export async function POST(req: NextRequest) {
  const { prompt } = await req.json();

  // Try to reach FastAPI backend
  const backendUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const res = await fetch(`${backendUrl}/api/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt }),
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      return NextResponse.json(data);
    }
  } catch {
    // Backend not running — return informative demo response
  }

  // Demo mode — backend is offline
  const now = Date.now();
  const demoResults = [
    {
      model: "GPT-4o mini",
      provider: "OpenAI",
      response:
        "⚠️ Backend לא פעיל\n\nכדי לקבל תשובות אמיתיות מ-GPT, Gemini ו-Claude בו-זמנית:\n\n1. פתח PowerShell בתיקיית backend\n2. הרץ: uvicorn main:app --reload\n3. הוסף את מפתחות ה-API ב-.env",
      latency_ms: Date.now() - now + 120,
      tokens_used: 0,
    },
    {
      model: "Gemini 2.0 Flash",
      provider: "Google",
      response:
        "⚠️ מצב Demo\n\nה-Backend (FastAPI) לא רץ כרגע.\nהפרומפט שלך: " +
        prompt.slice(0, 100) +
        (prompt.length > 100 ? "…" : "") +
        "\n\nהפעל את שרת ה-backend כדי לקבל תשובה אמיתית.",
      latency_ms: Date.now() - now + 95,
      tokens_used: 0,
    },
    {
      model: "Claude 3.5 Sonnet",
      provider: "Anthropic",
      response:
        "⚠️ Backend offline\n\nכדי להפעיל:\n```\ncd backend\npip install -r requirements.txt\nuvicorn main:app --reload\n```\nולהוסיף ל-.env:\nANTHROPIC_API_KEY=sk-ant-...",
      latency_ms: Date.now() - now + 140,
      tokens_used: 0,
    },
  ];

  return NextResponse.json({ results: demoResults, demo_mode: true });
}
