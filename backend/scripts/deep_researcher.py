"""
deep_researcher.py — Autonomous AI Tool Research Agent
======================================================
Reads tools_master.json → queries Perplexity Sonar-Pro API for each tool →
saves a Deep Research Framework report as Markdown in /backend/data/wiki/.

Run independently (no Claude Code required):
    python deep_researcher.py                    # research ALL tools
    python deep_researcher.py --tool claude      # one specific tool
    python deep_researcher.py --limit 5          # first 5 tools only
    python deep_researcher.py --category שיווק   # one category only
    python deep_researcher.py --dry-run          # test without API calls

Requirements:
    pip install requests python-dotenv
"""

import argparse
import json
import os
import sys
import time
from datetime import datetime
from pathlib import Path

# ── Load .env ────────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")
except ImportError:
    pass  # dotenv optional — user can set env vars manually

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT        = Path(__file__).resolve().parents[2]
TOOLS_PATH  = ROOT / "backend" / "data" / "tools_master.json"
WIKI_DIR    = ROOT / "backend" / "data" / "wiki"
LOG_PATH    = ROOT / "backend" / "data" / "research_log.json"

WIKI_DIR.mkdir(parents=True, exist_ok=True)

# ── API Config ────────────────────────────────────────────────────────────────
PERPLEXITY_API_KEY    = os.getenv("PERPLEXITY_API_KEY", "")
PERPLEXITY_API_URL    = "https://api.perplexity.ai/chat/completions"
PERPLEXITY_MODEL      = "sonar-pro"          # Best for deep research with citations
PERPLEXITY_MODEL_FAST = "sonar"              # Cheaper, faster — use with --fast flag

# Rate limiting (Perplexity free tier: ~1 req/sec)
REQUEST_DELAY_SEC = 2.0

# ── v2.0 System Prompt ────────────────────────────────────────────────────────
DEEP_RESEARCH_SYSTEM_PROMPT_V2 = """
You are a deep technical researcher writing an exhaustive Wiki article about an AI tool.

MANDATORY RULES:
1. Every factual claim → numbered citation [1][2][3]. No source = write "לא אומת"
2. Official sources first: changelog, docs, pricing page, official blog, GitHub
3. Language: Hebrew for explanations. English for: button names, code, prompts, technical terms
4. Minimum 15 citations. Minimum 12,000 characters total.
5. Follow EXACTLY the 15-chapter structure. Do not skip any chapter.
6. Empty fields → write "לא אומת [X]" — never leave blank
"""

# ── Deep Research Framework System Prompt ─────────────────────────────────────
# Injected directly from methodology_master.md logic (version 1.0)
DEEP_RESEARCH_SYSTEM_PROMPT = """
אתה חוקר AI מומחה שמיישם את "מסגרת המחקר העמוק" (Deep Research Framework) לניתוח כלי בינה מלאכותית.

## כללי מחקר מחייבים

### Anti-Shallow Research Rule
מחקר רדוד = לבדוק רק שם + מחיר. זה אסור.
מחקר עמוק = לבדוק:
- איך המודל מקבל החלטות (פרמטרים טכניים)
- אילו פרמטרים שולטים בו (Temperature, Top P, וכו')
- איך הוא מתנהג בעברית (RTL, מגדר, ניקוד)
- מה הוא עולה בשימוש אמיתי (לא רק מחיר רשמי)

### 6 פרמטרים טכניים לבדוק בכל כלי
1. **Temperature** — האם ניתן לשנות? (0.0–2.0) היכן בממשק?
2. **Top P (Nucleus Sampling)** — זמין? האם יש אזהרה לא לשנות עם Temperature?
3. **Frequency Penalty** — מפחית חזרתיות מילולית? (0.0–2.0)
4. **Presence Penalty** — מעודד נושאים חדשים? (0.0–2.0)
5. **Stop Sequences** — ניתן להגדיר? היכן?
6. **Logit Bias** — קיים? API בלבד?

### כלל קריטי: לעולם לא לשנות Temperature ו-Top P ביחד — גורם לחוסר יציבות.

### לוקליזציה לישראל — חובה לבדוק
- RTL: האם הממשק תומך בכיווניות ימין-שמאל?
- מגדר עברי: האם המודל "ננעל" על לשון זכר? (שיעור שגיאה ידוע: ~45%)
- חוק הגנת הפרטיות הישראלי 1981 + תיקון 13 (אוגוסט 2025): האם הכלי עומד?
- MASAV: תמיכה בפורמטים ישראליים?
- סגנון תקשורת: עברית רשמית vs. עברית של "וואטסאפ"

### כלל ה-13-שנה (Simplified Hebrew Guide)
לכל כלי, כתוב הסבר פשוט בעברית כאילו אתה מסביר לילד בן 13:
- מה הכלי עושה? (משפט אחד פשוט)
- למה כדאי להשתמש בו?
- איפה הוא הכי שימושי?
- מה הסכנה/חיסרון העיקרי?

## פורמט פלט מחייב
ענה רק בפורמט Markdown המבוקש. אל תוסיף הקדמות או סיכומים מחוץ לתבנית.
"""

