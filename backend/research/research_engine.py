"""
Research Engine — Deep AI Tool Evaluation Agent
מבוסס על מתודולוגיית מחקר מקיפה מ-methodology_master.md
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field, asdict
from typing import Optional
from datetime import date

# ── Paths ─────────────────────────────────────────────────────────────────────
_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TOOLS_MASTER_PATH  = os.path.join(_ROOT, "data", "tools_master.json")
MY_TOOLS_PATH      = os.path.join(_ROOT, "data", "my_tools.json")
REPORTS_DIR        = os.path.join(_ROOT, "research", "reports")

os.makedirs(REPORTS_DIR, exist_ok=True)


# ══════════════════════════════════════════════════════════════════════════════
# § 1  DATA STRUCTURES — Research Template (page 7 of methodology PDF)
# ══════════════════════════════════════════════════════════════════════════════

@dataclass
class TechnicalSummary:
    """חלק 1 — תקציר טכני"""
    model_version:    str = ""          # e.g. "GPT-4o", "Claude 3.5 Sonnet"
    model_type:       str = ""          # LLM / Multimodal / Vision / Audio
    core_capabilities: list[str] = field(default_factory=list)  # ["Coding", "Writing", ...]


@dataclass
class UIParameter:
    """רשומה בודדת לפרמטר ממשק"""
    available:     bool           = False
    default_value: Optional[str]  = None   # e.g. "1.0", "0.9"
    location:      str            = ""     # "Chat UI" / "API only" / "Playground"
    notes:         str            = ""


@dataclass
class UISettingsAudit:
    """חלק 2 — סקירת ממשק והגדרות (6 הפרמטרים הקריטיים)"""
    nav_score:          int          = 0    # 1–10 ניחוד ניווט
    # ── 6 critical parameters ──────────────────────────────────────────────
    temperature:        UIParameter  = field(default_factory=UIParameter)
    top_p:              UIParameter  = field(default_factory=UIParameter)
    frequency_penalty:  UIParameter  = field(default_factory=UIParameter)
    presence_penalty:   UIParameter  = field(default_factory=UIParameter)
    stop_sequences:     UIParameter  = field(default_factory=UIParameter)
    logit_bias:         UIParameter  = field(default_factory=UIParameter)
    # ── Additional UI flags ─────────────────────────────────────────────────
    system_instructions: str         = ""  # "קיימות" / "לא קיימות" / "API בלבד"
    streaming:           bool        = False
    playground_url:      str         = ""


@dataclass
class TierEconomics:
    cost_per_1m_tokens: str = ""   # e.g. "חינם", "$5"
    rpm_limit:          str = ""   # requests per minute
    context_window:     str = ""   # e.g. "200K טוקן"


@dataclass
class EconomicsAudit:
    """חלק 3 — ניתוח כלכלי ומגבלות"""
    free:    TierEconomics = field(default_factory=TierEconomics)
    pro:     TierEconomics = field(default_factory=TierEconomics)


@dataclass
class StressTestResult:
    passed:  Optional[bool] = None   # True / False / None (not run)
    score:   Optional[str]  = None   # e.g. "94%", "87ms avg"
    notes:   str            = ""


@dataclass
class StressTestResults:
    """חלק 4 — תוצאות מבחני מאמץ (5 מבחנים חובה)"""
    perturbation:       StressTestResult = field(default_factory=StressTestResult)
    morphology:         StressTestResult = field(default_factory=StressTestResult)
    proof_grid:         StressTestResult = field(default_factory=StressTestResult)
    phonemic_ambiguity: StressTestResult = field(default_factory=StressTestResult)
    load_accuracy:      StressTestResult = field(default_factory=StressTestResult)


@dataclass
class IsraeliLocalization:
    """חלק 5 — לוקליזציה לישראל"""
    rtl_support:           bool  = False
    rtl_issues:            str   = ""    # פירוט בעיות תצוגה
    privacy_law_1981:      bool  = False # עמידה בחוק הגנת הפרטיות הישראלי
    masav_support:         bool  = False # תמיכה בפורמט MASAV
    hebrew_gender_quality: str   = ""    # תיאור איכות מגדר בעברית
    gender_error_rate:     Optional[str] = None  # e.g. "~38%"


@dataclass
class FinalRecommendation:
    """חלק 6 — מסקנות והמלצות"""
    integrate:    str         = ""        # "כן" / "לא" / "תלוי שימוש"
    strengths:    list[str]   = field(default_factory=list)
    weaknesses:   list[str]   = field(default_factory=list)
    best_use_case: str        = ""
    secret_prompts: list[str] = field(default_factory=list)  # "נוסחאות סודיות"


@dataclass
class ToolResearchReport:
    """
    תבנית המחקר המלאה — 6 חלקים
    כל כלי שנחקר צריך למלא את כל 6 החלקים.
    """
    tool_id:     str
    tool_name:   str
    research_date: str = field(default_factory=lambda: date.today().isoformat())
    researcher:    str = "research_engine_v1"

    # ── 6 template sections ───────────────────────────────────────────────
    technical_summary:  TechnicalSummary  = field(default_factory=TechnicalSummary)
    ui_audit:           UISettingsAudit   = field(default_factory=UISettingsAudit)
    economics:          EconomicsAudit    = field(default_factory=EconomicsAudit)
    stress_tests:       StressTestResults = field(default_factory=StressTestResults)
    localization:       IsraeliLocalization = field(default_factory=IsraeliLocalization)
    recommendation:     FinalRecommendation = field(default_factory=FinalRecommendation)

    # ── Meta fields ───────────────────────────────────────────────────────
    shallow_research_flag: bool = False  # True אם המחקר חסר פרמטרים קריטיים
    missing_fields:        list[str] = field(default_factory=list)


# ══════════════════════════════════════════════════════════════════════════════
# § 2  KNOWN PARAMETERS DATABASE
#      מאגר ידע על הפרמטרים של כל כלי — מקור: תיעוד רשמי + בדיקות ידניות
# ══════════════════════════════════════════════════════════════════════════════

# Structure:
#   tool_id → {
#     "technical": {...},
#     "ui": { param_name: {available, default, location, notes} },
#     "system_instructions": str,
#     "streaming": bool,
#     "playground_url": str,
#     "free": TierEconomics fields,
#     "pro": TierEconomics fields,
#     "localization": {...},
#     "strengths": [...],
#     "weaknesses": [...],
#     "best_use_case": str,
#   }

_KNOWN_PARAMS: dict = {

    "claude": {
        "technical": {
            "model_version": "Claude 3.5 Sonnet / Claude 3 Opus",
            "model_type": "LLM + Vision",
            "core_capabilities": ["Content creation", "Coding", "Document analysis", "Long-context reasoning"],
        },
        "ui": {
            "temperature":       {"available": True,  "default": "1.0",  "location": "API / Console", "notes": "ממשק הצ'אט הרגיל אינו חושף פרמטר זה"},
            "top_p":             {"available": True,  "default": "0.999","location": "API בלבד",       "notes": "לא מומלץ לשנות יחד עם Temperature"},
            "frequency_penalty": {"available": False, "default": None,   "location": "לא זמין",       "notes": "Anthropic מיישמת מנגנון ענישה פנימי שונה"},
            "presence_penalty":  {"available": False, "default": None,   "location": "לא זמין",       "notes": "לא נחשף ב-API הרשמי"},
            "stop_sequences":    {"available": True,  "default": "[]",   "location": "API",           "notes": "עד 8192 תווים, מאפשר הגדרת סיומות מותאמות"},
            "logit_bias":        {"available": False, "default": None,   "location": "לא זמין",       "notes": "לא נתמך ב-Anthropic API (בשונה מ-OpenAI)"},
        },
        "system_instructions": "קיימות — שדה system ייעודי ב-API, גם ב-Projects (ממשק Pro)",
        "streaming": True,
        "playground_url": "https://console.anthropic.com",
        "nav_score": 8,
        "free": {"cost_per_1m_tokens": "חינם (מגבלה יומית)", "rpm_limit": "~5",   "context_window": "200K"},
        "pro":  {"cost_per_1m_tokens": "20$/חודש (Sonnet+Opus)", "rpm_limit": "מוגבר", "context_window": "200K"},
        "localization": {
            "rtl_support": True, "rtl_issues": "ממשק LTR — הטקסט מוצג RTL אך הממשק עצמו LTR",
            "privacy_law_1981": False, "masav_support": False,
            "hebrew_gender_quality": "איכות גבוהה יחסית — שיעור שגיאת מגדר ~30–35%",
            "gender_error_rate": "~32%",
        },
        "strengths": ["כתיבה מורכבת", "קוד ארגוני", "ניתוח מסמכים ארוכים", "Context window 200K"],
        "weaknesses": ["ללא חיפוש אינטרנט בצ'אט", "Logit Bias לא זמין", "ממשק LTR"],
        "best_use_case": "כתיבת מסמכים מורכבים, קוד, ניתוח PDF",
        "secret_prompts": [
            "\"חשוב שלב אחר שלב ותסביר כל הנחה\" — מפעיל reasoning מעמיק",
            "\"אתה עורך לשוני מקצועי בעברית\" ב-System Prompt — מעלה רמת עברית",
        ],
        "integrate": "כן",
    },

    "chatgpt": {
        "technical": {
            "model_version": "GPT-4o / o1-preview / o1-mini",
            "model_type": "LLM + Vision + Audio",
            "core_capabilities": ["Content creation", "Coding", "Image generation (DALL-E)", "Web browsing", "Data Analysis"],
        },
        "ui": {
            "temperature":       {"available": True,  "default": "1.0",  "location": "API + Playground", "notes": "זמין ב-API; ב-Playground מוסתר מאחורי 'Advanced'"},
            "top_p":             {"available": True,  "default": "1.0",  "location": "API + Playground", "notes": "אזהרה ב-Playground: אל תשנה יחד עם Temperature"},
            "frequency_penalty": {"available": True,  "default": "0.0",  "location": "API + Playground", "notes": "מפחית חזרתיות verbatim — שימושי מאוד לתוכן ארוך"},
            "presence_penalty":  {"available": True,  "default": "0.0",  "location": "API + Playground", "notes": "מעודד הכנסת נושאים חדשים לשיחה"},
            "stop_sequences":    {"available": True,  "default": "[]",   "location": "API",             "notes": "עד 4 רצפי עצירה"},
            "logit_bias":        {"available": True,  "default": "{}",   "location": "API בלבד",        "notes": "ערכים -100 עד 100, מאפשר להגביל/לעודד טוקנים ספציפיים"},
        },
        "system_instructions": "קיימות — System Prompt מלא ב-API ו-GPTs; Custom Instructions בממשק הצ'אט",
        "streaming": True,
        "playground_url": "https://platform.openai.com/playground",
        "nav_score": 9,
        "free": {"cost_per_1m_tokens": "חינם (GPT-4o mini)", "rpm_limit": "~20",   "context_window": "128K"},
        "pro":  {"cost_per_1m_tokens": "20$/חודש (Plus)",    "rpm_limit": "~80",   "context_window": "128K"},
        "localization": {
            "rtl_support": True, "rtl_issues": "ממשק LTR עם תמיכה RTL סבירה לטקסט",
            "privacy_law_1981": False, "masav_support": False,
            "hebrew_gender_quality": "בינוני — שיעור שגיאת מגדר ~40–45%",
            "gender_error_rate": "~42%",
        },
        "strengths": ["כל 6 הפרמטרים זמינים ב-API", "Logit Bias מלא", "DALL-E 3 מובנה", "GPTs לאוטומציה"],
        "weaknesses": ["שגיאות מגדר בעברית גבוהות", "ממשק LTR", "מגבלת 4 Stop Sequences"],
        "best_use_case": "יצירת תוכן שיווקי, קוד, אוטומציות עם GPTs",
        "secret_prompts": [
            "Frequency Penalty=0.5 + Presence Penalty=0.3 — מאזן בין עקביות לגיוון",
            "Temperature=0.2 לתשובות עובדתיות מדויקות",
        ],
        "integrate": "כן",
    },

    "gemini": {
        "technical": {
            "model_version": "Gemini 1.5 Pro / Gemini 2.0 Flash / Gemini Ultra",
            "model_type": "Multimodal (Text + Image + Video + Audio)",
            "core_capabilities": ["Web search (Grounding)", "Long context 1M", "Image generation", "Video analysis"],
        },
        "ui": {
            "temperature":       {"available": True,  "default": "1.0",  "location": "AI Studio + API", "notes": "בממשק Gemini.google.com — לא חשוף; רק ב-AI Studio"},
            "top_p":             {"available": True,  "default": "0.95", "location": "AI Studio + API", "notes": "זמין ב-AI Studio; ממשק רגיל — ללא גישה"},
            "frequency_penalty": {"available": False, "default": None,   "location": "לא זמין",         "notes": "Gemini API אינו תומך בפרמטר זה נכון ל-2024"},
            "presence_penalty":  {"available": False, "default": None,   "location": "לא זמין",         "notes": "Gemini API אינו תומך בפרמטר זה נכון ל-2024"},
            "stop_sequences":    {"available": True,  "default": "[]",   "location": "API",             "notes": "עד 5 רצפי עצירה"},
            "logit_bias":        {"available": False, "default": None,   "location": "לא זמין",         "notes": "לא נתמך ב-Gemini API; יש Logprobs אבל לא Logit Bias"},
        },
        "system_instructions": "קיימות — System Instructions ב-AI Studio; לא זמין בממשק הצ'אט הרגיל",
        "streaming": True,
        "playground_url": "https://aistudio.google.com",
        "nav_score": 7,
        "free": {"cost_per_1m_tokens": "חינם (Flash)", "rpm_limit": "15",  "context_window": "1M"},
        "pro":  {"cost_per_1m_tokens": "19.99$/חודש (Advanced)", "rpm_limit": "1000", "context_window": "1M"},
        "localization": {
            "rtl_support": True, "rtl_issues": "AI Studio ממשק LTR; gemini.google.com תמיכה RTL חלקית",
            "privacy_law_1981": False, "masav_support": False,
            "hebrew_gender_quality": "שיעור שגיאת מגדר ~38% — מעט טוב מ-ChatGPT",
            "gender_error_rate": "~38%",
        },
        "strengths": ["Context window 1M — ייחודי", "Grounding עם Google Search", "Gemini Advanced מכסה NotebookLM"],
        "weaknesses": ["Frequency/Presence Penalty לא זמינים", "AI Studio נפרד מממשק הצ'אט", "שגיאות מגדר עברית"],
        "best_use_case": "מחקר מעמיק עם חיפוש, ניתוח קבצים גדולים, אינטגרציה עם Google Workspace",
        "secret_prompts": [
            "Temperature=0.3 + AI Studio → עקביות 94% במבחן Perturbation",
            "Grounding mode ב-AI Studio — מצטט מקורות עם לינקים ישירים",
        ],
        "integrate": "כן — בעיקר למחקר ו-RAG על מסמכים ארוכים",
    },

    "perplexity": {
        "technical": {
            "model_version": "Perplexity Base / Claude 3.5 Sonnet / GPT-4o (בחירה)",
            "model_type": "LLM + Real-time Web Search",
            "core_capabilities": ["Real-time web research", "Cited answers", "File analysis", "Multi-model selection"],
        },
        "ui": {
            "temperature":       {"available": False, "default": None,   "location": "לא זמין למשתמש", "notes": "Perplexity מנהלת Temperature פנימית לפי סוג השאלה"},
            "top_p":             {"available": False, "default": None,   "location": "לא זמין",        "notes": ""},
            "frequency_penalty": {"available": False, "default": None,   "location": "לא זמין",        "notes": ""},
            "presence_penalty":  {"available": False, "default": None,   "location": "לא זמין",        "notes": ""},
            "stop_sequences":    {"available": False, "default": None,   "location": "API בלבד",       "notes": "זמין ב-Perplexity API אך לא בממשק"},
            "logit_bias":        {"available": False, "default": None,   "location": "לא זמין",        "notes": ""},
        },
        "system_instructions": "System Prompt חלקי — ב-API; Perplexity Spaces מאפשרים הגדרת Custom Instructions",
        "streaming": True,
        "playground_url": "https://www.perplexity.ai/api",
        "nav_score": 9,
        "free": {"cost_per_1m_tokens": "חינם (5 Pro searches/day)", "rpm_limit": "~10", "context_window": "~32K"},
        "pro":  {"cost_per_1m_tokens": "20$/חודש",                   "rpm_limit": "ללא הגבלה", "context_window": "~32K"},
        "localization": {
            "rtl_support": True, "rtl_issues": "ממשק LTR; תוצאות חיפוש RTL חלקי",
            "privacy_law_1981": False, "masav_support": False,
            "hebrew_gender_quality": "בינוני — פחות מוכוון לעברית",
            "gender_error_rate": "~45%",
        },
        "strengths": ["ציטוט מקורות אמיתיים", "חיפוש בזמן אמת", "בחירת מודל (Claude/GPT/Llama)"],
        "weaknesses": ["0 פרמטרים נחשפים למשתמש", "Context window קטן", "לא מתאים לכתיבה יצירתית"],
        "best_use_case": "מחקר עם ציטוטים, מעקב חדשות, שאלות עובדתיות",
        "secret_prompts": [
            "\"השתמש רק במקורות אקדמיים (.edu, .gov, arxiv)\" — מסנן מקורות",
            "Focus mode = Academic → מחזיר רק מאמרים מדעיים",
        ],
        "integrate": "כן — לשלב כ-Research Tool לצד LLM ראשי",
    },

    "grok": {
        "technical": {
            "model_version": "Grok 2 / Grok 2 Vision",
            "model_type": "LLM + Vision + Real-time X/Twitter Search",
            "core_capabilities": ["Real-time X/Twitter data", "Image generation (Aurora)", "Hebrew support", "Unfiltered responses"],
        },
        "ui": {
            "temperature":       {"available": True,  "default": "1.0",  "location": "API בלבד",  "notes": "ממשק X — לא חשוף; API של xAI כולל Temperature"},
            "top_p":             {"available": True,  "default": "0.95", "location": "API בלבד",  "notes": ""},
            "frequency_penalty": {"available": False, "default": None,   "location": "לא זמין",   "notes": "xAI API לא כולל פרמטר זה"},
            "presence_penalty":  {"available": False, "default": None,   "location": "לא זמין",   "notes": ""},
            "stop_sequences":    {"available": True,  "default": "[]",   "location": "API",       "notes": ""},
            "logit_bias":        {"available": False, "default": None,   "location": "לא זמין",   "notes": ""},
        },
        "system_instructions": "קיימות ב-API; בממשק X — Custom Instructions בסיסי",
        "streaming": True,
        "playground_url": "https://console.x.ai",
        "nav_score": 6,
        "free": {"cost_per_1m_tokens": "חינם מוגבל (X Basic)", "rpm_limit": "~5",  "context_window": "~131K"},
        "pro":  {"cost_per_1m_tokens": "16$/חודש (X Premium+)", "rpm_limit": "~50", "context_window": "~131K"},
        "localization": {
            "rtl_support": True, "rtl_issues": "ממשק X אינו RTL מלא אך הטקסט מוצג נכון",
            "privacy_law_1981": False, "masav_support": False,
            "hebrew_gender_quality": "שיעור שגיאה ~35% — תוצאות מעורבות",
            "gender_error_rate": "~35%",
        },
        "strengths": ["גישה ל-X/Twitter בזמן אמת", "Aurora ליצירת תמונות", "פחות מגבלות תוכן"],
        "weaknesses": ["ממשק X לא אופטימלי לעבודה", "API יחסית חדש ולא מתועד היטב", "Logit Bias חסר"],
        "best_use_case": "ניטור מגמות סושיאל, יצירת תמונות Aurora, תוכן עם מידע עדכני",
        "secret_prompts": [
            "\"חפש פוסטים מ-X על הנושא ולאחר מכן סכם\" — מפעיל Real-time search",
        ],
        "integrate": "תלוי שימוש — כן לסושיאל מדיה ו-PR, לא לכלי ראשי",
    },
}


# ══════════════════════════════════════════════════════════════════════════════
# § 3  VALIDATION — Anti-Shallow Research Check
# ══════════════════════════════════════════════════════════════════════════════

REQUIRED_FIELDS_FOR_DEEP_RESEARCH = [
    "ui_audit.temperature.available",
    "ui_audit.top_p.available",
    "ui_audit.frequency_penalty.available",
    "ui_audit.stop_sequences.available",
    "ui_audit.system_instructions",
    "technical_summary.model_version",
    "economics.free.context_window",
    "localization.rtl_support",
    "recommendation.integrate",
]


def _get_nested(obj: object, dotted_path: str):
    """מחלץ שדה מ-dataclass לפי נתיב מנוקד."""
    parts = dotted_path.split(".")
    cur = obj
    for p in parts:
        if isinstance(cur, dict):
            cur = cur.get(p)
        else:
            cur = getattr(cur, p, None)
        if cur is None:
            return None
    return cur


def validate_depth(report: ToolResearchReport) -> ToolResearchReport:
    """
    בודק שהמחקר אינו 'רדוד' לפי כלל ה-Anti-Shallow Research.
    ממלא report.missing_fields ו-report.shallow_research_flag.
    """
    missing = []
    for field_path in REQUIRED_FIELDS_FOR_DEEP_RESEARCH:
        val = _get_nested(report, field_path)
        if val is None or val == "" or val == []:
            missing.append(field_path)

    report.missing_fields = missing
    report.shallow_research_flag = len(missing) > 3  # מעל 3 שדות חסרים = מחקר רדוד
    return report


# ══════════════════════════════════════════════════════════════════════════════
# § 4  CORE FUNCTION — research_tool()
# ══════════════════════════════════════════════════════════════════════════════

def research_tool(tool_id: str) -> ToolResearchReport:
    """
    מחקר מלא של כלי לפי תבנית המחקר הסטנדרטית (6 חלקים).
    משתמש ב-_KNOWN_PARAMS לנתונים מאומתים.
    """
    # Load tools_master.json for base data
    with open(TOOLS_MASTER_PATH, encoding="utf-8") as f:
        tools_db = json.load(f)
    tool_base = next((t for t in tools_db["tools"] if t["id"] == tool_id), None)

    if tool_base is None:
        raise ValueError(f"Tool '{tool_id}' not found in tools_master.json")

    known = _KNOWN_PARAMS.get(tool_id, {})

    # ── Build report ─────────────────────────────────────────────────────────
    report = ToolResearchReport(
        tool_id=tool_id,
        tool_name=tool_base["name"],
    )

    # § 1 — Technical Summary
    tech = known.get("technical", {})
    report.technical_summary = TechnicalSummary(
        model_version=tech.get("model_version", "לא ידוע"),
        model_type=tech.get("model_type", "LLM"),
        core_capabilities=tech.get("core_capabilities", []),
    )

    # § 2 — UI & Settings Audit
    ui_params = known.get("ui", {})
    def _make_param(key: str) -> UIParameter:
        p = ui_params.get(key, {})
        return UIParameter(
            available=p.get("available", False),
            default_value=p.get("default"),
            location=p.get("location", "לא ידוע"),
            notes=p.get("notes", ""),
        )

    report.ui_audit = UISettingsAudit(
        nav_score=known.get("nav_score", 0),
        temperature=_make_param("temperature"),
        top_p=_make_param("top_p"),
        frequency_penalty=_make_param("frequency_penalty"),
        presence_penalty=_make_param("presence_penalty"),
        stop_sequences=_make_param("stop_sequences"),
        logit_bias=_make_param("logit_bias"),
        system_instructions=known.get("system_instructions", "לא ידוע"),
        streaming=known.get("streaming", False),
        playground_url=known.get("playground_url", ""),
    )

    # § 3 — Economics
    free_eco = known.get("free", {})
    pro_eco  = known.get("pro",  {})
    report.economics = EconomicsAudit(
        free=TierEconomics(**{k: v for k, v in free_eco.items() if k in TierEconomics.__dataclass_fields__}),
        pro =TierEconomics(**{k: v for k, v in pro_eco.items()  if k in TierEconomics.__dataclass_fields__}),
    )

    # § 4 — Stress Tests (placeholders — to be filled by actual testing)
    report.stress_tests = StressTestResults(
        perturbation=StressTestResult(passed=None, notes="טרם נבדק"),
        morphology=StressTestResult(passed=None,   notes="טרם נבדק"),
        proof_grid=StressTestResult(passed=None,   notes="טרם נבדק"),
        phonemic_ambiguity=StressTestResult(passed=None, notes="טרם נבדק"),
        load_accuracy=StressTestResult(passed=None, notes="טרם נבדק"),
    )

    # § 5 — Israeli Localization
    loc = known.get("localization", {})
    report.localization = IsraeliLocalization(
        rtl_support=loc.get("rtl_support", False),
        rtl_issues=loc.get("rtl_issues", ""),
        privacy_law_1981=loc.get("privacy_law_1981", False),
        masav_support=loc.get("masav_support", False),
        hebrew_gender_quality=loc.get("hebrew_gender_quality", ""),
        gender_error_rate=loc.get("gender_error_rate"),
    )

    # § 6 — Recommendations
    report.recommendation = FinalRecommendation(
        integrate=known.get("integrate", "תלוי שימוש"),
        strengths=known.get("strengths", []),
        weaknesses=known.get("weaknesses", []),
        best_use_case=known.get("best_use_case", ""),
        secret_prompts=known.get("secret_prompts", []),
    )

    # Validate depth
    report = validate_depth(report)

    return report


# ══════════════════════════════════════════════════════════════════════════════
# § 5  MARKDOWN RENDERER — renders report to the Research Template format
# ══════════════════════════════════════════════════════════════════════════════

def _param_row(name: str, p: UIParameter) -> str:
    status = "✅ זמין" if p.available else "❌ לא זמין"
    default = f" — ברירת מחדל: `{p.default_value}`" if p.default_value else ""
    loc = f" | {p.location}" if p.location else ""
    notes = f"\n  ↳ {p.notes}" if p.notes else ""
    return f"  - [{('x' if p.available else ' ')}] **{name}** — {status}{default}{loc}{notes}"


def render_markdown(report: ToolResearchReport) -> str:
    r = report
    ui = r.ui_audit
    eco = r.economics
    loc = r.localization
    rec = r.recommendation
    ts = r.technical_summary
    st = r.stress_tests

    depth_warning = ""
    if r.shallow_research_flag:
        depth_warning = f"\n> ⚠️ **אזהרת מחקר רדוד** — {len(r.missing_fields)} שדות חסרים: `{', '.join(r.missing_fields)}`\n"

    strengths_str  = "\n".join(f"  - {s}" for s in rec.strengths)  or "  - לא צוין"
    weaknesses_str = "\n".join(f"  - {w}" for w in rec.weaknesses) or "  - לא צוין"
    prompts_str    = "\n".join(f"  - {p}" for p in rec.secret_prompts) or "  - לא צוין"
    caps_str       = ", ".join(ts.core_capabilities) or "לא צוין"

    def stress_row(name: str, result) -> str:
        if result.passed is None:
            return f"- **{name}**: ⏳ טרם נבדק"
        icon = "✅ עבר" if result.passed else "❌ נכשל"
        score = f" ({result.score})" if result.score else ""
        notes = f" — {result.notes}" if result.notes else ""
        return f"- **{name}**: {icon}{score}{notes}"

    return f"""# דוח הערכת כלי בינה מלאכותית: {r.tool_name}
