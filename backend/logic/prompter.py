"""
prompter.py — Master Prompt Builder for the AI Intelligence Hub.

Generates the system prompt used by the orchestrator when calling an LLM.
The prompt instructs the AI to explain workflows as if talking to a 13-year-old,
pick the user's best available tool as the "Master Brain", and spell out every
hand-off between tools clearly.
"""

from __future__ import annotations
import json
import os
from typing import Any

# ── Path helpers ───────────────────────────────────────────────────────────────
_DATA_DIR = os.path.join(os.path.dirname(__file__), "..", "data")
_MY_TOOLS_PATH = os.path.join(_DATA_DIR, "my_tools.json")


def _load_my_tools() -> dict[str, Any]:
    with open(_MY_TOOLS_PATH, encoding="utf-8") as f:
        return json.load(f)


# ── Capability ranking — higher = stronger "Master Brain" candidate ────────────
_MASTER_BRAIN_RANK: dict[str, dict[str, int]] = {
    "google": {
        "free": 1,
        "gemini_advanced": 3,
        "ai_studio": 4,
        "vertex_ai": 5,
    },
    "anthropic": {
        "free": 1,
        "claude_pro": 4,
        "claude_api": 5,
    },
    "openai": {
        "free": 1,
        "plus": 3,
        "team_enterprise": 5,
    },
    "perplexity": {
        "free": 1,
        "pro": 2,
    },
}

_PROVIDER_NAMES: dict[str, str] = {
    "google": "Google Gemini",
    "anthropic": "Claude (Anthropic)",
    "openai": "ChatGPT (OpenAI)",
    "perplexity": "Perplexity AI",
}

_PLAN_DISPLAY: dict[str, dict[str, str]] = {
    "google": {
        "free": "Gemini Free",
        "gemini_advanced": "Gemini Advanced",
        "ai_studio": "AI Studio",
        "vertex_ai": "Vertex AI / Nano Banana",
    },
    "anthropic": {
        "free": "Claude Free",
        "claude_pro": "Claude Pro",
        "claude_api": "Claude API",
    },
    "openai": {
        "free": "ChatGPT Free",
        "plus": "ChatGPT Plus",
        "team_enterprise": "ChatGPT Team / Enterprise",
    },
    "perplexity": {
        "free": "Perplexity Free",
        "pro": "Perplexity Pro",
    },
}


# ── Public API ─────────────────────────────────────────────────────────────────

def pick_master_brain(subscriptions: dict[str, str]) -> tuple[str, str]:
    """
    Return (provider_key, plan_key) of the highest-ranked tool the user owns.
    Falls back to ('openai', 'free') if nothing is configured.
    """
    best_provider = "openai"
    best_plan = "free"
    best_score = 0

    for provider, plan in subscriptions.items():
        score = _MASTER_BRAIN_RANK.get(provider, {}).get(plan, 0)
        if score > best_score:
            best_score = score
            best_provider = provider
            best_plan = plan

    return best_provider, best_plan


