# AI Intelligence Hub — Full System Context for Base44
> קובץ זה מכיל את **כל** המידע על המערכת: ארכיטקטורה, עיצוב, לוגיקה עסקית, רכיבי UI, ומנוע קבלת החלטות.
> מטרה: לאפשר ל-Base44 AI לשחזר, להרחיב, ולשלב את המערכת.

---

## 1. סקירה כללית — מה המערכת הזו

**AI Intelligence Hub** — פלטפורמה אישית לניהול ידע בבינה מלאכותית, בעברית (RTL).

### מה היא עושה:
1. **מנתב משימות חכם** — המשתמש מתאר משימה, המערכת שואלת 4 שאלות, ומחזירה 2-4 המלצות כלי AI עם פרומפטים מוכנים לשימוש ו"קבלת החלטה" שקופה
2. **השוואת מודלי AI** — שולח פרומפט ל-Gemini, GPT-4o, Claude בו-זמנית ומציג תוצאות לצד
3. **ספריית ידע (Wiki)** — 349 קבצי Markdown: 308 תמלולי YouTube + 41 מחקרי עומק על כלי AI
4. **מאגר כלים** — טבלה של כלי AI עם פילטר, חיפוש, תמיכה בעברית, עלות, דירוג
5. **מפת גישה** — כל משתמש מגדיר אילו כלים זמינים לו (API key / מנוי / local runtime)

### טכנולוגיות:
| חלק | טכנולוגיה | פורט |
|-----|-----------|------|
| Backend | Python 3.14 + FastAPI | 8000 |
| Frontend | Next.js 15 + TypeScript + Tailwind | 3000 |
| AI ענן | Anthropic Claude, Google Gemini, OpenAI GPT | API |
| AI מקומי | Ollama (faster-whisper + CUDA on GTX 1070 Ti) | 11434 |
| Base44 | Entities: IntelligenceFeed (308), AITool (41) | — |

---

## 2. מבנה תיקיות מלא

```
The Master AI Architect/
├── backend/
│   ├── main.py                    # FastAPI app + CORS + router registration
│   ├── orchestrator.py            # מנוע המלצות: keyword matching + system message builder
│   ├── routers/
│   │   ├── wiki.py               # GET /api/wiki
│   │   ├── base44.py             # GET/POST /api/b44/* — Base44 endpoints
│   │   ├── chat.py               # POST /api/chat
│   │   ├── process.py            # POST /api/process — השוואת מודלים
│   │   ├── notifications.py      # GET/POST /api/notifications
│   │   └── health.py             # GET /health
│   ├── providers/
│   │   ├── base.py               # interface אחיד
│   │   ├── claude_provider.py    # Anthropic Claude
│   │   ├── gemini.py             # Google Gemini
│   │   ├── openai_provider.py    # OpenAI GPT
│   │   └── ollama_provider.py    # Ollama (מקומי)
│   ├── data/
│   │   ├── wiki/*.md             # 41 מחקרי עומק
│   │   ├── wiki/youtube/*.md     # 308 תמלולי YouTube
│   │   ├── tools_master.json     # מאגר כלי AI
│   │   └── notifications.json   # התראות
│   └── base44_push.py            # CLI לדחיפת נתונים ל-Base44
├── frontend/src/
│   ├── app/
│   │   ├── page.tsx              # Dashboard ראשי (מפנה ל-login אם לא מחובר)
│   │   ├── chat/page.tsx         # ממשק שיחה
│   │   ├── task-router/page.tsx  # מנתב משימות (הקובץ הגדול ביותר)
│   │   ├── knowledge-base/page.tsx
│   │   ├── access-map/page.tsx
│   │   ├── settings/page.tsx
│   │   └── api/
│   │       ├── wiki/route.ts     # קריאת markdown מ-filesystem
│   │       ├── task-router/route.ts # לוגיקת ניתוב + AI calls
│   │       └── process/route.ts
│   ├── components/
│   │   ├── Sidebar.tsx           # ניווט RTL עם collapse
│   │   ├── DashboardLayout.tsx   # Layout ראשי עם view switching
│   │   ├── ModelsPage.tsx        # טבלת כלים עם חיפוש/פילטר
│   │   ├── ComparisonView.tsx    # השוואת 3 מודלים
│   │   ├── WikiPage.tsx          # תצוגת Wiki
│   │   ├── NotificationBell.tsx  # פעמון (Facebook-style)
│   │   ├── HardwareGuard.tsx     # ניטור GPU
│   │   └── ApiUsageMeter.tsx     # מד שימוש API
│   └── lib/
│       ├── user-profile.ts       # ניהול משתמש + AccessMap + preferences
│       └── utils.ts              # cn() helper
└── ARCHITECTURE.md
```