# ── Per-tool research prompt template ────────────────────────────────────────
def build_research_prompt(tool: dict) -> str:
    tool_name  = tool.get("name", "")
    tool_id    = tool.get("id", "")
    category   = tool.get("category", "")
    cost       = tool.get("cost", "")
    link       = tool.get("link", "")
    hebrew     = tool.get("hebrew_support", "לא ידוע")
    desc       = tool.get("description", "")
    ecosystem  = tool.get("ecosystem", "עצמאי")

    return f"""
חקור לעומק את הכלי הבא ומלא את תבנית המחקר המלאה:

## פרטי הכלי
- **שם**: {tool_name} (ID: {tool_id})
- **קטגוריה**: {category}
- **אקו-סיסטם**: {ecosystem}
- **עלות ידועה**: {cost}
- **קישור**: {link}
- **תמיכת עברית ידועה**: {hebrew}
- **תיאור קצר**: {desc}

## משימות המחקר

### 1. Technical Summary
מצא:
- גרסת המודל הנוכחית (2025-2026)
- סוג המודל (LLM / Multimodal / Vision / Audio / Specialized)
- יכולות הליבה
- context window בטוקנים

### 2. UI & Settings Audit
בדוק בממשק הרשמי ({link}) ובתיעוד:
- ציון נוחות ניווט (1–10)
- האם Temperature זמין? ערך ברירת מחדל?
- האם Top P זמין? ערך ברירת מחדל?
- האם Frequency Penalty זמין?
- האם Presence Penalty זמין?
- האם Stop Sequences זמינים?
- האם Logit Bias זמין (API בלבד)?
- האם קיים System Prompt / System Instructions?
- האם יש Streaming?
- קישור ל-Developer/Playground ממשק

### 3. Economics & Quotas (ניתוח כלכלי 2025-2026)
מצא:
- עלות לגרסה חינמית (RPM, הגבלות יומיות)
- עלות לגרסת Pro ($ לחודש + מה כלול)
- עלות API לפי טוקנים ($ ל-1M input / output)
- context window לכל גרסה

### 4. Israeli Localization (לוקליזציה לישראל)
- תאימות RTL: תיאור בעיות תצוגה ספציפיות
- טיפול במגדר עברי: דוגמאות שגיאות
- עמידה בחוק הגנת הפרטיות (כן/לא + הסבר)
- GDPR / CCPA compliance
- שרתי אחסון (EU? US? ישראל?)

### 5. Simplified Hebrew Guide (כלל ה-13-שנה)
כתוב בעברית פשוטה לבן 13:
- מה זה? (משפט אחד)
- למה כדאי? (2-3 נקודות)
- מתי הכי שימושי?
- מה הסיכון/חיסרון?
- טיפ סודי אחד

### 6. Final Recommendations
- להטמיע במערכת? (כן/לא/תלוי שימוש)
- נוסחה/Prompt שעבדה הכי טוב בעברית
- Strengths (3 נקודות)
- Weaknesses (3 נקודות)
- Best Use Case

ענה בפורמט Markdown מלא לפי התבנית הבאה. תשובה ב**עברית** עם מונחים טכניים באנגלית.
"""