*תאריך מחקר: {r.research_date} | חוקר: {r.researcher}*
{depth_warning}
---

## 1. תקציר טכני (Technical Summary)
- **גרסת מודל**: {ts.model_version}
- **סוג מודל**: {ts.model_type}
- **יכולות ליבה**: {caps_str}

---

## 2. סקירת ממשק והגדרות (UI & Settings Audit)
- **ציון נוחות ניווט**: {ui.nav_score}/10
- **פרמטרים זמינים בממשק**:
{_param_row("Temperature", ui.temperature)}
{_param_row("Top P (Nucleus Sampling)", ui.top_p)}
{_param_row("Frequency Penalty", ui.frequency_penalty)}
{_param_row("Presence Penalty", ui.presence_penalty)}
{_param_row("Stop Sequences", ui.stop_sequences)}
{_param_row("Logit Bias", ui.logit_bias)}
- **הנחיות מערכת (System Instructions)**: {ui.system_instructions}
- **Streaming**: {"✅ זמין" if ui.streaming else "❌ לא זמין"}
- **ממשק Developer/Playground**: {ui.playground_url or "לא זמין"}

---

## 3. ניתוח כלכלי ומגבלות (Economics & Quotas)

| פרמטר | גרסה חינמית | גרסת תשלום |
|---|---|---|
| עלות ל-1M טוקנים | {eco.free.cost_per_1m_tokens or "—"} | {eco.pro.cost_per_1m_tokens or "—"} |
| הגבלת RPM | {eco.free.rpm_limit or "—"} | {eco.pro.rpm_limit or "—"} |
| חלון הקשר (Context) | {eco.free.context_window or "—"} | {eco.pro.context_window or "—"} |