---

## 3. עיצוב ומראה (Design System)

### סכמת צבעים (Dark Mode — CSS Variables)
```css
/* globals.css */
--background: #0a0a0a        /* רקע ראשי */
--foreground: #fafafa        /* טקסט ראשי */
--card: #111111              /* כרטיסים */
--primary: #7c3aed           /* סגול (accent) */
--secondary: #1a1a1a         /* רקע משני */
--muted-foreground: #a1a1aa  /* טקסט מעומעם */
--border: #262626            /* גבולות */
--destructive: #ef4444       /* אדום */
```

### כיווניות RTL
- כל הדף: `dir="rtl"`, `lang="he"`
- `ps-` / `pe-` במקום `pl-` / `pr-` (logical CSS properties)
- Sidebar נמצאת בצד ימין
- כפתורי ניווט: כיוון `text-start`

### Sidebar Layout
```
[sidebar — 64px collapsed | 256px expanded] [main content]
```

פריסה:
```
┌─────────────────────────────────────────────────────┐
│ [סגול] מרכז הבינה המלאכותית              [🔔][⚙️]  │ ← header
├──────────┬──────────────────────────────────────────┤
│ [brain]  │                                          │
│ מנתב     │         תוכן הדף הפעיל                   │
│ שאל AI   │                                          │
│ יועץ     │                                          │
│ ────     │                                          │
│ לוח בקרה │                                          │
│ השוואה   │                                          │
│ מודלים   │                                          │
│ Wiki     │                                          │
│ הגדרות  │                                          │
│ ────     │                                          │
│ [🔔]     │                                          │
│ [GPU]    │                                          │
│ [👑 מנהל]│                                          │
│ [← כווץ] │                                          │
└──────────┴──────────────────────────────────────────┘
```

---

## 4. קוד — Sidebar.tsx (ניווט ראשי)

```tsx
// frontend/src/components/Sidebar.tsx
"use client";

// NAV_ITEMS — קישורים בתוך ה-Dashboard (view switching):
const NAV_ITEMS = [
  { icon: LayoutDashboard, label: "לוח בקרה", id: "dashboard" },
  { icon: GitCompare,      label: "השוואה",   id: "compare"   },
  { icon: Brain,           label: "מודלים",   id: "models"    },
  { icon: BookOpen,        label: "מחקר Wiki", id: "wiki"     },
  { icon: Settings,        label: "הגדרות",   id: "settings"  },
];

// כפתורים עליונים — pages נפרדות:
// [Workflow] מנתב משימות  → /task-router
// [MessageCircle] שאל על AI → /chat
// [Plus] יועץ פרויקטים   → /chat
// [Wrench] הגדרות ארגז   → /settings
// [ShieldCheck] מפת גישה → /access-map    (ירוק)
// [Database] מאגר ידע    → /knowledge-base (כחול)

// User badge בתחתית:
// admin → 👑 "מנהל מערכת" (text-yellow-400)
// guest → 👤 "משתמש אורח" (text-muted-foreground)

// כפתור collapse: ChevronLeft (collapsed) / ChevronRight (expanded)
// HardwareGuard: מציג GTX 1070 Ti / 8GB VRAM — רק כשמורחב
// NotificationBell: פעמון התראות Facebook-style
```

---

## 5. קוד — ModelsPage.tsx (דף מודלים/כלים)