# ── v2.0 Per-tool research prompt (15 chapters) ──────────────────────────────
def build_v2_research_prompt(tool: dict, part: str = "a") -> str:
    """
    part="a" → Chapters 1-8 (Identity, OSS, Capabilities, Connectors, Extensions, Availability, Pricing, UI)
    part="b" → Chapters 9-15 (Languages, Tokens, Prompting, Advanced, Routing, Comparison, Israel)
    """
    tool_name = tool.get("name", "")
    tool_id   = tool.get("id", "")
    link      = tool.get("link", "")
    ecosystem = tool.get("ecosystem", "עצמאי")
    cost      = tool.get("cost", "")
    hebrew    = tool.get("hebrew_support", "לא ידוע")
    desc      = tool.get("description", "")

    header = f"""
Research subject: {tool_name} | Ecosystem: {ecosystem} | URL: {link}
Known cost: {cost} | Hebrew support: {hebrew}
Short description: {desc}

Write a thorough Wiki article in Hebrew. Minimum 15 numbered citations [1][2][3].
Unverified info → write "לא אומת [X]". Never leave fields blank.

---
"""

    if part == "b":
        return header + f"""
## פרק 9 — שפות ועברית

א) ממשק הכלי בעברית: מלא/חלקי/לא קיים | [X]
ב) רמת הבנת עברית: מלאה/גבוהה/בינונית/בסיסית | [X]
ג) RTL — מציג נכון? בעיות ידועות? | [X]
ד) ניקוד — יכול לכתוב עם ניקוד? | [X]
ה) מגדר זכר/נקבה — עובד נכון? | [X]
ו) שפת הפרומפט האופטימלית: אנגלית / עברית / Prompt+ענה בעברית / לא משנה | [X]
ז) ירידת איכות בעברית לעומת אנגלית: X% | [X]

---

## פרק 10 — ניהול Tokens וחיסכון

- מונה tokens בממשק: real-time / post / לא קיים | [X]
- Context Window: X tokens = ~X מילים = ~X דפי A4 | [X]
- מה קורה כשמתמלא: | [X]
- Caching: ✅/❌ | איך מפעילים | חיסכון % | [X]

| פעולה | tokens בקירוב | עלות בAPI |
|--------|--------------|----------|
| שאלה קצרה (50 מילים) | | |
| PDF 10 עמ' | | |
| שיחה 20 הודעות | | |

---

## פרק 11 — אמנות הפרומפט לכלי הזה

### המבנה האופטימלי לפרומפט
```
[ROLE] You are an expert [role].
[TASK] [תיאור המשימה]
[CONTEXT] Background: [רקע]
[FORMAT] Respond as: [bullets/JSON/prose/code]
[CONSTRAINTS] Keep under X words. In Hebrew.
```

### Role Prompting — עובד/לא עובד | [X]
### Chain of Thought ("חשוב צעד אחר צעד") — עוזר/לא עוזר | [X]
### אורך פרומפט מומלץ: קצר/בינוני/מפורט | [X]
### PDF vs. טקסט: עד X עמ' → הדבק טקסט | X+ עמ' → העלה | [X]
### Magic Prompts / פקודות מיוחדות | [X]

### System Prompt קבוע מומלץ:
```
[system prompt ready-to-use]
```

### מה עובד ✅ / לא עובד ❌ — לפחות 3 כל אחד | [X]

---

## פרק 12 — יכולות מתקדמות ומקסום

5 פיצ'רים שרוב המשתמשים לא יודעים (מאומת): | [X]
Labs / Beta features: | [X]
API tricks — דברים שרק ב-API: | [X]

---

## פרק 13 — ניתוב בתוך האקוסיסטם {ecosystem}

| | {tool_name} | כלי אחי 1 | כלי אחי 2 |
|--|------------|-----------|-----------|
| URL | {link} | | |
| עבור מי | | | |
| Context | | | |
| מחיר | | | |
| מתי עדיף | | | |

**שאלת ההחלטה:** "[שאלה אחת שמכריעה]"

דוגמאות:
- "[מצב A]" → [כלי]
- "[מצב B]" → [כלי]

---

## פרק 14 — השוואה עם המתחרה הישיר

| | {tool_name} | מתחרה 1 | מתחרה 2 |
|--|------------|---------|---------|
| חוזקה | | | |
| חולשה | | | |
| מחיר | | | |
| Hebrew | | | |
| Context | | | |

**בחר {tool_name} כאשר:** [3 מצבים] | [X]
**בחר המתחרה כאשר:** [3 מצבים] | [X]

---

## פרק 15 — ישראל: מה עובד, מה לא

- זמינות רשמית בישראל: ✅/❌/⚠️ | [X]
- תשלום ישראלי מאומת (כרטיס, PayPal, שקלים, VAT): | [X]
- פיצ'רים חסומים בישראל ספציפית: | [X]
- ביצועי עברית — דיווחים מאומתים מישראלים: | [X]
- בעיות RTL ידועות + workarounds: | [X]
- חוק הגנת הפרטיות הישראלי 1981 + תיקון 13 (2025) — עמידה: | [X]
- GDPR compliance: | [X]
- שרתי אחסון: EU / US / ישראל | [X]

---

## מקורות:
[ממוספרים 1–N, לפחות 8 מקורות לחלק זה]
"""

    # part == "a": Chapters 1-8
    return header + f"""
## פרק 1 — זיהוי וסיווג הכלי

מלא טבלה:
| פרמטר | פרטים | מקור |
|--------|--------|------|
| שם רשמי | | |
| יצרן | | [X] |
| תאריך השקה | | [X] |
| גרסה נוכחית | | [X] |
| סיווג (קטגוריות) | | [X] |
| קהל יעד | | [X] |
| URL ראשי | {link} | |
| GitHub (אם קיים) | | [X] |

---

## פרק 2 — Open Source וקהילה

| | פרטים | מקור |
|--|--------|------|
| סטטוס | Open / Partial / Closed | [X] |
| רישיון | | [X] |
| GitHub | [URL] ⭐X stars | [X] |
| Self-host | כן/לא + דרישות | [X] |
| קהילה | Discord/Forum [URL] | [X] |
| תדירות עדכונים | | [X] |

---

## פרק 3 — Capability Matrix

טבלה לכל יכולה — ציין: קיים (✅/❌/⚠️), Tier, זמין בישראל (✅/❌/?):

| יכולת | זמין | Tier | ישראל | מקור |
|--------|------|------|-------|------|
| כתיבת תוכן | | | | [X] |
| סיכום מסמכים | | | | [X] |
| תרגום עברית↔אנגלית | | | | [X] |
| כתיבת קוד | | | | [X] |
| Debug קוד | | | | [X] |
| Vision — ניתוח תמונות | | | | [X] |
| יצירת תמונות | | | | [X] |
| העלאת PDF | | | | [X] |
| Web Search בזמן אמת | | | | [X] |
| Code Execution | | | | [X] |
| Multi-turn Memory | | | | [X] |
| Agents / Agentic mode | | | | [X] |
| Voice input/output | | | | [X] |
| Streaming | | | | [X] |

---

## פרק 4 — Connectors ואינטגרציות

### Native Integrations
| כלי / Platform | סוג חיבור | מה ניתן לעשות | מקור |
|----------------|-----------|--------------|------|
בדוק: Google Workspace, Microsoft 365, GitHub, Slack, Notion, Figma, Zapier, Make, n8n, VS Code, Chrome Extension

### MCP Support
- MCP Client (יכול להתחבר לservers): ✅/❌ | [X]
- MCP Server (ניתן לחבר אליו): ✅/❌ | [X]
- MCP servers מומלצים: [רשימה + לינקים] | [X]

### API
- REST API: ✅/❌ | Endpoint: | [X]
- SDK: Python ✅/❌ | JavaScript ✅/❌ | [X]
- Webhooks: ✅/❌ | [X]
- Rate limits: X req/min, X tokens/min | [X]

---

## פרק 5 — Extensions, Plugins ו-Marketplaces

### Marketplace / Extension Store
- קיים: ✅/❌ | URL: | מספר extensions: | [X]
- Top 5 extensions: [רשימה] | [X]
- פיתוח עצמי: ✅/❌ | framework: | [X]

### GitHub Resources
| Resource | URL | Stars | מה זה | מקור |
|----------|-----|-------|--------|------|
חפש: "awesome-{tool_id}" repos, prompt collections, templates

### תמיכה ב-Agent Frameworks
| Framework | תמיכה | תיעוד | מקור |
|-----------|--------|--------|------|
| LangChain | ✅/❌ | [URL] | [X] |
| LlamaIndex | ✅/❌ | [URL] | [X] |
| CrewAI | ✅/❌ | [URL] | [X] |
| n8n | ✅/❌ | [URL] | [X] |
| Flowise | ✅/❌ | [URL] | [X] |
| Dify.ai | ✅/❌ | [URL] | [X] |

---

## פרק 6 — זמינות ונגישות

| פלטפורמה | זמין | הערות | מקור |
|----------|------|-------|------|
| Web | | | [X] |
| iOS | | | [X] |
| Android | | | [X] |
| Desktop (Win/Mac/Linux) | | | [X] |
| VS Code Extension | | | [X] |
| Chrome Extension | | | [X] |

- זמין בישראל: ✅/❌/⚠️ | [X]
- צורך VPN: כן/לא | [X]
- אימות טלפון ישראלי (+972): עובד/לא עובד | [X]

---

## פרק 7 — תוכניות, תמחור ומגבלות

| תוכנית | מחיר | מה כלול | Hard Limits | מקור |
|--------|------|---------|-------------|------|
| Free | $0 | | | [X] |
| Pro/Plus | $X/חודש | | | [X] |
| Team | $X/user | | | [X] |
| API | $X/1M tokens | input: / output: | | [X] |

מגבלות:
- Rate limits: RPM / RPD / TPM | [X]
- גודל קובץ מקסימלי | [X]
- Context window | [X]
- מתי מתאפס (יומי/חודשי/rolling) | [X]

תשלום ישראלי:
- כרטיס ישראלי: ✅/❌ | [X]
- PayPal: ✅/❌ | [X]
- תשלום בשקלים: ✅/❌ | [X]
- חשבונית VAT ישראלי: ✅/❌ | [X]

---

## פרק 8 — מפת הממשק המלאה

### Navigation / Sidebar
| כפתור (EN) | כפתור (HE) | פעולה | Shortcut | Tier | מקור |
|------------|------------|-------|----------|------|------|
[מלא עבור כל הכפתורים הראשיים]

### Settings
| הגדרה | ערכים | ברירת מחדל | Tier | מקור |
|--------|-------|------------|------|------|
| Temperature | 0.0–2.0 | | | [X] |
| Top P | | | | [X] |
| System Prompt | | | | [X] |
| Context window | | | | [X] |
[הגדרות נוספות]

### Keyboard Shortcuts
| פעולה | Windows/Linux | macOS | מקור |
|--------|--------------|-------|------|
[רשימה מלאה]

### הגדרה מוסתרת שרוב משתמשים מפספסים:
> [טיפ ייחודי]

---

## פרק 9 — שפות ועברית

א) ממשק הכלי בעברית: מלא/חלקי/לא קיים | [X]
ב) רמת הבנת עברית: מלאה/גבוהה/בינונית/בסיסית | [X]
ג) RTL — מציג נכון? בעיות ידועות? | [X]
ד) ניקוד — יכול לכתוב עם ניקוד? | [X]
ה) מגדר זכר/נקבה — עובד נכון? | [X]
ו) שפת הפרומפט האופטימלית:
   □ אנגלית בלבד
   □ עברית מלאה
   □ Prompt באנגלית + "ענה בעברית" בסוף
   □ לא משנה
ז) ירידת איכות בעברית לעומת אנגלית: X% | [X]

---

## פרק 10 — ניהול Tokens וחיסכון

- מונה tokens בממשק: real-time / post / לא קיים | [X]
- Context Window: X tokens = ~X מילים = ~X דפי A4 | [X]
- מה קורה כשמתמלא: | [X]
- Caching: ✅/❌ | איך מפעילים | חיסכון % | [X]
- עלות ממוצעת לפעולות:
  | פעולה | tokens בקירוב | עלות בAPI |
  |--------|--------------|----------|
  | שאלה קצרה (50 מילים) | | |
  | PDF 10 עמ' | | |
  | שיחה 20 הודעות | | |

---

## פרק 11 — אמנות הפרומפט לכלי הזה

### המבנה האופטימלי לפרומפט
```
[ROLE] You are an expert [role].
[TASK] [תיאור המשימה]
[CONTEXT] Background: [רקע]
[FORMAT] Respond as: [bullets/JSON/prose/code]
[CONSTRAINTS] Keep under X words. In Hebrew.
```

### Role Prompting — עובד/לא עובד | [X]
### Chain of Thought ("חשוב צעד אחר צעד") — עוזר/לא עוזר | [X]
### אורך פרומפט מומלץ: קצר/בינוני/מפורט | [X]

### PDF vs. טקסט:
- עד X עמ' → הדבק טקסט
- X+ עמ' → העלה קובץ
- פורמט מועדף: PDF / TXT / MD | [X]

### Magic Prompts / פקודות מיוחדות | [X]

### System Prompt קבוע מומלץ:
```
[system prompt ready-to-use]
```

### מה עובד ✅ / לא עובד ❌ — מאומת:
[לפחות 3 כל אחד]

---

## פרק 12 — יכולות מתקדמות ומקסום

5 פיצ'רים שרוב המשתמשים לא יודעים:
1. | [X]
2. | [X]
3. | [X]
4. | [X]
5. | [X]

Labs / Beta features: | [X]
API tricks — דברים שרק ב-API: | [X]

---

## פרק 13 — ניתוב בתוך האקוסיסטם {ecosystem}

| | {tool_name} | כלי אחי 1 | כלי אחי 2 |
|--|------------|-----------|-----------|
| URL | {link} | | |
| עבור מי | | | |
| Context | | | |
| מחיר | | | |
| מתי עדיף | | | |

**שאלת ההחלטה:** "[שאלה אחת שמכריעה בין הכלים]"

דוגמאות:
- "[מצב A]" → [כלי מומלץ]
- "[מצב B]" → [כלי מומלץ]

---

## פרק 14 — השוואה עם המתחרה הישיר

| | {tool_name} | מתחרה 1 | מתחרה 2 |
|--|------------|---------|---------|
| חוזקה | | | |
| חולשה | | | |
| מחיר | | | |
| Hebrew | | | |
| Context | | | |

**בחר {tool_name} כאשר:** [3 מצבים] | [X]
**בחר המתחרה כאשר:** [3 מצבים] | [X]

---

## פרק 15 — ישראל: מה עובד, מה לא

- זמינות רשמית בישראל: ✅/❌/⚠️ | [X]
- תשלום ישראלי מאומת: | [X]
- פיצ'רים חסומים בישראל: | [X]
- ביצועי עברית — דיווחים מאומתים: | [X]
- בעיות RTL ידועות + workarounds: | [X]
- חוק הגנת הפרטיות הישראלי 1981 + תיקון 13 — עמידה: | [X]
- GDPR compliance: | [X]
- שרתי אחסון: EU / US / ישראל | [X]

---

## מקורות:
[ממוספרים 1–N, לפחות 15]

**עלות מחקר זה:** $[X]
**תאריך מחקר:** {tool_id}
**מתודולוגיה:** Deep Research Framework v2.0
"""