---

## 4. תוצאות מבחני מאמץ (Stress Test Results)
{stress_row("עקביות (Perturbation)", st.perturbation)}
{stress_row("דקדוק עברי (Morphology)", st.morphology)}
{stress_row("לוגיקה (ProofGrid)", st.proof_grid)}
{stress_row("עמימות פונמית (Phonemic Ambiguity)", st.phonemic_ambiguity)}
{stress_row("עומס (Load Test)", st.load_accuracy)}

---

## 5. לוקליזציה לישראל (Israeli Localization)
- **תאימות RTL**: {"✅" if loc.rtl_support else "❌"} {loc.rtl_issues}
- **עמידה בחוק הגנת הפרטיות הישראלי 1981**: {"✅ כן" if loc.privacy_law_1981 else "❌ לא"}
- **תמיכה ב-MASAV**: {"✅ כן" if loc.masav_support else "❌ לא"}
- **טיפול במגדר עברי**: {loc.hebrew_gender_quality}{f" (שיעור שגיאה: {loc.gender_error_rate})" if loc.gender_error_rate else ""}

---

## 6. מסקנות והמלצות (Final Recommendations)
- **להטמיע במערכת?**: {rec.integrate}
- **ה"נוסחאות הסודיות" שעבדו הכי טוב**:
{prompts_str}
- **Strengths**:
{strengths_str}
- **Weaknesses**:
{weaknesses_str}
- **Best Use Case**: {rec.best_use_case}
"""


# ══════════════════════════════════════════════════════════════════════════════
# § 6  SAVE / LOAD REPORTS
# ══════════════════════════════════════════════════════════════════════════════

def save_report(report: ToolResearchReport) -> str:
    """שומר דוח כ-JSON וכ-Markdown. מחזיר נתיב ה-Markdown."""
    base = os.path.join(REPORTS_DIR, report.tool_id)
    # JSON
    with open(f"{base}.json", "w", encoding="utf-8") as f:
        json.dump(asdict(report), f, ensure_ascii=False, indent=2)
    # Markdown
    md_path = f"{base}.md"
    with open(md_path, "w", encoding="utf-8") as f:
        f.write(render_markdown(report))
    return md_path


def load_report(tool_id: str) -> Optional[ToolResearchReport]:
    """טוען דוח קיים מ-JSON אם קיים."""
    path = os.path.join(REPORTS_DIR, f"{tool_id}.json")
    if not os.path.exists(path):
        return None
    with open(path, encoding="utf-8") as f:
        data = json.load(f)
    # Reconstruct nested dataclasses
    return _dict_to_report(data)


def _dict_to_report(d: dict) -> ToolResearchReport:
    """ממיר dict בחזרה ל-ToolResearchReport (שחזור מלא של dataclasses)."""
    def ui_param(p): return UIParameter(**p) if p else UIParameter()
    def stress(s):   return StressTestResult(**s) if s else StressTestResult()

    ui = d.get("ui_audit", {})
    eco = d.get("economics", {})
    st = d.get("stress_tests", {})

    return ToolResearchReport(
        tool_id=d["tool_id"],
        tool_name=d["tool_name"],
        research_date=d.get("research_date", ""),
        researcher=d.get("researcher", ""),
        shallow_research_flag=d.get("shallow_research_flag", False),
        missing_fields=d.get("missing_fields", []),
        technical_summary=TechnicalSummary(**d.get("technical_summary", {})),
        ui_audit=UISettingsAudit(
            nav_score=ui.get("nav_score", 0),
            temperature=ui_param(ui.get("temperature")),
            top_p=ui_param(ui.get("top_p")),
            frequency_penalty=ui_param(ui.get("frequency_penalty")),
            presence_penalty=ui_param(ui.get("presence_penalty")),
            stop_sequences=ui_param(ui.get("stop_sequences")),
            logit_bias=ui_param(ui.get("logit_bias")),
            system_instructions=ui.get("system_instructions", ""),
            streaming=ui.get("streaming", False),
            playground_url=ui.get("playground_url", ""),
        ),
        economics=EconomicsAudit(
            free=TierEconomics(**eco.get("free", {})),
            pro=TierEconomics(**eco.get("pro", {})),
        ),
        stress_tests=StressTestResults(
            perturbation=stress(st.get("perturbation")),
            morphology=stress(st.get("morphology")),
            proof_grid=stress(st.get("proof_grid")),
            phonemic_ambiguity=stress(st.get("phonemic_ambiguity")),
            load_accuracy=stress(st.get("load_accuracy")),
        ),
        localization=IsraeliLocalization(**d.get("localization", {})),
        recommendation=FinalRecommendation(**d.get("recommendation", {})),
    )


# ══════════════════════════════════════════════════════════════════════════════
# § 7  BATCH RESEARCH — research all known tools
# ══════════════════════════════════════════════════════════════════════════════

def research_all_known() -> list[str]:
    """מחקר כל הכלים הידועים ב-_KNOWN_PARAMS. מחזיר רשימת נתיבי Markdown."""
    results = []
    for tool_id in _KNOWN_PARAMS:
        try:
            report = research_tool(tool_id)
            path = save_report(report)
            results.append(path)
            print(f"✅ {tool_id} → {path}"
                  + (f"  ⚠️ shallow ({len(report.missing_fields)} missing)" if report.shallow_research_flag else ""))
        except Exception as e:
            print(f"❌ {tool_id} failed: {e}")
    return results


# ══════════════════════════════════════════════════════════════════════════════
# § 8  UI PARAMETER SUMMARY — quick audit across all known tools
# ══════════════════════════════════════════════════════════════════════════════

def ui_parameter_audit() -> str:
    """
    מפיק טבלת סיכום זמינות הפרמטרים לכל הכלים הידועים.
    שימושי להשוואה מהירה.
    """
    params = ["temperature", "top_p", "frequency_penalty", "presence_penalty", "stop_sequences", "logit_bias"]
    header = "| כלי | Temp | TopP | FreqPen | PresPen | StopSeq | LogitBias | Sys.Instr |\n"
    header += "|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|\n"
    rows = []
    for tool_id, known in _KNOWN_PARAMS.items():
        ui = known.get("ui", {})
        def c(key): return "✅" if ui.get(key, {}).get("available") else "❌"
        sys_instr = "✅" if known.get("system_instructions", "").startswith("קיימות") else "⚠️"
        name = tool_id.capitalize()
        rows.append(f"| {name} | {c('temperature')} | {c('top_p')} | {c('frequency_penalty')} | {c('presence_penalty')} | {c('stop_sequences')} | {c('logit_bias')} | {sys_instr} |")
    return header + "\n".join(rows)


# ══════════════════════════════════════════════════════════════════════════════
# § 9  CLI ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage:")
        print("  python research_engine.py <tool_id>      — מחקר כלי ספציפי")
        print("  python research_engine.py all             — מחקר כל הכלים הידועים")
        print("  python research_engine.py audit           — טבלת פרמטרים להשוואה")
        sys.exit(0)

    cmd = sys.argv[1].lower()

    if cmd == "all":
        paths = research_all_known()
        print(f"\nסה\"כ {len(paths)} דוחות נוצרו ב-{REPORTS_DIR}")

    elif cmd == "audit":
        print("\n## טבלת זמינות פרמטרי UI\n")
        print(ui_parameter_audit())

    else:
        try:
            report = research_tool(cmd)
            path = save_report(report)
            print(render_markdown(report))
            print(f"\n📁 נשמר: {path}")
            if report.shallow_research_flag:
                print(f"⚠️  אזהרת מחקר רדוד — שדות חסרים: {report.missing_fields}")
        except ValueError as e:
            print(f"שגיאה: {e}")