### ממשק Tool:
```typescript
interface Tool {
  id: string;
  category: string;          // "מצגות" | "וידאו ועריכה" | וכו'
  name: string;              // שם הכלי
  link: string;              // URL לכלי
  description: string;       // תיאור קצר
  hebrew_support: "תומך" | "לא תומך" | "לא ידוע";
  cost: string;              // "חינם" | "$20/חודש" וכו'
  rating: string | null;     // "★★★★☆" או null
  source: "A" | "B" | "A+B"; // מקור הנתונים
  verified: boolean;         // האם אומת ידנית
}
```

### מראה הדף:
```
┌─────────────────────────────────────────────────┐
│ סה"כ כלים: 156  מוצגים: 23  מאומתים: 5         │
├─────────────────────────────────────────────────┤
│ [🔍 חיפוש לפי שם, תיאור...]  [הכל][מצגות][וידאו]│
├──────────┬──────────┬──────┬────────┬────┬──────┤
│ קטגוריה │ שם הכלי │תיאור │עברית  │עלות│דירוג│
├──────────┼──────────┼──────┼────────┼────┼──────┤
│ מצגות   │ Gamma ↗  │תיאור │✅תומך │חינם│★★★★ │
│ וידאו    │ Runway ↗ │תיאור │⚠️לא   │$15 │★★★  │
└──────────┴──────────┴──────┴────────┴────┴──────┘
```

**צבעי Badge:**
- `תומך` → `variant="success"` (ירוק)
- `לא תומך` → `variant="destructive"` (אדום)
- `לא ידוע` → `variant="secondary"` (אפור)

**כפתור אימות:**
- לא מאומת → outline, "אמת"
- לוחץ → spinner 800ms
- מאומת → secondary + text-green-400, "מאומת" + CheckCircle

---

## 6. קוד — ComparisonView.tsx (השוואת מודלים)

```
┌─────────────────────────────────────────────────┐
│ [textarea: הכנס פרומפט...]           [השווה →] │
├───────────────┬───────────────┬─────────────────┤
│ 🔵 Google     │ 🟢 OpenAI    │ 🟣 Anthropic    │
│ gemini-pro    │ gpt-4o-mini  │ claude-3-haiku  │
│ ⏱ 1234 ms    │ ⏱ 890 ms     │ ⏱ 2100 ms      │
│ 💻 450 טוקנים │              │                 │
│               │              │                 │
│ [תוכן תשובה] │ [תוכן תשובה] │ [תוכן תשובה]   │
└───────────────┴───────────────┴─────────────────┘
```

**צבעי providers:**
- Google → `text-blue-400 border-blue-500/30`
- OpenAI → `text-green-400 border-green-500/30`
- Anthropic → `text-purple-400 border-purple-500/30`

**שליחה:** Ctrl+Enter או לחצן "השווה"
**Loading:** Loader2 spinner ואנימציה

---

## 7. מנוע קבלת החלטות — Task Router (הלב של המערכת)

### זרימה מלאה:

```
שלב 1: INPUT
  המשתמש מתאר משימה בטקסט חופשי

שלב 2: FILTERS (4 שאלות — 30 שניות)
  ❶ מה רוצה לבנות? → 8 אפשרויות כפתורים
  ❷ כמה מכיר קוד?  → מתחיל / בינוני / מנוסה
  ❸ מידע רגיש?    → ענן — בסדר / מקומי בלבד
  ❹ עדיפות?       → מהירות / עלות / איכות / שליטה
  ❺ משהו נוסף?    → textarea אופציונלי (freeText)

שלב 2.5: CLARIFICATION (IP1 — רק אם יש סתירה)
  דוגמה: בחר "מקומי בלבד" אבל אין לו Ollama
  → שאלה: "אין לך runtime מקומי — מה לעשות?"
  → אפשרויות: [שנה לענן] [התקן Ollama] [המשך בלי שינוי]

שלב 3: LOADING
  → fetch POST /api/task-router
  → Gemini/Claude מייצר JSON עם routes

שלב 4: RESULTS
  → כרטיסי RouteCard (2-4)
  → כרטיס DecisionReceipt (קבלת החלטה)
  → כפתור "פתח יועץ AI"
```

### סוגי Routes:
```typescript
type RouteType = 
  | "Quality-first"   // סגול — "איכות מקסימלית"
  | "Cheapest"        // ירוק — "הזול ביותר"  
  | "Already-Paid"    // אמרלד — "כבר שילמת"
  | "Local-only"      // כתום — "מקומי בלבד"
  | "Fastest";        // צהוב — "הכי מהיר"
```