# ── Markdown output template ──────────────────────────────────────────────────
MARKDOWN_TEMPLATE = """# דוח מחקר עמוק: {name}

> **תאריך מחקר**: {date}
> **מתודולוגיה**: Deep Research Framework {methodology_version}
> **מקור API**: Perplexity {model}
> **אקו-סיסטם**: {ecosystem}
> **קישור**: {link}

---

{api_response}

---

*דוח זה נוצר אוטומטית על ידי `deep_researcher.py` — AI Intelligence Hub*
"""

# ── Perplexity API Call ───────────────────────────────────────────────────────
def call_perplexity(prompt: str, model: str = PERPLEXITY_MODEL, system_prompt: str = None) -> dict:
    """Call Perplexity Sonar API and return the full response dict."""
    import requests

    if not PERPLEXITY_API_KEY:
        raise EnvironmentError(
            "PERPLEXITY_API_KEY is not set.\n"
            "Add it to your .env file:\n  PERPLEXITY_API_KEY=pplx-xxxxxxxx"
        )

    if system_prompt is None:
        system_prompt = DEEP_RESEARCH_SYSTEM_PROMPT

    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type":  "application/json",
    }
    payload = {
        "model":    model,
        "messages": [
            {"role": "system",  "content": system_prompt},
            {"role": "user",    "content": prompt},
        ],
        "max_tokens":   8000,
        "temperature":  0.2,   # Low temp = factual, consistent outputs
        "top_p":        0.9,
        "return_citations": True,
        "search_recency_filter": "year",   # Sources from last year — more results
    }

    resp = requests.post(PERPLEXITY_API_URL, headers=headers, json=payload, timeout=120)
    resp.raise_for_status()
    return resp.json()


