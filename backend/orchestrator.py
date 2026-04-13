"""
AI Intelligence Hub — Orchestrator
====================================
מנוע ההמלצות המרכזי. מקבל תיאור משימה מהמשתמש,
מתאים אותה לכלים ממאגר tools_master.json,
ובונה System Message שמנחה את ה-AI לשאול שאלות הבהרה בעברית
לפני שהוא נותן המלצה מדויקת.
"""

import json
import re
from pathlib import Path
from typing import Optional

TOOLS_PATH    = Path(__file__).parent / "data" / "tools_master.json"
PROJECTS_PATH = Path(__file__).parent / "data" / "user_projects.json"

# ─── מיפוי מילות מפתח לקטגוריות ─────────────────────────────────────────────
CATEGORY_KEYWORDS: dict[str, list[str]] = {
    "מצגות": [
        "מצגת", "פרזנטציה", "שקופית", "שקופיות", "presentation", "slides",
        "deck", "powerpoint", "גוגל סליידס",
    ],
    "מודלי שפה / צ'אטבוטים": [
        "כתיבה", "תוכן", "מאמר", "טקסט", "שאלות", "צ'אט", "בלוג",
        "ניסוח", "סיכום", "תרגום", "copywriting",
    ],
    "וידאו ועריכה": [
        "סרטון", "וידאו", "עריכה", "קליפ", "animation", "אנימציה",
        "ריל", "יוטיוב", "tiktok", "שידור",
    ],
    "יצירת תמונות": [
        "תמונה", "גרפיקה", "ויזואל", "image", "אילוסטרציה",
        "עיצוב", "לוגו", "ממ", "thumbnail", "תמונות",
    ],
    "אוטומציות": [
        "אוטומציה", "זרימה", "workflow", "אינטגרציה", "בוט",
        "חיבור", "api", "תהליך אוטומטי",
    ],
    "שיווק": [
        "שיווק", "פרסום", "קמפיין", "מודעה", "סושיאל", "מדיה חברתית",
        "אינסטגרם", "פייסבוק", "לינקדאין", "אימייל", "ניוזלטר",
    ],
    "No-Code / פיתוח": [
        "אפליקציה", "אתר", "קוד", "פיתוח", "app", "landing page",
        "דף נחיתה", "ווב", "frontend", "backend",
    ],
    "פרודוקטיביות": [
        "ניהול", "משימות", "פגישה", "לוח זמנים", "ארגון",
        "מעקב", "מנוי", "notion", "יעילות",
    ],
    "אודיו ומוזיקה": [
        "מוזיקה", "שיר", "אודיו", "קריינות", "פודקאסט",
        "הקלטה", "sound", "voice", "tts",
    ],
    "למידה ומחקר": [
        "מחקר", "לימוד", "מאמר", "ניתוח", "מידע", "אקדמי",
        "מדע", "flashcards", "כרטיסיות", "ספר",
    ],
    "עיצוב גרפי": [
        "עיצוב גרפי", "ברנד", "זהות מותג", "לוגו", "אינפוגרפיקה",
        "canva", "illustrator", "vector",
    ],
    "אימון מודלים חזותיים": [
        "פנים", "אוואטר", "דמות", "פורטרט", "headshotpro",
        "תמונת פרופיל", "fine-tune", "lora",
    ],
}

# שאלות ייחודיות לפי קטגוריה
CATEGORY_CLARIFYING: dict[str, str] = {
    "מצגות":                   "האם המצגת מיועדת לקהל עסקי, אקדמי, או שיווקי?",
    "וידאו ועריכה":            "מה אורך הסרטון המתוכנן, ובאיזו פלטפורמה הוא יפורסם?",
    "יצירת תמונות":            "האם התמונות מיועדות לשימוש מסחרי, ובאיזה סגנון?",
    "שיווק":                   "באיזו רשת חברתית מתמקד הקמפיין?",
    "No-Code / פיתוח":         "האם יש לך ניסיון בכתיבת קוד?",
    "אוטומציות":               "אילו מערכות/אפליקציות אתה רוצה לחבר?",
    "אודיו ומוזיקה":           "האם זה לשימוש אישי או מסחרי?",
    "למידה ומחקר":             "על איזה תחום המחקר מתמקד?",
    "פרודוקטיביות":            "כמה אנשים בצוות שלך?",
    "מודלי שפה / צ'אטבוטים":  "מה אורך ותדירות התוכן שאתה מתכנן לייצר?",
    "עיצוב גרפי":              "מה רמת הניסיון שלך בעיצוב גרפי?",
    "אימון מודלים חזותיים":   "כמה תמונות יש לך זמינות להכשרת המודל?",
}


# ─── טעינת נתונים ─────────────────────────────────────────────────────────────

def load_tools() -> list[dict]:
    with open(TOOLS_PATH, encoding="utf-8") as f:
        return json.load(f)["tools"]