### מבנה RouteCard:
```
┌─────────────────────────────────────────────────┐
│ [המלצה ראשית] [איכות מקסימלית]                 │
│ Claude Code                         מתאים לך   │
│                                         87%     │
│ ████████████████████░░░░░░ 87%                  │
│                                                 │
│ "כי יש לך ניסיון בקוד ורוצה איכות גבוהה..."    │
│                                                 │
│ ✅ תמיכה בעברית    ⚠️ דורש API Key             │
│ ✅ מהיר מאוד       ⚠️ עלות משתנה              │
│                                                 │
│ 💰 ~$5-20/חודש   🔒 הקוד עולה לשרת Anthropic   │
│                                                 │
│ [▼ הצג פרומפט מוכן לשימוש]                     │
│ ┌─────────────────────────────────────────────┐ │
│ │ אתה מומחה Full-Stack. עזור לי לבנות...     │ │
│ └─────────────────────────────────────────────┘ │
│ [העתק פרומפט]                                   │
│                                                 │
│ [▼ איך מתחילים עכשיו]                           │
│  1. הכנס ל-claude.ai ← לחץ "New Project"       │
│  2. הדבק את הפרומפט ← שלח                      │
│  3. בקש: "תייצר קובץ requirements.txt"          │
└─────────────────────────────────────────────────┘
```

### DecisionReceipt (קבלת החלטה — שקיפות מלאה):
```
┌─────────────────────────────────────────────────┐
│ 📋 קבלת החלטה — שקיפות מלאה       [▼ פתח]    │
├─────────────────────────────────────────────────┤
│ מה הובן:                                        │
│ "בניית אתר עסקי עם טופס יצירת קשר, ניסיון      │
│ בינוני, ענן, עדיפות לאיכות"                    │
│                                                 │
│ פקטורים שנשקלו:                                 │
│ [ניסיון בינוני] [ענן — בסדר] [איכות] [אתר Web] │
│                                                 │
│ למה נבחרה ההמלצה הראשית:                        │
│ "Claude Code הוא הכלי המדויק ביותר לרמת..."    │
│                                                 │
│ מסלולים שנפסלו:                                  │
│ ❌ Gemini CLI — פחות עדיף לניסיון בינוני        │
│ ❌ Ollama — לא הוגדר runtime מקומי              │
│                                                 │
│ רמת ביטחון: [גבוה] (ירוק)                       │
└─────────────────────────────────────────────────┘
```

---

## 8. קוד — Backend Orchestrator (backend/orchestrator.py)

```python
# מנוע ההמלצות המרכזי

# 12 קטגוריות + מילות מפתח לכל אחת:
CATEGORY_KEYWORDS = {
    "מצגות":                ["מצגת", "שקופית", "presentation", "slides"],
    "מודלי שפה / צ'אטבוטים": ["כתיבה", "תוכן", "טקסט", "צ'אט", "בלוג"],
    "וידאו ועריכה":          ["סרטון", "וידאו", "עריכה", "קליפ", "ריל"],
    "יצירת תמונות":          ["תמונה", "גרפיקה", "image", "לוגו"],
    "אוטומציות":             ["אוטומציה", "workflow", "api", "בוט"],
    "שיווק":                 ["שיווק", "פרסום", "קמפיין", "אינסטגרם"],
    "No-Code / פיתוח":       ["אפליקציה", "אתר", "קוד", "app"],
    "פרודוקטיביות":          ["ניהול", "משימות", "פגישה", "notion"],
    "אודיו ומוזיקה":          ["מוזיקה", "אודיו", "קריינות", "פודקאסט"],
    "למידה ומחקר":           ["מחקר", "לימוד", "ניתוח", "אקדמי"],
    "עיצוב גרפי":            ["עיצוב גרפי", "ברנד", "canva"],
    "אימון מודלים חזותיים":   ["פנים", "אוואטר", "headshotpro"],
}

# שאלות הבהרה ייחודיות לכל קטגוריה:
CATEGORY_CLARIFYING = {
    "מצגות":       "האם המצגת מיועדת לקהל עסקי, אקדמי, או שיווקי?",
    "וידאו ועריכה": "מה אורך הסרטון המתוכנן, ובאיזו פלטפורמה?",
    "שיווק":       "באיזו רשת חברתית מתמקד הקמפיין?",
    # ...
}

# זרימת orchestrate():
# 1. match_categories(task) → סורק מילות מפתח → מחזיר קטגוריות ממוינות
# 2. get_tools_for_categories() → מסנן tools_master.json לפי קטגוריות
#    → ממיין: source="A+B" ← source="A"/"B", לפי rating
# 3. build_system_message() → בונה prompt עשיר ל-LLM עם:
#    - תיאור המשימה
#    - רשימת הכלים הרלוונטיים (עד 8)
#    - הוראות: שאל 2-3 שאלות → המלץ 2-3 כלים
# 4. generate_clarifying_questions() → 2 שאלות בסיס + 1 ייחודית
# 5. מחזיר: { system_message, matched_categories, matched_tools, clarifying_questions }
```