def extract_content(api_response: dict) -> tuple[str, list[str]]:
    """Extract the markdown text and citations from Perplexity response."""
    choices    = api_response.get("choices", [])
    content    = choices[0]["message"]["content"] if choices else ""
    citations  = api_response.get("citations", [])
    return content, citations


# ── Save report ───────────────────────────────────────────────────────────────
def save_wiki(tool: dict, content: str, citations: list[str], model: str, v2: bool = False) -> Path:
    """Build and save the Markdown wiki file for a tool."""
    tool_id   = tool.get("id", "unknown")
    tool_name = tool.get("name", tool_id)
    ecosystem = tool.get("ecosystem", "עצמאי")
    link      = tool.get("link", "")
    date_str  = datetime.now().strftime("%Y-%m-%d %H:%M")
    methodology_version = "v2.0" if v2 else "v1.0"

    # Append citations block if available
    cit_block = ""
    if citations:
        cit_lines = "\n".join(f"{i+1}. {url}" for i, url in enumerate(citations))
        cit_block = f"\n\n## מקורות\n{cit_lines}"

    full_md = MARKDOWN_TEMPLATE.format(
        name=tool_name,
        date=date_str,
        model=model,
        ecosystem=ecosystem,
        link=link,
        methodology_version=methodology_version,
        api_response=content + cit_block,
    )

    out_path = WIKI_DIR / f"{tool_id}.md"
    out_path.write_text(full_md, encoding="utf-8")
    return out_path