def build_system_prompt(
    task: str,
    matched_tools: list[dict[str, Any]],
    subscriptions: dict[str, str] | None = None,
) -> str:
    """
    Build the full system prompt that is sent to the LLM.

    Args:
        task:          Raw task description from the user.
        matched_tools: List of tool dicts from tools_master.json.
        subscriptions: Dict of {provider: plan} from my_tools.json.
                       If None, loads from file automatically.

    Returns:
        A rich, structured system prompt string.
    """
    if subscriptions is None:
        db = _load_my_tools()
        subscriptions = db.get("subscriptions", {})

    master_provider, master_plan = pick_master_brain(subscriptions)
    master_name = _PROVIDER_NAMES.get(master_provider, master_provider)
    master_plan_label = _PLAN_DISPLAY.get(master_provider, {}).get(master_plan, master_plan)

    # Build the active-tools summary shown in the prompt
    active_tools_lines: list[str] = []
    for prov, plan in subscriptions.items():
        if plan == "free":
            continue  # Free plans are available but not highlighted
        label = _PLAN_DISPLAY.get(prov, {}).get(plan, plan)
        prov_name = _PROVIDER_NAMES.get(prov, prov)
        active_tools_lines.append(f"  • {prov_name}: {label}")

    active_tools_section = (
        "\n".join(active_tools_lines)
        if active_tools_lines
        else "  • רק גרסאות חינמיות זמינות"
    )

    # Summarise matched tools
    tool_lines: list[str] = []
    for t in matched_tools[:8]:
        heb = "✅ עברית" if t.get("hebrew_support") == "תומך" else "⚠️ אנגלית"
        tool_lines.append(
            f"  - {t['name']} ({t['category']}) | {t['cost']} | {heb}"
        )
    tools_section = "\n".join(tool_lines) if tool_lines else "  - אין נתונים"

    prompt = f"""אתה יועץ AI חכם שמתמחה בבחירת כלי בינה מלאכותית.
המשתמש שלך הוא אדם רגיל — לא מתכנת. הסבר הכול בצורה פשוטה, כאילו אתה מדבר עם ילד בן 13.

═══════════════════════════════════════════
📌 המשימה של המשתמש:
{task}

═══════════════════════════════════════════
🧰 ארגז הכלים הפעיל של המשתמש (מנויים בתשלום):
{active_tools_section}

🏆 ה-"Master Brain" שלך (הכלי הכי חזק שיש למשתמש):
  ► {master_name} — {master_plan_label}
  זה הכלי שיעשה את "המוח" של הפרויקט — מיישב החלטות, מנסח, ומנהל.

🔧 כלים רלוונטיים מהמאגר:
{tools_section}

═══════════════════════════════════════════
📋 הוראות לתשובה שלך — חובה לפעול לפי הסדר:

1. **ניתוח המשימה**
   - פרק את המשימה ל-3–5 שלבים קטנים וברורים.
   - לכל שלב: מה עושים, עם איזה כלי, ולמה.

2. **בחירת Master Brain**
   - הצג בברור מי ה-Master Brain (={master_name}).
   - הסבר למה דווקא הוא — מה היתרון שלו על פני האחרים.

3. **הסבר כל העברת נתונים (Hand-off)**
   - בכל פעם שמעבירים קובץ/תוצר בין כלי לכלי, הסבר:
     * מה מעבירים (קובץ? טקסט? תמונה?)
     * איך מעבירים (גרור? קישור? API?)
     * איזה "Connector" יכול לעזור (Google Drive / GitHub / Base44 / Zapier)
   - דבר בשפה של ילד בן 13: "לוקחים את הקובץ מכאן ומעלים אותו לשם".

4. **המלצת כלים**
   - המלץ על 2–3 כלים ספציפיים מהמאגר לעיל.
   - ציין: שם, למה זה מתאים, מחיר, ואם יש תמיכה בעברית.

5. **טיפ אחד של זהב**
   - משפט אחד שיחסוך למשתמש הכי הרבה זמן.

═══════════════════════════════════════════
⚠️ כללי ברזל:
- אל תשתמש במונחים טכניים בלי להסביר אותם מיד.
- אל תמליץ על כלי שהמשתמש לא מנוי אליו אם יש חלופה חינמית טובה.
- עדף כלים שתומכים בעברית.
- כתוב בעברית בלבד, קצר וממוקד.
"""
    return prompt


def build_followup_prompt(user_answer: str, previous_questions: list[str]) -> str:
    """
    Build a short follow-up prompt after the user answers clarifying questions.
    """
    qs = "\n".join(f"  {i+1}. {q}" for i, q in enumerate(previous_questions))
    return f"""המשתמש ענה על שאלות ההבהרה שלך.

שאלות שנשאלו:
{qs}

תשובת המשתמש:
{user_answer}

כעת צור המלצה מלאה לפי הוראות ה-Master Prompt.
זכור: דבר בפשטות, פרק לשלבים, הסבר כל העברת נתונים."""