---

## 9. פרופיל משתמש ומפת גישה (user-profile.ts)

### AccessMap — מה המשתמש יכול לגשת:
```typescript
interface AccessMap {
  web_sub:        "yes" | "no" | "partial";  // מנוי ענן (Claude.ai, ChatGPT Plus...)
  api_key:        "yes" | "no" | "partial";  // API key (Anthropic, OpenAI...)
  local_runtime:  "yes" | "no" | "partial";  // Ollama / LM Studio
  org_access:     "yes" | "no" | "partial";  // גישה ארגונית
  student_access: "yes" | "no" | "partial";  // גישה סטודנטים
  notes: string;                              // הערות חופשיות
}
```

### UserPreferences:
```typescript
interface UserPreferences {
  knowledge_level:     "מתחיל" | "בינוני" | "מנוסה";
  language:            "עברית" | "English";
  explanation_style:   "קצר וממוקד" | "מפורט עם דוגמאות";
  preferred_priority:  "מהירות" | "עלות נמוכה" | "איכות גבוהה" | "שליטה מלאה";
  onboarding_done:     boolean;
}
```

### לוגיקת Access Guard ב-Task Router:
```typescript
// כלים שמחייבים מנוי ענן בתשלום:
const REQUIRES_WEB_SUB = new Set([
  "claude pro", "chatgpt plus", "gemini advanced", "perplexity pro"
]);

// כלים שמחייבים runtime מקומי:
const REQUIRES_LOCAL_RUNTIME = new Set([
  "gemma 4", "ollama", "lm studio", "llama.cpp"
]);

// כלים שמחייבים API Key:
const REQUIRES_API_KEY = new Set([
  "claude code", "anthropic api", "openai api", "aider", "cline"
]);

// filterRoutes() — מסנן המלצות שהמשתמש לא יכול להשתמש בהן
// → מציג הודעה: "X המלצות הוסרו — מצריכות כלים שלא הוגדרו"
```

---

## 10. Base44 Entities — סכמת הנתונים

### IntelligenceFeed (308 רשומות — סרטוני YouTube):
```json
{
  "title": "שם הסרטון",
  "source_name": "YouTube — אלירן גיני",
  "summary_hebrew": "תיאור / תקציר בעברית",
  "content": "תמלול מלא (עד 2000 תווים)",
  "url": "https://youtube.com/watch?v=VIDEO_ID",
  "date": "2026-04-06",
  "source_id": "VIDEO_ID",
  "tags": ["YouTube", "אלירן גיני", "AI"],
  "duration": "3:45",
  "views": "12K"
}
```

### AITool (41 רשומות — מחקרי עומק):
```json
{
  "name": "Claude Code",
  "ecosystem_name": "Anthropic",
  "category": "מחקר עומק",
  "description": "תיאור הכלי (עד 1000 תווים)",
  "source_url": "קישור למחקר",
  "source_id": "FILE_ID",
  "tags": ["מחקר", "AI", "Anthropic"]
}
```

---

## 11. API Endpoints — Backend (FastAPI port 8000)