# ── Dry-run mock ─────────────────────────────────────────────────────────────
def dry_run_mock(tool: dict) -> tuple[str, list[str]]:
    """Return a mock response without making an API call."""
    name = tool.get("name", "Tool")
    mock = f"""## 1. תקציר טכני

- **גרסת מודל**: [DRY RUN — לא נשלחה בקשה אמיתית]
- **סוג מודל**: LLM / Multimodal
- **יכולות ליבה**: Content creation, Analysis, Hebrew support
- **Context Window**: N/A

## 2. סקירת ממשק

- **ציון נוחות ניווט**: N/A (Dry Run)
- Temperature: לא נבדק
- Top P: לא נבדק

## 3. ניתוח כלכלי

| גרסה | עלות |
|------|------|
| חינם | חינמי |
| Pro  | $20/חודש |

## 4. לוקליזציה לישראל

- RTL: לא נבדק (Dry Run)
- מגדר עברי: לא נבדק

## 5. מדריך פשוט לבן 13 — {name}

**מה זה?** כלי בינה מלאכותית שעוזר בכל מיני משימות.

## 6. המלצות

- **להטמיע?**: תלוי שימוש
- **Strengths**: יעיל, מהיר, מתקדם
- **Weaknesses**: מחיר, פרטיות, תמיכת עברית חלקית
- **Best Use Case**: כתיבה ועיצוב
"""
    return mock, ["https://example.com/dry-run"]


