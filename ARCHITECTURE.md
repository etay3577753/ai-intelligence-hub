# AI Intelligence Hub — Architecture & Codebase Guide
> מסמך זה מתאר את מבנה המערכת המלא לשימוש Base44 ומפתחים חיצוניים.

---

## סקירה כללית

מערכת AI Intelligence Hub היא פלטפורמה לניהול ידע בתחום הבינה המלאכותית.
מורכבת משני חלקים שרצים במקביל:

| חלק | טכנולוגיה | פורט | תפקיד |
|-----|-----------|------|--------|
| **Backend** | Python 3.14 + FastAPI | 8000 | API, לוגיקה, AI, נתונים |
| **Frontend** | Next.js 15 + TypeScript | 3000 | ממשק משתמש בעברית (RTL) |

**GitHub:** `https://github.com/etay3577753/ai-intelligence-hub`  
**Base44 App ID:** `6a12ac36d1e7c422d8dff817`

---

## מבנה תיקיות

```
The Master AI Architect/
├── backend/
│   ├── main.py                    # FastAPI app + CORS + router registration
│   ├── orchestrator.py            # ניתוב בין מודלי AI
│   ├── routers/
│   │   ├── wiki.py               # GET /api/wiki — רשימת קבצי מחקר
│   │   ├── base44.py             # GET /api/b44/* — endpoints לBase44
│   │   ├── chat.py               # POST /api/chat — שיחה עם AI
│   │   ├── process.py            # POST /api/process — עיבוד טקסט
│   │   ├── notifications.py      # GET/POST /api/notifications
│   │   └── health.py             # GET /health
│   ├── providers/
│   │   ├── base.py               # interface אחיד לכל מודלי AI
│   │   ├── claude_provider.py    # Anthropic Claude
│   │   ├── gemini.py             # Google Gemini
│   │   ├── openai_provider.py    # OpenAI GPT
│   │   └── ollama_provider.py    # Ollama (מקומי, GTX 1070 Ti)
│   ├── research/
│   │   └── research_engine.py   # מנוע מחקר עומק
│   ├── scripts/
│   │   ├── deep_researcher.py    # מחקר עומק ב-Perplexity
│   │   └── youtube_researcher.py # מחקר סרטוני YouTube
│   ├── data/
│   │   ├── wiki/                 # 41 מחקרי עומק (Markdown)
│   │   │   └── youtube/          # 308 תמלולי סרטונים (Markdown)
│   │   ├── notifications.json    # התראות מערכת
│   │   ├── my_tools.json         # כלי AI שנחקרו
│   │   └── tools_master.json     # מאסטר רשימת כלים
│   ├── youtube_pipeline.py       # שלב 1: הורדת metadata + כתוביות מYouTube
│   ├── whisper_transcribe.py     # שלב 2: תמלול בWhisper (CUDA) לסרטונים ללא כתוביות
│   ├── youtube_watcher.py        # ניטור אוטומטי לתוכן חדש
│   ├── facebook_import.py        # ייבוא תיאורים מFacebook/Instagram
│   └── base44_push.py            # דחיפת נתונים לBase44 API
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── page.tsx          # Dashboard ראשי
│   │   │   ├── chat/page.tsx     # ממשק שיחה עם AI
│   │   │   ├── settings/page.tsx # הגדרות מערכת
│   │   │   ├── task-router/page.tsx # מנתב משימות חכם
│   │   │   ├── knowledge-base/page.tsx # מאגר ידע
│   │   │   ├── access-map/page.tsx     # מפת גישה לכלים
│   │   │   └── api/             # Next.js API routes (מקשר לFastAPI)
│   │   │       ├── wiki/route.ts      # קריאת קבצי wiki מFileSystem
│   │   │       ├── chat/              # ניהול שיחות
│   │   │       └── process/route.ts   # עיבוד AI
│   │   ├── components/
│   │   │   ├── Sidebar.tsx       # ניווט צד (RTL עברי)
│   │   │   ├── WikiPage.tsx      # תצוגת Wiki — 349 קבצים
│   │   │   ├── NotificationBell.tsx   # פעמון התראות (Facebook-style)
│   │   │   ├── ComparisonView.tsx     # השוואת מודלי AI
│   │   │   ├── ModelsPage.tsx         # ניהול מודלים
│   │   │   ├── DashboardLayout.tsx    # Layout ראשי
│   │   │   └── HardwareGuard.tsx      # ניטור GPU (GTX 1070 Ti, 8GB VRAM)
│   │   └── lib/
│   │       ├── orchestrator.ts   # ניתוב בין מודלים (frontend)
│   │       └── user-profile.ts   # פרופיל משתמש
│   └── next.config.ts            # Proxy לFastAPI + Vercel config
├── vercel.json                   # פריסה לVercel (frontend בחינם)
├── .env                          # מפתחות API (לא ב-git)
└── ARCHITECTURE.md               # המסמך הזה
```