| Method | Endpoint | תיאור |
|--------|----------|-------|
| GET | `/api/wiki` | רשימת 349 קבצי מחקר |
| GET | `/api/wiki?id=X` | תוכן קובץ ספציפי |
| GET | `/api/b44/status` | סטטוס + סטטיסטיקות |
| GET | `/api/b44/wiki` | רשימה מותאמת לBase44 |
| GET | `/api/b44/wiki/{id}` | קובץ ספציפי |
| GET | `/api/b44/search?q=...` | חיפוש חופשי |
| GET | `/api/b44/export` | JSON מלא לייבוא |
| POST | `/api/b44/webhook` | אירועים מBase44 |
| POST | `/api/chat` | שיחה עם AI |
| POST | `/api/process` | השוואת מודלים |
| POST | `/api/task-router` | מנתב משימות |
| GET | `/api/notifications` | התראות |
| GET | `/health` | בריאות שרת |

### POST /api/task-router — Request Body:
```json
{
  "task": "תיאור המשימה בטקסט חופשי",
  "answers": {
    "type":       "אתר / אפליקציה Web",
    "experience": "בינוני",
    "privacy":    "ענן — בסדר",
    "priority":   "איכות גבוהה",
    "freeText":   "אני עובד ב-Mac..."
  },
  "accessMap": {
    "web_sub": "yes",
    "api_key": "no",
    "local_runtime": "no",
    "org_access": "no",
    "student_access": "no",
    "notes": ""
  },
  "knowledgeLevel": "בינוני",
  "skipContradictionCheck": false
}
```

### POST /api/task-router — Response:
```json
{
  "summary": "הבנתי: אתה רוצה לבנות אתר עסקי...",
  "routes": [
    {
      "rank": 1,
      "routeType": "Quality-first",
      "toolName": "Claude Code",
      "why": "כי יש לך ניסיון בינוני ורוצה איכות...",
      "pros": ["תמיכה מצוינת בעברית", "מהיר מאוד"],
      "cons": ["דורש API Key", "עלות משתנה"],
      "confidence": 87,
      "estimatedCost": "~$5-20/חודש",
      "privacyNote": "הקוד עולה לשרתי Anthropic",
      "prompt": "אתה מומחה Full-Stack...",
      "handoff_steps": [
        "כנס ל-claude.ai ← לחץ New Project",
        "הדבק את הפרומפט ← שלח",
        "בקש: תייצר קובץ requirements.txt"
      ]
    }
  ],
  "decisionReceipt": {
    "understood": "בניית אתר עסקי...",
    "factors": ["ניסיון בינוני", "ענן", "איכות", "אתר Web"],
    "primaryChoice": "Claude Code הוא הכלי המדויק...",
    "rejected": ["Gemini CLI — פחות עדיף", "Ollama — לא הוגדר"],
    "confidence": "גבוה"
  },
  "model": "gemini-1.5-flash"
}
```

---

## 12. IP1 — גילוי סתירות (Contradiction Detection)

```typescript
// שני מקרים שמפעילים שאלת הבהרה:

// Case A: "מקומי בלבד" + אין local_runtime
// → שאלה: "בחרת 'מקומי בלבד' אבל Ollama לא הוגדר — מה לעשות?"
// → אפשרויות: שנה לענן | התקן Ollama | המשך בכל זאת

// Case B: "מתחיל" + תיאור עם 2+ מונחים טכניים
// → רשימת מונחים: docker, kubernetes, api, bash, typescript...
// → שאלה: "תיארת docker+API אבל סימנת 'מתחיל' — זה מדויק?"
// → אפשרויות: שנה לבינוני | כן, אני מתחיל בתחום זה
```

---

## 13. מנגנון Notification Bell

```
פעמון בסגנון Facebook:
- אייקון Bell עם badge אדום (מספר הודעות שלא נקראו)
- לחיצה → dropdown עם רשימת התראות
- כל התראה: כותרת + זמן + סוג (info/warning/success)
- "סמן הכל כנקרא"
- נתונים: backend/data/notifications.json
```

---

## 14. Pipeline YouTube