# ── Main research loop ────────────────────────────────────────────────────────
def research_tool(tool: dict, dry_run: bool = False, fast: bool = False, v2: bool = False) -> dict:
    """Research one tool and save its wiki. Returns a log entry."""
    tool_id   = tool.get("id", "unknown")
    tool_name = tool.get("name", tool_id)
    model     = PERPLEXITY_MODEL_FAST if fast else PERPLEXITY_MODEL

    methodology = "v2.0" if v2 else "v1.0"
    print(f"\n🔍 חוקר: {tool_name} ({tool_id}) | מתדולוגיה: {methodology}")

    try:
        if dry_run:
            content, citations = dry_run_mock(tool)
            print(f"   ✅ [DRY RUN] mock response generated")
        else:
            if v2:
                # v2: split into 2 API calls to overcome 8192 token limit
                sys_prompt = DEEP_RESEARCH_SYSTEM_PROMPT_V2
                prompt_a   = build_v2_research_prompt(tool, part="a")  # Chapters 1-8
                prompt_b   = build_v2_research_prompt(tool, part="b")  # Chapters 9-15

                raw_a = call_perplexity(prompt_a, model, system_prompt=sys_prompt)
                content_a, citations_a = extract_content(raw_a)
                print(f"   ✅ Part A (1-8): {len(content_a)} chars, {len(citations_a)} citations")

                time.sleep(REQUEST_DELAY_SEC)

                raw_b = call_perplexity(prompt_b, model, system_prompt=sys_prompt)
                content_b, citations_b = extract_content(raw_b)
                print(f"   ✅ Part B (9-15): {len(content_b)} chars, {len(citations_b)} citations")

                # Merge
                content    = content_a + "\n\n---\n\n" + content_b
                # Deduplicate citations, keep order
                seen = set()
                citations = []
                for url in (citations_a + citations_b):
                    if url not in seen:
                        seen.add(url)
                        citations.append(url)
                print(f"   📊 Total: {len(content)} chars, {len(citations)} unique citations")
            else:
                prompt     = build_research_prompt(tool)
                sys_prompt = DEEP_RESEARCH_SYSTEM_PROMPT
                raw    = call_perplexity(prompt, model, system_prompt=sys_prompt)
                content, citations = extract_content(raw)
                print(f"   ✅ API response: {len(content)} chars, {len(citations)} citations")

        out_path = save_wiki(tool, content, citations, model, v2=v2)
        print(f"   💾 שמור: {out_path}")

        return {
            "tool_id":    tool_id,
            "tool_name":  tool_name,
            "status":     "success",
            "file":       str(out_path),
            "timestamp":  datetime.now().isoformat(),
        }

    except Exception as exc:
        print(f"   ❌ שגיאה: {exc}")
        return {
            "tool_id":   tool_id,
            "tool_name": tool_name,
            "status":    "error",
            "error":     str(exc),
            "timestamp": datetime.now().isoformat(),
        }