def load_projects() -> dict:
    if not PROJECTS_PATH.exists():
        return {"projects": []}
    with open(PROJECTS_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_projects(data: dict) -> None:
    with open(PROJECTS_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ─── התאמת קטגוריות ───────────────────────────────────────────────────────────

def match_categories(task: str) -> list[str]:
    """
    סורק את תיאור המשימה ומחזיר רשימה של קטגוריות רלוונטיות.
    אם לא נמצא כלום — מחזיר 3 קטגוריות ברירת מחדל.
    """
    task_lower = task.lower()
    matched: list[str] = []
    scores: dict[str, int] = {}

    for category, keywords in CATEGORY_KEYWORDS.items():
        score = sum(1 for kw in keywords if kw in task_lower)
        if score > 0:
            scores[category] = score

    # ממיין לפי רלוונטיות יורדת
    matched = sorted(scores, key=lambda c: scores[c], reverse=True)
    return matched if matched else ["מצגות", "מודלי שפה / צ'אטבוטים", "יצירת תמונות"]


def get_tools_for_categories(categories: list[str], tools: list[dict], limit: int = 10) -> list[dict]:
    matched = [t for t in tools if t["category"] in categories]
    # מעדיף כלים שמופיעים בשני המקורות ובעלי דירוג גבוה
    def sort_key(t: dict) -> tuple:
        source_score = 2 if t["source"] == "A+B" else 1
        rating_score = len(t["rating"]) if t["rating"] else 0
        return (source_score, rating_score)
    return sorted(matched, key=sort_key, reverse=True)[:limit]


# ─── בניית System Message ──────────────────────────────────────────────────────

def build_system_message(task: str, matched_tools: list[dict], categories: list[str]) -> str:
    """
    בונה System Message עשיר שמכיל:
    1. הקשר — מה המשתמש ביקש
    2. כלים רלוונטיים ממאגר tools_master.json
    3. הוראות ל-AI: שאל שאלות → המלץ
    """
    tools_block = "\n".join(
        f"  • {t['name']} ({t['category']}) | עברית: {t['hebrew_support']} | "
        f"עלות: {t['cost']} | דירוג: {t['rating'] or 'לא דורג'}\n"
        f"    {t['description'][:100]}"
        for t in matched_tools[:8]
    )

    categories_str = ", ".join(categories[:4])

    return f"""אתה מומחה לכלי בינה מלאכותית ומשמש כיועץ אישי לבחירת הכלים הנכונים.

=== פרטי המשימה ===
המשתמש ביקש: "{task}"
קטגוריות שזוהו: {categories_str}

=== כלים רלוונטיים ממאגר הנתונים ===
{tools_block}

=== כללי עבודה ===
שלב 1 — שאלות הבהרה:
  - שאל בדיוק 2-3 שאלות הבהרה בעברית לפני כל המלצה.
  - השאלות יתמקדו ב: רמת ניסיון טכני, תקציב, ומטרה עיקרית.
  - הצג את השאלות כרשימה ממוספרת.

שלב 2 — לאחר קבלת תשובות:
  - המלץ על 2-3 כלים ספציפיים מהמאגר.
  - לכל כלי: שם, למה הוא מתאים, עלות, ותמיכה בעברית.
  - הוסף טיפ קצר לתחילת העבודה.

כללים כלליים:
  - ענה תמיד בעברית בלבד.
  - היה ידידותי, ממוקד, ומקצועי.
  - אל תמציא כלים שאינם ברשימה.
"""


# ─── יצירת שאלות הבהרה ────────────────────────────────────────────────────────

def generate_clarifying_questions(task: str, categories: list[str]) -> list[str]:
    base = [
        "מה רמת הניסיון הטכני שלך? (מתחיל / בינוני / מתקדם)",
        "מה התקציב שלך לכלי? (חינם בלבד / עד 50$ לחודש / ללא הגבלה)",
    ]
    specific = next(
        (CATEGORY_CLARIFYING[cat] for cat in categories if cat in CATEGORY_CLARIFYING),
        "מה המטרה העיקרית — חיסכון בזמן, שיפור איכות, או הפחתת עלויות?"
    )
    return base + [specific]


def generate_recommendation(answers: str, project: dict, tools: list[dict]) -> str:
    """
    לאחר שהמשתמש ענה על שאלות ההבהרה — מייצר המלצה ממוקדת.
    בשלב זה יחליף ה-LLM האמיתי את הלוגיקה הזו.
    """
    categories = project.get("matched_categories", [])
    relevant_tools = get_tools_for_categories(categories, tools, limit=3)

    if not relevant_tools:
        return "לא נמצאו כלים מתאימים במאגר. נסה לתאר את המשימה בצורה אחרת."

    rec_lines = []
    for i, t in enumerate(relevant_tools, 1):
        heb = "✅ תומך בעברית" if t["hebrew_support"] == "תומך" else "⚠️ תמיכה חלקית בעברית"
        rec_lines.append(
            f"**{i}. {t['name']}**\n"
            f"   📌 {t['description'][:120]}\n"
            f"   💰 עלות: {t['cost']}  |  {heb}  |  דירוג: {t['rating'] or '—'}\n"
        )

    recommendations = "\n".join(rec_lines)
    return (
        f"בהתבסס על התשובות שלך, הנה ההמלצות המותאמות אישית:\n\n"
        f"{recommendations}\n"
        f"💡 **טיפ:** התחל עם הכלי הראשון ברשימה — הוא המתאים ביותר לצרכים שתיארת. "
        f"תוכל תמיד לחזור ולשנות את הבחירה לאחר ניסיון ראשוני."
    )


# ─── נקודת כניסה ראשית ─────────────────────────────────────────────────────────

def orchestrate(task: str) -> dict:
    """
    מקבל תיאור משימה ומחזיר:
    - system_message: להזנה ל-LLM
    - matched_categories: קטגוריות שזוהו
    - matched_tools: כלים רלוונטיים
    - clarifying_questions: שאלות הבהרה ראשוניות
    """
    tools = load_tools()
    categories = match_categories(task)
    matched_tools = get_tools_for_categories(categories, tools)
    system_message = build_system_message(task, matched_tools, categories)
    questions = generate_clarifying_questions(task, categories)

    return {
        "system_message": system_message,
        "matched_categories": categories,
        "matched_tools": matched_tools,
        "clarifying_questions": questions,
    }