```
yt-dlp → metadata + כתוביות VTT
    ↓
fix_vtt_parsing.py → ניקוי timestamps
    ↓                              ↓
יש כתוביות                   אין כתוביות
    ↓                              ↓
שמירה ישירה          faster-whisper + CUDA (GTX 1070 Ti)
                      → backend/whisper_transcribe.py
    ↓
backend/data/wiki/youtube/VIDEO_ID.md
    ↓
base44_push.py → Base44.IntelligenceFeed
```

---

## 15. סנכרון Base44

```bash
# דחיפת כל הנתונים ל-Base44:
python backend/base44_push.py \
  --api-key YOUR_BASE44_KEY \
  --app-id  6a12ac36d1e7c422d8dff817 \
  --entity  IntelligenceFeed

# GitHub sync (בין שני מחשבים):
git add . && git commit -m "update" && git push
```

### Base44 SDK:
```javascript
import { createClient } from '@base44/sdk';

const base44 = createClient({
  appId: "6a12ac36d1e7c422d8dff817",
  headers: { "api_key": "YOUR_API_KEY" }
});

const videos = await base44.entities.IntelligenceFeed.list();
const tools  = await base44.entities.AITool.filter({ ecosystem_name: "Anthropic" });
```

---

## 16. משתני סביבה (.env)

```env
GEMINI_API_KEY=...
ANTHROPIC_API_KEY=...
PERPLEXITY_API_KEY=...
BASE44_API_KEY=b44-hub-secret-2024
NEXT_PUBLIC_API_URL=http://localhost:8000
OLLAMA_BASE_URL=http://localhost:11434
GPU_VRAM_GB=8
GPU_MODEL=GTX_1070_Ti
```

---

## 17. הגדרות Next.js (next.config.ts)

```typescript
// Proxy: כל /api/* → http://localhost:8000
// RTL: lang="he", dir="rtl"
// Dark mode: class-based
// vercel.json: rootDirectory = "frontend"
```

---

## 18. רכיבי UI (shadcn/ui + Tailwind)

### Components בשימוש:
- `Card / CardHeader / CardTitle / CardContent`
- `Button` (variant: default | outline | secondary | ghost | destructive)
- `Badge` (variant: default | secondary | success | destructive | outline)
- `Input`, `Textarea`
- Lucide icons: Brain, Workflow, GitCompare, BookOpen, Settings, Loader2, Search, Filter, CheckCircle, ExternalLink, Send, Clock, Cpu, ChevronDown/Up/Left/Right, RefreshCw, Zap, ShieldCheck, Database, LogOut, Plus, Wrench, MessageCircle, Copy, Check, ArrowRight

### Animations:
- `animate-spin` — loading spinners
- `animate-bounce` — loading dots (3 נקודות עם delay)
- `transition-colors` — hover effects
- `transition-all duration-300` — sidebar collapse

---

## 19. נתיב ויזואלי — מסע משתמש מלא

```
1. כניסה → /login → localStorage.setItem("current_user_id", "admin")
2. Redirect → / → DashboardLayout
3. Dashboard: 3 כרטיסי stats + Quick Start + ApiUsageMeter
4. Sidebar:
   → "מנתב משימות" → /task-router (המוצר הראשי)
   → "שאל על AI"   → /chat
   → "מפת גישה"    → /access-map (הגדר מה זמין לך)
5. מנתב משימות:
   → כתוב משימה → 4 שאלות → (אולי: שאלת הבהרה) → תוצאות
   → RouteCards + DecisionReceipt + "פתח יועץ AI"
6. Wiki → 349 קבצים → מחקרי עומק
7. מודלים → טבלת כלים עם פילטר + אימות
8. השוואה → פרומפט אחד → 3 מודלים במקביל
```

---

## 20. GitHub Repo

```
URL: https://github.com/etay3577753/ai-intelligence-hub
Branch: main
Status: Private (יש להפוך לציבורי לגישת Base44)

Base44 App ID: 6a12ac36d1e7c422d8dff817
GitHub Connector: "base44 AI Hub" (Connections: 1)
```

---

*קובץ זה נוצר ב-2026-05-24 ומכיל snapshot מלא של המערכת.*
*לשאלות: etay3577753@gmail.com*
