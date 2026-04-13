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

# ── Markdown output template ──────────────────────────────────────────────────
MARKDOWN_TEMPLATE = """# דוח מחקר עמוק: {name}

> **תאריך מחקר**: {date}
> **מתודולוגיה**: Deep Research Framework v1.0
> **מקור API**: Perplexity {model}
> **אקו-סיסטם**: {ecosystem}
> **קישור**: {link}

---

{api_response}

---

*דוח זה נוצר אוטומטית על ידי `deep_researcher.py` — AI Intelligence Hub*
"""

# ── Perplexity API Call ───────────────────────────────────────────────────────
def call_perplexity(prompt: str, model: str = PERPLEXITY_MODEL) -> dict:
    """Call Perplexity Sonar API and return the full response dict."""
    import requests

    if not PERPLEXITY_API_KEY:
        raise EnvironmentError(
            "PERPLEXITY_API_KEY is not set.\n"
            "Add it to your .env file:\n  PERPLEXITY_API_KEY=pplx-xxxxxxxx"
        )

    headers = {
        "Authorization": f"Bearer {PERPLEXITY_API_KEY}",
        "Content-Type":  "application/json",
    }
    payload = {
        "model":    model,
        "messages": [
            {"role": "system",  "content": DEEP_RESEARCH_SYSTEM_PROMPT},
            {"role": "user",    "content": prompt},
        ],
        "max_tokens":   4096,
        "temperature":  0.2,   # Low temp = factual, consistent outputs
        "top_p":        0.9,
        "return_citations": True,
        "search_recency_filter": "month",  # Only sources from last month
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
def save_wiki(tool: dict, content: str, citations: list[str], model: str) -> Path:
    """Build and save the Markdown wiki file for a tool."""
    tool_id   = tool.get("id", "unknown")
    tool_name = tool.get("name", tool_id)
    ecosystem = tool.get("ecosystem", "עצמאי")
    link      = tool.get("link", "")
    date_str  = datetime.now().strftime("%Y-%m-%d %H:%M")

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
def research_tool(tool: dict, dry_run: bool = False, fast: bool = False) -> dict:
    """Research one tool and save its wiki. Returns a log entry."""
    tool_id   = tool.get("id", "unknown")
    tool_name = tool.get("name", tool_id)
    model     = PERPLEXITY_MODEL_FAST if fast else PERPLEXITY_MODEL

    print(f"\n🔍 חוקר: {tool_name} ({tool_id})")

    try:
        if dry_run:
            content, citations = dry_run_mock(tool)
            print(f"   ✅ [DRY RUN] mock response generated")
        else:
            prompt = build_research_prompt(tool)
            raw    = call_perplexity(prompt, model)
            content, citations = extract_content(raw)
            print(f"   ✅ API response: {len(content)} chars, {len(citations)} citations")

        out_path = save_wiki(tool, content, citations, model)
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
        entry = research_tool(tool, dry_run=args.dry_run, fast=args.fast)
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
