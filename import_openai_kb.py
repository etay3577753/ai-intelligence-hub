"""
Import OpenAI ecosystem tools into ecosystem-inventory.json
Based on: "להלן חלק א — מיפוי גבולות האקוסיסטם ועץ היררכי OpenAI).pdf" (34 pages)
"""
import json, os, sys
from datetime import date

KB_PATH = os.path.join(os.path.dirname(__file__), "backend", "data", "knowledge-base", "ecosystem-inventory.json")
TODAY = date.today().isoformat()

def load():
    with open(KB_PATH, encoding="utf-8") as f:
        return json.load(f)

def save(data):
    with open(KB_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def item(id, name, category, description, tags, use_cases=None, tiers=None, status="inventory_only"):
    return {
        "id": id,
        "name": name,
        "vendor": "OpenAI",
        "ecosystem": "openai",
        "category": category,
        "description": description,
        "surfaces": [],
        "relations": [],
        "subscription_tiers": tiers or [],
        "primary_access_key": "api-key",
        "tags": tags,
        "use_cases": use_cases or [],
        "wiki_file": None,
        "research_status": status,
        "last_research_date": None,
        "has_pending_updates": False,
        "research_record_ids": [],
        "deep_research_status": "not_started",
        "freshness": {"score": 0.7, "confidence": 0.8, "last_checked": TODAY}
    }

FREE_PAID = [
    {"level": "free", "price": "$0", "access_key": "free", "features": ["גישה חינמית", "מוגבל בהודעות"]},
    {"level": "plus", "price": "$20/mo", "access_key": "plus", "features": ["GPT-4o", "DALL·E", "Advanced Voice"]},
    {"level": "pro", "price": "$200/mo", "access_key": "pro", "features": ["unlimited o3", "Deep Research", "Sora Pro"]},
    {"level": "team", "price": "$30/seat/mo", "access_key": "team", "features": ["admin controls", "higher limits", "no training"]},
    {"level": "enterprise", "price": "custom", "access_key": "enterprise", "features": ["SSO", "DLP", "compliance", "dedicated infra"]},
]

API_TIERS = [
    {"level": "pay-as-you-go", "price": "per token", "access_key": "api-key", "features": ["all endpoints", "usage-based billing"]},
    {"level": "enterprise", "price": "custom", "access_key": "enterprise", "features": ["higher limits", "SLA", "private deployment"]},
]

NEW_TOOLS = [

    # ─── Core Models ───────────────────────────────────────────────────────────
    item("gpt-4o", "GPT-4o",
        "AI Model",
        "מודל הדגל של OpenAI — מולטי-מודאלי (טקסט+תמונה+אודיו), מהיר, משמש כבסיס ל-ChatGPT ול-API. הצד המאוזן בין ביצועים למחיר.",
        ["type:llm-model","capability:text-generation","capability:vision","capability:reasoning","audience:developer","audience:consumer","access:api-key","access:free-tier","compare:claude-3-sonnet","compare:gemini-pro"],
        ["שיחות חכמות", "ניתוח תמונות", "כתיבת קוד", "סיכומי מסמכים", "agents"],
        API_TIERS, "inventory_only"),

    item("gpt-4-1", "GPT-4.1 Family",
        "AI Model",
        "משפחת GPT-4.1 — שיפור על GPT-4o עם הבנת קוד ארוכה יותר, הקשר ארוך יותר ותמחור מעודכן. כולל mini ו-nano.",
        ["type:llm-model","capability:text-generation","capability:coding","audience:developer","access:api-key","compare:claude-3-5-sonnet"],
        ["tasks ארוכים", "קוד מורכב", "עיבוד מסמכים", "RAG"],
        API_TIERS, "inventory_only"),

    item("gpt-4-1-mini", "GPT-4.1 Mini",
        "AI Model",
        "גרסה מהירה וזולה של GPT-4.1 — מאוזן בין ביצועים לעלות, מתאים לשימושים בנפח גבוה.",
        ["type:llm-model","capability:text-generation","capability:coding","audience:developer","access:api-key","access:free-tier","compare:claude-3-haiku"],
        ["batch processing", "chatbots", "classification", "summarization"],
        API_TIERS, "inventory_only"),

    item("gpt-4-1-nano", "GPT-4.1 Nano",
        "AI Model",
        "הגרסה הקטנה ביותר של GPT-4.1 — אולטרה-מהיר ואולטרה-זול, לשימושים עם latency נמוך.",
        ["type:llm-model","capability:text-generation","audience:developer","access:api-key","compare:claude-3-haiku"],
        ["real-time chat", "classification", "low-latency tasks"],
        API_TIERS, "inventory_only"),

    item("o-series-reasoning", "o-Series Reasoning Models (o1, o3, o3-mini)",
        "AI Model",
        "משפחת מודלי reasoning של OpenAI — o1, o3, o3-mini. מתמחים בהיסק לוגי, מתמטיקה ומחשבה שלב-אחר-שלב. מחליפים GPT-4o למשימות מורכבות.",
        ["type:llm-model","capability:reasoning","capability:math","capability:coding","audience:developer","audience:enterprise","access:api-key","compare:claude-3-opus","compare:gemini-ultra"],
        ["מחקר", "פתרון בעיות מורכבות", "STEM", "בדיקות לוגיות", "Deep Research"],
        API_TIERS, "inventory_only"),

    item("gpt-3-5-legacy", "GPT-3.5 Family (Legacy)",
        "AI Model",
        "משפחת GPT-3.5 — גרסאות ישנות יותר, עדיין נגישות ב-API לשירות ותיק. מוחלפות בגדול על ידי GPT-4o.",
        ["type:llm-model","capability:text-generation","audience:developer","access:free-tier","compare:claude-2-legacy"],
        ["legacy integrations", "cost-sensitive workloads"],
        API_TIERS, "inventory_only"),

    item("gpt-4-legacy", "GPT-4 Turbo / GPT-4 (Legacy)",
        "AI Model",
        "גרסאות GPT-4 הקודמות — GPT-4 Turbo וגרסאות מוקדמות. הוחלפו רובם על ידי GPT-4o ו-GPT-4.1.",
        ["type:llm-model","capability:text-generation","capability:vision","audience:developer","access:api-key"],
        ["legacy API integrations"],
        API_TIERS, "inventory_only"),

    item("embeddings-api", "Embeddings API",
        "AI Model",
        "מודלי embeddings (text-embedding-3-large, text-embedding-3-small) — יוצרים וקטורי ייצוג לטקסט לצורך RAG, חיפוש סמנטי ומיון.",
        ["type:embedding-model","capability:semantic-search","capability:rag","audience:developer","access:api-key","compare:vertex-embeddings"],
        ["RAG", "חיפוש סמנטי", "מיון מסמכים", "clustering"],
        API_TIERS, "inventory_only"),

    item("dall-e", "DALL·E (2 / 3)",
        "AI Model",
        "מודל יצירת תמונות של OpenAI — DALL·E 3 זמין ב-ChatGPT ו-API, תומך ביצירה ועריכה. DALL·E 2 legacy.",
        ["type:image-model","capability:image-generation","capability:image-editing","audience:consumer","audience:developer","access:api-key","compare:imagen","compare:midjourney"],
        ["יצירת תמונות", "עריכת תמונות", "וריאציות", "inpainting"],
        FREE_PAID, "inventory_only"),

    item("sora-model", "Sora (Video Model)",
        "AI Model",
        "מודל יצירת וידאו טקסט-לוידאו של OpenAI. גישה ל-Plus/Pro ב-ChatGPT וכ-API. יוצר קליפים באורך עד דקה.",
        ["type:video-model","capability:video-generation","audience:consumer","audience:developer","access:api-key","compare:veo"],
        ["יצירת וידאו שיווקי", "אנימציה", "storytelling", "פרוטוטייפינג"],
        FREE_PAID, "inventory_only"),

    item("whisper-api", "Whisper (Speech-to-Text API)",
        "AI Model",
        "מודל זיהוי דיבור ותמלול של OpenAI — רב-לשוני, תמיכה בתמלול ותרגום. זמין ב-API ומשולב ב-ChatGPT Voice.",
        ["type:audio-model","capability:speech-to-text","capability:translation","audience:developer","access:api-key","compare:google-speech"],
        ["תמלול פגישות", "כתוביות", "תרגום דיבור", "voice assistants"],
        API_TIERS, "inventory_only"),

    item("tts-api", "Text-to-Speech API",
        "AI Model",
        "ממיר טקסט לדיבור באיכות גבוהה, תומך בכמה קולות. זמין ב-API ומשולב ב-ChatGPT Voice Mode.",
        ["type:audio-model","capability:text-to-speech","audience:developer","access:api-key","compare:google-tts"],
        ["voice assistants", "audiobooks", "accessibility", "IVR"],
        API_TIERS, "inventory_only"),

    item("moderation-api", "Moderation API",
        "AI Model",
        "מודל סינון תוכן של OpenAI — מסווג ומסנן תוכן לא הולם, זמין ב-API בחינם.",
        ["type:safety-model","capability:content-moderation","audience:developer","access:free-tier"],
        ["פילטרים לתוכן", "safety systems", "CSAM detection"],
        [{"level": "free", "price": "$0", "access_key": "free"}], "inventory_only"),

    # ─── ChatGPT Consumer Products ────────────────────────────────────────────
    item("chatgpt-web", "ChatGPT (Web)",
        "Assistant Application",
        "ממשק השיחה הראשי של OpenAI — web app ב-chatgpt.com. תומך ב-GPT-4o, o-series, Deep Research, Voice, DALL·E, File Analysis.",
        ["type:assistant-app","capability:text-generation","capability:vision","capability:voice","capability:image-generation","audience:consumer","access:free-tier","compare:claude-ai-web","compare:gemini-web"],
        ["שיחות AI", "ניתוח מסמכים", "יצירת תמונות", "מחקר מעמיק", "קוד"],
        FREE_PAID, "inventory_only"),

    item("chatgpt-mobile", "ChatGPT (Mobile App)",
        "Assistant Application",
        "אפליקציית ChatGPT ל-iOS ו-Android — כולל voice mode, עבודה עם תמונות ועוד.",
        ["type:mobile-app","capability:voice","capability:text-generation","audience:consumer","access:free-tier","compare:claude-ios-app"],
        ["שיחות קוליות", "תמלול בניידים", "עזרה מהירה"],
        FREE_PAID, "inventory_only"),

    item("chatgpt-deep-research", "ChatGPT Deep Research",
        "Assistant Feature",
        "agent מחקרי של OpenAI מוטמע ב-ChatGPT — מחפש ומסנתז מידע ממקורות מרובים, מפיק דוחות מקיפים. מבוסס o-series.",
        ["type:agent","capability:research","capability:web-search","audience:consumer","audience:enterprise","access:api-key","compare:claude-research","compare:gemini-deep-research"],
        ["מחקר שוק", "due diligence", "סיכומי נושא", "מחקר אקדמי"],
        FREE_PAID, "inventory_only"),

    item("chatgpt-voice", "ChatGPT Voice (Advanced Voice Mode)",
        "Assistant Feature",
        "מצב שיחה קולית מתקדם ב-ChatGPT — שיחה דו-כיוונית בזמן אמת עם GPT-4o, תמיכה ברגשות ובאינטונציה.",
        ["type:voice-interface","capability:voice","capability:real-time","audience:consumer","access:api-key"],
        ["שיחות טבעיות", "שפות זרות", "לימוד", "נגישות"],
        FREE_PAID, "inventory_only"),

    item("chatgpt-search", "ChatGPT Search",
        "Assistant Feature",
        "יכולת חיפוש מוטמעת ב-ChatGPT — מחפש ברשת ומסנתז תוצאות בזמן אמת.",
        ["type:search","capability:web-search","audience:consumer","access:free-tier"],
        ["חיפוש מידע עדכני", "עובדות", "חדשות"],
        FREE_PAID, "inventory_only"),

    item("chatgpt-memory", "ChatGPT Memory",
        "Assistant Feature",
        "זיכרון אישי ב-ChatGPT — שומר עובדות על המשתמש ומשתמש בהן לשיפור תשובות עתידיות.",
        ["type:memory","capability:personalization","audience:consumer","access:api-key"],
        ["התאמה אישית", "עקביות בשיחות ארוכות"],
        FREE_PAID, "inventory_only"),

    item("chatgpt-atlas", "ChatGPT Atlas (Education)",
        "Assistant Application",
        "כלי לימוד מבית OpenAI מוטמע ב-ChatGPT — עוזר לסטודנטים ולמוסדות חינוכיים.",
        ["type:edu-app","capability:education","audience:consumer","access:api-key"],
        ["למידה", "תרגול", "שאלות ותשובות אקדמיות"],
        [{"level": "edu", "price": "custom", "access_key": "edu"}], "inventory_only"),

    # ─── GPT Store & Custom GPTs ───────────────────────────────────────────────
    item("gpt-store", "GPT Store",
        "Marketplace",
        "חנות ה-GPTs של OpenAI — פלטפורמת הפצה ל-Custom GPTs. גולשים יכולים לגלות, להשתמש ולפרסם GPTs.",
        ["type:marketplace","capability:agents","audience:consumer","audience:developer","access:free-tier","compare:claude-marketplace"],
        ["גילוי GPTs", "פרסום סוכנים", "שיתוף chatbots"],
        FREE_PAID, "inventory_only"),

    item("custom-gpts", "Custom GPTs",
        "AI Agent",
        "GPTs מותאמים אישית — בנייה ללא קוד של assistant מותאם עם הוראות, קבצי ידע ו-Actions לחיבור ל-APIs חיצוניים.",
        ["type:agent","capability:agents","capability:customization","audience:consumer","audience:developer","access:api-key","compare:claude-projects"],
        ["chatbots לעסקים", "כלי פנימיים", "עזר מומחה"],
        FREE_PAID, "inventory_only"),

    item("gpt-builder", "GPT Builder",
        "Developer Tool",
        "כלי בנייה ב-ChatGPT לבניית Custom GPTs — ממשק no-code לייצור GPTs, הגדרת הוראות, העלאת קבצים וחיבור Actions.",
        ["type:builder","capability:no-code","audience:developer","access:api-key"],
        ["בניית בוטים ללא קוד", "פרסום GPTs"],
        FREE_PAID, "inventory_only"),

    item("gpt-actions", "GPT Actions",
        "Developer Tool",
        "Actions ל-Custom GPTs — מנגנון לחיבור GPTs ל-APIs חיצוניים, מחליף את ה-Plugins הישנים.",
        ["type:connector","capability:integrations","audience:developer","access:api-key","compare:mcp-protocol"],
        ["חיבור ל-APIs", "automations", "integrations עסקיות"],
        FREE_PAID, "inventory_only"),

    item("chatgpt-plugins-legacy", "ChatGPT Plugins (Legacy)",
        "Legacy Product",
        "פלאגינים ישנים ל-ChatGPT — הוחלפו על ידי GPT Actions ו-GPT Store ב-2024.",
        ["type:legacy","audience:developer","access:api-key"],
        ["legacy integrations"],
        [], "inventory_only"),

    # ─── Subscription Plans ────────────────────────────────────────────────────
    item("openai-plan-free", "ChatGPT Free Plan",
        "Subscription Plan",
        "תוכנית החינמית של ChatGPT — גישה ל-GPT-4o-mini, חיפוש, שיחות מוגבלות. ללא כרטיס אשראי.",
        ["type:subscription","audience:consumer","access:free-tier","compare:claude-plan-free"],
        ["גישה ראשונה ל-AI", "ניסוי"],
        [{"level": "free", "price": "$0", "access_key": "free"}], "inventory_only"),

    item("openai-plan-plus", "ChatGPT Plus Plan",
        "Subscription Plan",
        "תוכנית Plus — $20/חודש. גישה ל-GPT-4o, DALL·E, Voice, Advanced Data Analysis, Deep Research (מוגבל).",
        ["type:subscription","audience:consumer","access:paid","compare:claude-plan-pro"],
        ["שימוש יומיומי", "עבודה עם תמונות", "מחקר"],
        [{"level": "plus", "price": "$20/mo", "access_key": "plus"}], "inventory_only"),

    item("openai-plan-pro", "ChatGPT Pro Plan",
        "Subscription Plan",
        "תוכנית Pro — ~$200/חודש. o3 ללא הגבלה, Deep Research ללא הגבלה, Sora Pro, גישה מוקדמת לפיצ'רים.",
        ["type:subscription","audience:consumer","access:paid","compare:claude-plan-max"],
        ["שימוש אינטנסיבי", "מחקר מתקדם", "reasoning כבד"],
        [{"level": "pro", "price": "$200/mo", "access_key": "pro"}], "inventory_only"),

    item("openai-plan-team", "ChatGPT Team Plan",
        "Subscription Plan",
        "תוכנית Team — $30/seat/mo. workspace שיתופי, לוחות בקרה לאדמין, ללא שימוש בנתונים לאימון.",
        ["type:subscription","audience:enterprise","access:paid","compare:claude-plan-team"],
        ["שיתוף פעולה בצוות", "הגנת פרטיות", "ניהול ארגוני"],
        [{"level": "team", "price": "$30/seat/mo", "access_key": "team"}], "inventory_only"),

    item("openai-plan-enterprise", "ChatGPT Enterprise Plan",
        "Subscription Plan",
        "תוכנית Enterprise — תמחור מותאם. SSO/SCIM, DLP, compliance, יכולות API, SLA.",
        ["type:subscription","audience:enterprise","access:enterprise-only","compare:claude-plan-enterprise"],
        ["ארגונים גדולים", "דרישות compliance", "integrations"],
        [{"level": "enterprise", "price": "custom", "access_key": "enterprise"}], "inventory_only"),

    item("openai-plan-edu", "ChatGPT Edu Plan",
        "Subscription Plan",
        "תוכנית Edu — לאוניברסיטאות ומוסדות חינוך, מבוסס Enterprise עם הסכמי רישוי מיוחדים.",
        ["type:subscription","audience:consumer","access:paid"],
        ["הוראה", "מחקר אקדמי"],
        [{"level": "edu", "price": "custom", "access_key": "edu"}], "inventory_only"),

    # ─── Developer Platform & API ─────────────────────────────────────────────
    item("openai-platform", "OpenAI Platform / API",
        "Developer Platform",
        "פלטפורמת המפתחים של OpenAI — dashboard, API keys, usage analytics, Playground. שער הכניסה ל-API.",
        ["type:developer-platform","capability:api-access","audience:developer","access:api-key","compare:anthropic-console","compare:google-ai-studio"],
        ["ניהול API", "monitoring", "billing"],
        API_TIERS, "inventory_only"),

    item("responses-api", "Responses API",
        "API",
        "ה-API המרכזי החדש של OpenAI — מחליף את Completions ומשלב יכולות agents. נקרא גם Chat Completions.",
        ["type:api","capability:text-generation","capability:agents","audience:developer","access:api-key","compare:anthropic-api"],
        ["building apps", "agents", "streaming", "multi-turn conversations"],
        API_TIERS, "inventory_only"),

    item("realtime-api", "Realtime API",
        "API",
        "API בזמן אמת — חיבור WebSocket דו-כיווני לשיחות קוליות ותגובות מיידיות עם GPT-4o.",
        ["type:api","capability:real-time","capability:voice","audience:developer","access:api-key"],
        ["voice assistants", "real-time transcription", "live conversations"],
        API_TIERS, "inventory_only"),

    item("assistants-api-legacy", "Assistants API (Legacy v1)",
        "API",
        "ה-Assistants API הישן — Threads, Runs, Assistant objects. עובר מעבר הדרגתי ל-Responses API החדש.",
        ["type:api","capability:agents","audience:developer","access:api-key"],
        ["legacy agent apps", "thread-based conversations"],
        API_TIERS, "inventory_only"),

    item("images-api", "Images API",
        "API",
        "API ליצירת ועריכת תמונות — DALL·E 3 ו-gpt-image-1, תומך ב-generation, editing ו-variations.",
        ["type:api","capability:image-generation","audience:developer","access:api-key","compare:imagen-api"],
        ["יצירת תמונות פרוגרמטית", "עריכת תמונות", "content creation"],
        API_TIERS, "inventory_only"),

    item("audio-api", "Audio API (Speech & Transcription)",
        "API",
        "API לאודיו — Whisper לתמלול, TTS לדיבור, תרגום, endpoints לדיבור→טקסט וטקסט→דיבור.",
        ["type:api","capability:speech-to-text","capability:text-to-speech","audience:developer","access:api-key"],
        ["תמלול שיחות", "voice synthesis", "multilingual audio"],
        API_TIERS, "inventory_only"),

    item("video-api-sora", "Videos API (Sora API)",
        "API",
        "API ליצירת וידאו מ-Sora — גישה פרוגרמטית ליצירת קליפים, בשלבי rollout מדורג.",
        ["type:api","capability:video-generation","audience:developer","access:api-key","compare:veo-api"],
        ["יצירת וידאו פרוגרמטית", "media production"],
        API_TIERS, "inventory_only"),

    item("fine-tuning-api", "Fine-tuning API",
        "API",
        "API לאימון מותאם אישית על מודלי GPT — Fine-tuning של GPT-4o-mini, GPT-3.5 ועוד על נתוני הלקוח.",
        ["type:api","capability:fine-tuning","audience:developer","access:api-key"],
        ["התאמת מודל לדומיין ספציפי", "שיפור דיוק", "persona"],
        API_TIERS, "inventory_only"),

    item("batch-api-openai", "Batch API (OpenAI)",
        "API",
        "API לעיבוד batch — הרצת בקשות גדולות בהנחה של 50% על המחיר, תוך 24 שעות.",
        ["type:api","capability:batch-processing","audience:developer","access:api-key","compare:anthropic-batch"],
        ["עיבוד מסמכים בכמות", "הערכת מודלים", "עיבוד לילה"],
        API_TIERS, "inventory_only"),

    item("embeddings-api-openai", "Embeddings API",
        "API",
        "API לוקטורי embeddings — text-embedding-3-large, text-embedding-3-small. בסיס ל-RAG וחיפוש סמנטי.",
        ["type:api","capability:embeddings","capability:rag","audience:developer","access:api-key","compare:vertex-embeddings"],
        ["RAG", "חיפוש סמנטי", "similarity search"],
        API_TIERS, "inventory_only"),

    item("files-api-openai", "Files API",
        "API",
        "API לניהול קבצים ב-OpenAI Platform — העלאה, אחסון ושימוש בקבצים ב-Assistants, Fine-tuning ו-Batch.",
        ["type:api","capability:file-management","audience:developer","access:api-key"],
        ["file storage", "document processing", "training data"],
        API_TIERS, "inventory_only"),

    item("vector-stores-openai", "Vector Stores (OpenAI)",
        "API",
        "מאגרי וקטורים מנוהלים ב-OpenAI Platform — אחסון embeddings עם File Search מובנה.",
        ["type:vector-db","capability:rag","capability:semantic-search","audience:developer","access:api-key","compare:vertex-vector-search"],
        ["RAG", "document Q&A", "knowledge bases"],
        API_TIERS, "inventory_only"),

    item("moderations-api-openai", "Moderations API (OpenAI)",
        "API",
        "API לסינון תוכן — בדיקת בקשות ותשובות מול מדיניות OpenAI, חינמי.",
        ["type:api","capability:content-moderation","audience:developer","access:free-tier"],
        ["safety filtering", "content policies", "NSFW detection"],
        [{"level": "free", "price": "$0", "access_key": "free"}], "inventory_only"),

    item("models-api-openai", "Models API",
        "API",
        "API לרשימת ולוהינ מודלים זמינים ב-OpenAI Platform.",
        ["type:api","capability:admin","audience:developer","access:api-key"],
        ["model discovery", "version management"],
        API_TIERS, "inventory_only"),

    # ─── Developer Tools ───────────────────────────────────────────────────────
    item("openai-playground", "OpenAI Playground",
        "Developer Tool",
        "ממשק ויזואלי לניסוי ב-OpenAI API — בדיקת prompts, השוואת מודלים, Assistants playground.",
        ["type:playground","capability:prototyping","audience:developer","access:api-key","compare:claude-workbench","compare:google-ai-studio"],
        ["ניסוי prompts", "בדיקת מודלים", "prototype agents"],
        API_TIERS, "inventory_only"),

    item("openai-dashboard", "OpenAI Dashboard",
        "Developer Tool",
        "לוח הבקרה של OpenAI Platform — ניהול API keys, usage, billing, projects, organization settings.",
        ["type:admin-console","capability:admin","audience:developer","access:api-key","compare:anthropic-console"],
        ["ניהול תקציב", "API keys", "usage monitoring"],
        API_TIERS, "inventory_only"),

    item("openai-agents-sdk", "OpenAI Agents SDK",
        "Developer SDK",
        "ה-SDK הרשמי של OpenAI לבניית agents — Python/JS, orchestration, tool calling, MCP support. מבוסס Responses API.",
        ["type:sdk","capability:agents","capability:orchestration","audience:developer","access:free","compare:claude-agent-sdk","compare:langchain"],
        ["בניית agents", "orchestration", "multi-step workflows", "tool use"],
        [{"level": "free", "price": "open-source", "access_key": "free"}], "inventory_only"),

    item("openai-mcp-support", "OpenAI MCP Support",
        "Developer Tool",
        "תמיכה ב-Model Context Protocol (MCP) של Anthropic ב-Agents SDK ו-Responses API של OpenAI — חיבור אחיד לכלים.",
        ["type:protocol","capability:integrations","capability:agents","audience:developer","access:free","compare:mcp-protocol"],
        ["חיבור כלים", "server integration", "cross-ecosystem tools"],
        [{"level": "free", "price": "open-source", "access_key": "free"}], "inventory_only"),

    item("function-calling-openai", "Function Calling (OpenAI)",
        "API Feature",
        "מנגנון קריאת פונקציות ב-API של OpenAI — מאפשר למודל לקרוא לפונקציות חיצוניות בצורה מובנית.",
        ["type:api-feature","capability:tool-use","audience:developer","access:api-key","compare:tool-use-api"],
        ["tool integrations", "agents", "structured outputs"],
        API_TIERS, "inventory_only"),

    item("code-interpreter-openai", "Code Interpreter / Advanced Data Analysis",
        "Assistant Feature",
        "כלי הרצת קוד מוטמע ב-ChatGPT — Python sandbox, ניתוח קבצים, גרפים, עיבוד נתונים. נקרא גם Data Analysis.",
        ["type:embedded-tool","capability:coding","capability:data-analysis","audience:consumer","audience:developer","access:api-key"],
        ["ניתוח נתונים", "הרצת קוד", "גרפים", "עיבוד Excel"],
        FREE_PAID, "inventory_only"),

    item("file-search-openai", "File Search / Retrieval (OpenAI)",
        "API Feature",
        "כלי חיפוש בקבצים עבור Assistants ו-Responses API — מנגנון RAG מובנה לשאילתות על מסמכים.",
        ["type:api-feature","capability:rag","capability:semantic-search","audience:developer","access:api-key","compare:claude-knowledge-base"],
        ["document Q&A", "RAG pipelines", "knowledge retrieval"],
        API_TIERS, "inventory_only"),

    # ─── Workspace / Enterprise ────────────────────────────────────────────────
    item("chatgpt-enterprise-analytics", "ChatGPT Enterprise Analytics",
        "Enterprise Feature",
        "כלי analytics לארגונים ב-ChatGPT Enterprise — דוחות שימוש, ניטור, insights לאדמינים.",
        ["type:analytics","capability:admin","audience:enterprise","access:enterprise-only"],
        ["usage monitoring", "compliance reporting", "team insights"],
        [{"level": "enterprise", "price": "custom", "access_key": "enterprise"}], "inventory_only"),

    item("chatgpt-admin-security", "ChatGPT Admin & Security Controls",
        "Enterprise Feature",
        "בקרות אבטחה ו-compliance ב-ChatGPT Enterprise וTeam — SSO, DLP, rate limits, data policies.",
        ["type:admin","capability:security","audience:enterprise","access:enterprise-only","compare:claude-enterprise-sso"],
        ["SSO", "SCIM", "DLP", "compliance"],
        [{"level": "enterprise", "price": "custom", "access_key": "enterprise"}], "inventory_only"),

    # ─── Media/Legacy ──────────────────────────────────────────────────────────
    item("codex-legacy", "Codex (Legacy Code Model)",
        "Legacy Model",
        "מודל קוד ייעודי ישן של OpenAI — Codex, בסיס GitHub Copilot הראשוני. הוחלף על ידי GPT-4o עם יכולות קוד.",
        ["type:legacy","capability:coding","audience:developer","access:api-key"],
        ["legacy code generation"],
        [], "inventory_only"),

    item("openai-gym-legacy", "OpenAI Gym (Legacy RL)",
        "Legacy Product",
        "סביבת Reinforcement Learning ישנה של OpenAI — openai/gym ב-GitHub, כלי מחקר היסטורי ב-RL.",
        ["type:legacy","capability:reinforcement-learning","audience:developer","access:free"],
        ["RL research", "simulation environments"],
        [{"level": "free", "price": "open-source", "access_key": "free"}], "inventory_only"),

    item("sora-ui", "Sora UI (ChatGPT)",
        "Assistant Feature",
        "ממשק Sora המוטמע ב-ChatGPT — יצירת וידאו ישירות מהשיחה ל-Plus/Pro, ב-ארה\"ב וקנדה.",
        ["type:embedded-tool","capability:video-generation","audience:consumer","access:paid"],
        ["יצירת וידאו מהשיחה", "media production"],
        FREE_PAID, "inventory_only"),

    item("openai-status", "OpenAI Status & Help Center",
        "Infrastructure",
        "עמוד הסטטוס של OpenAI (status.openai.com) ומרכז העזרה — ניטור תקלות, תיעוד ותמיכה.",
        ["type:support","audience:developer","audience:consumer","access:free-tier"],
        ["monitoring", "support", "documentation"],
        [{"level": "free", "price": "$0", "access_key": "free"}], "inventory_only"),
]

def main():
    data = load()
    existing_ids = {t["id"] for t in data["tools"]}

    # Remove old placeholder OpenAI tools
    old_openai = {"chatgpt", "chatgpt-full"}
    data["tools"] = [t for t in data["tools"] if t["id"] not in old_openai]

    added = 0
    for tool in NEW_TOOLS:
        if tool["id"] not in existing_ids:
            data["tools"].append(tool)
            added += 1
        else:
            print(f"  SKIP (exists): {tool['id']}")

    # Update or add OpenAI ecosystem entry
    eco_ids = {e["id"] for e in data["ecosystems"]}
    if "openai" not in eco_ids:
        data["ecosystems"].append({
            "id": "openai",
            "name": "OpenAI Ecosystem",
            "vendor": "OpenAI",
            "description": "ChatGPT, OpenAI API, GPT-4o, o-series reasoning models, DALL·E, Sora, Whisper — מוצרי AI של OpenAI",
            "color": "#10a37f",
            "tool_ids": [t["id"] for t in NEW_TOOLS]
        })
    else:
        for eco in data["ecosystems"]:
            if eco["id"] == "openai":
                eco["tool_ids"] = [t["id"] for t in NEW_TOOLS]
                eco["description"] = "ChatGPT, OpenAI API, GPT-4o, o-series reasoning models, DALL·E, Sora, Whisper — מוצרי AI של OpenAI"
                break

    # Add deep research record for OpenAI
    dr_ids = {dr["id"] for dr in data.get("deep_research_records", [])}
    if "dr-006" not in dr_ids:
        data["deep_research_records"].append({
            "id": "dr-006",
            "tool_id": "openai-platform",
            "ecosystem_id": "openai",
            "research_type": "ecosystem_overview",
            "research_date": TODAY,
            "researcher": "manual",
            "sources_used": ["להלן חלק א — מיפוי גבולות האקוסיסטם ועץ היררכי OpenAI).pdf"],
            "summary": "OpenAI Ecosystem — ChatGPT, GPT-4o, o-series, DALL·E, Sora, Whisper, Agents SDK, Responses API. מחקר breadth-first מ-PDF.",
            "key_findings": [
                "8+ שכבות: מודלים, consumer apps, GPT Store, API/Platform, developer tools, workspace, storage, legacy",
                "GPT-4o — מודל הדגל: מולטי-מודאלי, ChatGPT + API, מחיר מאוזן",
                "o-series (o1/o3) — reasoning models לבעיות מורכבות, Deep Research מבוסס עליהם",
                "ChatGPT Deep Research — agent מחקרי מוטמע, מחפש ומסנתז ממקורות רבים",
                "OpenAI Agents SDK — Python/JS SDK לבניית agents, תומך ב-MCP",
                "GPT Store + Custom GPTs — marketplace עם Actions לחיבור ל-APIs חיצוניים",
                "Responses API — מחליף Completions, בסיס לכל ה-agents החדשים",
                "Realtime API — WebSocket דו-כיווני לשיחות קוליות בזמן אמת",
                "5 תוכניות: Free/Plus($20)/Pro($200)/Team($30seat)/Enterprise(custom)"
            ],
            "confidence": 0.82,
            "version": 1,
            "notes": "חלק א בלבד — breadth-first. חסרים: embedded features מפורטים, partner integrations, pricing מדויק"
        })

    # Update stats
    total = len(data["tools"])
    data["stats"]["total_tools"] = total
    data["stats"]["total_ecosystems"] = len(data["ecosystems"])
    researched = sum(1 for t in data["tools"] if t["research_status"] == "deep_research_complete")
    data["stats"]["tools_researched"] = researched
    data["stats"]["tools_inventory_only"] = sum(1 for t in data["tools"] if t["research_status"] == "inventory_only")

    if "metadata" in data:
        data["metadata"]["last_updated"] = TODAY

    save(data)
    print(f"\nDone! Added {added} OpenAI tools. Total tools: {total}")
    print(f"Removed old placeholders: {old_openai}")

if __name__ == "__main__":
    main()