def load_tools(
    category_filter: str | None = None,
    tool_id_filter:  str | None = None,
    limit:           int | None = None,
    skip_existing:   bool       = False,
) -> list[dict]:
    """Load and filter tools from tools_master.json."""
    if not TOOLS_PATH.exists():
        sys.exit(f"❌ tools_master.json not found at {TOOLS_PATH}")

    data  = json.loads(TOOLS_PATH.read_text(encoding="utf-8"))
    tools = data.get("tools", [])

    if tool_id_filter:
        tools = [t for t in tools if t.get("id") == tool_id_filter]
    if category_filter:
        tools = [t for t in tools if t.get("category") == category_filter]
    if skip_existing:
        tools = [t for t in tools if not (WIKI_DIR / f"{t['id']}.md").exists()]
    if limit:
        tools = tools[:limit]

    return tools


def save_log(log_entries: list[dict]) -> None:
    """Append results to the research log JSON."""
    existing = []
    if LOG_PATH.exists():
        try:
            existing = json.loads(LOG_PATH.read_text(encoding="utf-8"))
        except json.JSONDecodeError:
            pass
    existing.extend(log_entries)
    LOG_PATH.write_text(json.dumps(existing, ensure_ascii=False, indent=2), encoding="utf-8")


# ── CLI ───────────────────────────────────────────────────────────────────────
def parse_args():
    p = argparse.ArgumentParser(
        description="Deep Research Agent — חוקר כלי AI אוטומטי",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
דוגמאות שימוש:
  python deep_researcher.py                       # חקור את כל הכלים
  python deep_researcher.py --tool claude         # כלי ספציפי
  python deep_researcher.py --category שיווק      # קטגוריה שלמה
  python deep_researcher.py --limit 5             # 5 כלים ראשונים
  python deep_researcher.py --skip-existing       # דלג על כלים שכבר נחקרו
  python deep_researcher.py --dry-run             # בדיקה ללא API
  python deep_researcher.py --fast                # Sonar (זול יותר, מהיר יותר)
  python deep_researcher.py --delay 3.0           # 3 שניות בין בקשות
        """,
    )
    p.add_argument("--tool",          type=str,   help="ID של כלי ספציפי")
    p.add_argument("--category",      type=str,   help="קטגוריה לחקור")
    p.add_argument("--limit",         type=int,   help="מקסימום כמות כלים")
    p.add_argument("--skip-existing", action="store_true", help="דלג על כלים שכבר יש להם wiki")
    p.add_argument("--dry-run",       action="store_true", help="בדיקה ללא קריאת API")
    p.add_argument("--fast",          action="store_true", help="השתמש ב-Sonar (מהיר וזול יותר)")
    p.add_argument("--v2",            action="store_true", help="השתמש במתדולוגיית מחקר v2.0 (15 פרקים)")
    p.add_argument("--delay",         type=float, default=REQUEST_DELAY_SEC, help="שניות בין בקשות")
    return p.parse_args()


def main():
    args  = parse_args()
    tools = load_tools(
        category_filter = args.category,
        tool_id_filter  = args.tool,
        limit           = args.limit,
        skip_existing   = args.skip_existing,
    )

    if not tools:
        print("❌ לא נמצאו כלים להתאמה.")
        sys.exit(1)

    model_label = "Sonar (fast)" if args.fast else "Sonar-Pro (deep)"
    print(f"\n{'='*60}")
    print(f"🚀 Deep Research Agent — {model_label}")
    print(f"📦 כלים לחקור: {len(tools)}")
    print(f"💾 שמירה ב: {WIKI_DIR}")
    print(f"⏱  השהיה בין בקשות: {args.delay}s")
    if args.dry_run:
        print("🧪 DRY RUN — לא נשלחות בקשות API")
    print(f"{'='*60}")

    if not args.dry_run and not PERPLEXITY_API_KEY:
        print("\n⚠️  PERPLEXITY_API_KEY לא מוגדר!")
        print("   פתח את קובץ .env והוסף:")
        print("   PERPLEXITY_API_KEY=pplx-xxxxxxxxxxxxxxxx")
        print("   (קבל מפתח בחינם: https://www.perplexity.ai/settings/api)\n")
        sys.exit(1)

    log_entries = []
    for i, tool in enumerate(tools):
        entry = research_tool(tool, dry_run=args.dry_run, fast=args.fast, v2=args.v2)
        log_entries.append(entry)

        if i < len(tools) - 1 and not args.dry_run:
            time.sleep(args.delay)

    save_log(log_entries)

    # ── Summary ──
    success = sum(1 for e in log_entries if e["status"] == "success")
    errors  = sum(1 for e in log_entries if e["status"] == "error")

    print(f"\n{'='*60}")
    print(f"✅ הצלחות: {success}  |  ❌ שגיאות: {errors}  |  סה\"כ: {len(log_entries)}")
    print(f"📋 לוג שמור ב: {LOG_PATH}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