---

## Base44 Entities — מה דחפנו

### IntelligenceFeed (308 רשומות)
סרטוני YouTube Shorts של אלירן גיני עם תמלול עברי מלא.

```json
{
  "title": "שם הסרטון",
  "source_name": "YouTube — אלירן גיני",
  "summary_hebrew": "תקציר / תיאור מפייסבוק",
  "content": "תמלול מלא מהכתוביות",
  "url": "https://youtube.com/watch?v=...",
  "date": "2026-04-06",
  "source_id": "VIDEO_ID",
  "tags": ["YouTube", "אלירן גיני", "Rails"]
}
```

### AITool (41 רשומות)
מחקרי עומק על כלי AI — Claude Code, MCP, Cursor, Zapier ועוד.

```json
{
  "name": "שם הכלי",
  "ecosystem_name": "Anthropic / OpenAI / Google...",
  "category": "מחקר עומק",
  "description": "תיאור הכלי",
  "source_url": "קישור למחקר",
  "source_id": "FILE_ID",
  "tags": ["מחקר", "AI"]
}
```

---

## Base44 API — כיצד לקרוא לנתונים

```javascript
import { createClient } from '@base44/sdk';

const base44 = createClient({
  appId: "6a12ac36d1e7c422d8dff817",
  headers: { "api_key": "ac8971c61fc24b25ba6fe9958742767e" }
});

// כל סרטוני YouTube
const videos = await base44.entities.IntelligenceFeed.list();

// חיפוש בכלי AI
const tools = await base44.entities.AITool.filter({ ecosystem_name: "Anthropic" });

// מחקר ספציפי
const claude = await base44.entities.AITool.get("claude_code_id");
```

---

## API Endpoints — Backend (FastAPI)

| Method | Endpoint | תיאור |
|--------|----------|-------|
| GET | `/api/wiki` | רשימת 349 קבצי מחקר |
| GET | `/api/wiki?id=X` | תוכן קובץ ספציפי |
| GET | `/api/b44/status` | סטטוס מערכת + סטטיסטיקות |
| GET | `/api/b44/wiki` | רשימה מותאמת לBase44 |
| GET | `/api/b44/wiki/{id}` | קובץ ספציפי לBase44 |
| GET | `/api/b44/search?q=...` | חיפוש חופשי |
| GET | `/api/b44/export` | JSON מלא לייבוא |
| POST | `/api/b44/webhook` | קבלת אירועים מBase44 |
| POST | `/api/chat` | שיחה עם AI |
| POST | `/api/process` | עיבוד טקסט |
| GET | `/api/notifications` | התראות מערכת |

---

## מודלי AI נתמכים

```python
# providers/base.py — interface אחיד
class AIProvider:
    async def complete(prompt, model, temperature) -> str: ...

# ניתוב אוטומטי לפי זמינות וסוג משימה:
# קוד/ניתוח    → Claude (Anthropic)
# חיפוש/מחקר  → Gemini (Google) + Perplexity
# מקומי/פרטי  → Ollama (GTX 1070 Ti, 8GB VRAM)
```

---

## Pipeline סרטוני YouTube

```
yt-dlp → metadata + כתוביות VTT
    ↓
fix_vtt_parsing.py → ניקוי timestamps
    ↓                          ↓
יש כתוביות            אין כתוביות
    ↓                          ↓
שמירה ישירה          whisper_transcribe.py
                      (faster-whisper + CUDA)
    ↓
backend/data/wiki/youtube/VIDEO_ID.md
    ↓
base44_push.py → Base44.IntelligenceFeed
```

---

## סנכרון מול GitHub

```bash
# עדכון Base44 אחרי כל שינוי מקומי:
python backend/base44_push.py \
  --api-key ac8971c61fc24b25ba6fe9958742767e \
  --app-id  6a12ac36d1e7c422d8dff817

# push לGitHub (מסנכרן בין שני המחשבים):
git add . && git commit -m "update" && git push
```

---

## משתני סביבה (.env)

```env
GEMINI_API_KEY=...
PERPLEXITY_API_KEY=...
BASE44_API_KEY=b44-hub-secret-2024
BASE44_TUNNEL_URL=
NEXT_PUBLIC_API_URL=http://localhost:8000
OLLAMA_BASE_URL=http://localhost:11434
GPU_VRAM_GB=8
GPU_MODEL=GTX_1070_Ti
```
