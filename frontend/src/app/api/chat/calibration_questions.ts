/**
 * calibration_questions.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * לב מנגנון שאלות הדיוק — AI Intelligence Hub
 *
 * מטרה: לפני שהמערכת עונה, היא מזהה אוטומטית:
 *   1. סוג המשימה (מה המשתמש רוצה לעשות?)
 *   2. רמת הפירוט הנדרשת (כמה עמוק ללכת?)
 *   3. עדיפות המשתמש (מחיר / איכות / מהירות / איזון)
 *   4. כלים קיימים (מה כבר יש לו — ממנה פרופיל או שואל)
 *
 * שימוש: מיובא ב-route.ts ומורץ לפני בניית system prompt
 * ─────────────────────────────────────────────────────────────────────────────
 */

// ─── Types ────────────────────────────────────────────────────────────────────

/** כלי AI יחיד בפרופיל המשתמש */
export interface OwnedTool {
  id: string;           // תואם ל-id ב-tools_master.json (למשל: "claude", "chatgpt")
  name: string;         // שם תצוגה
  plan: "free" | "pro" | "team" | "api" | "unknown";
  ecosystem: string;    // "Anthropic" | "Google" | "OpenAI" | "Microsoft" | אחר
}

/** פרופיל משתמש מלא — ישמש בדף ההגדרות האישיות */
export interface UserProfile {
  userId?: string;
  displayName?: string;
  ownedTools: OwnedTool[];           // כלים שהמשתמש מחזיק מנוי עליהם
  preferredLanguage: "he" | "en";
  techLevel: "beginner" | "intermediate" | "advanced";
  monthlyBudget?: number;            // ב-$ — כמה מוכן לשלם בחודש
  primaryUseCase?: string;           // "coding" | "marketing" | "research" | "content" | "automation"
}

/** תוצאת הניתוח האוטומטי לפני כל תשובה */
export type CalibrationResult = {
  taskType:
    | "tool_recommendation"    // ממליץ על כלי AI
    | "tool_comparison"        // משווה בין כלים
    | "how_to_guide"           // הסבר כיצד לבצע משימה
    | "research"               // מחקר מעמיק על כלי / טכנולוגיה
    | "content_creation"       // כתיבת תוכן, פרומפטים, תסריטים
    | "automation"             // בניית workflow / אוטומציה
    | "presentation"           // מצגות, ויז'ואל, סליידים
    | "code_help"              // עזרה בקוד, debugging
    | "general_question";      // שאלה כללית

  detailLevel:
    | "quick"                  // תשובה קצרה וממוקדת (שאלה פשוטה)
    | "recommended"            // המלצה מנומקת עם השוואה (ברירת מחדל)
    | "full_guide";            // מדריך מלא צעד-אחר-צעד

  priority:
    | "price"                  // הכי זול שעובד
    | "quality"                // הכי טוב, מחיר לא חשוב
    | "speed"                  // הכי מהיר להתחיל
    | "balanced";              // ברירת מחדל — איזון

  existingTools: string[];     // IDs של כלים שיש למשתמש (מפרופיל או מזיהוי מהטקסט)
  relevantEcosystems: string[];// אקוסיסטמים רלוונטיים לשאלה

  needsClarification: boolean; // האם חסר מידע קריטי?
  clarificationQuestion?: string; // שאלה אחת ממוקדת לשאול (אם needsClarification=true)

  confidence: number;          // 0–1, כמה בטוחה הזיהוי האוטומטי
};

// ─── כלים ידועים לזיהוי בטקסט ───────────────────────────────────────────────
// מיפוי שמות נפוצים → tool ID ב-tools_master.json
const TOOL_MENTION_MAP: Record<string, string> = {
  // Anthropic
  "claude":         "claude",
  "claude code":    "claude-code",
  "claude pro":     "claude",
  "anthropic":      "claude",
  // Google
  "gemini":         "gemini",
  "google gemini":  "gemini",
  "ai studio":      "google-ai-studio",
  "google ai studio": "google-ai-studio",
  "gemma":          "gemma4",
  "notebooklm":     "notebooklm",
  // OpenAI
  "chatgpt":        "chatgpt",
  "gpt":            "chatgpt",
  "gpt-4":          "chatgpt",
  "gpt-4o":         "chatgpt",
  "openai":         "chatgpt",
  "dall-e":         "chatgpt",
  "dalle":          "chatgpt",
  "sora":           "chatgpt",
  // Microsoft
  "copilot":        "microsoft-copilot",
  "bing":           "microsoft-copilot",
  "github copilot": "github-copilot",
  // Coding
  "cursor":         "cursor-ide",
  "windsurf":       "windsurf-ide",
  "replit":         "replit-agent",
  "aider":          "aider-cline",
  "cline":          "aider-cline",
  "devin":          "devin-ai",
  "v0":             "v0-vercel",
  "v0.dev":         "v0-vercel",
  "lovable":        "lovable-dev",
  "bolt":           "bolt-new",
  "bolt.new":       "bolt-new",
  "base44":         "base44-israeli",
  // Automation
  "zapier":         "zapier-ai-agents",
  "make":           "make-automation",
  "n8n":            "n8n-automation",
  "gumloop":        "gumloop-ai",
  // Media
  "runway":         "runway-video",
  "heygen":         "heygen-avatars",
  "elevenlabs":     "elevenlabs-voice",
  "suno":           "suno-music",
  "midjourney":     "midjourney",
  // Research
  "perplexity":     "perplexity-ai",
  "notion":         "notion-ai",
};

// ─── מילות מפתח לזיהוי סוג משימה ────────────────────────────────────────────
const TASK_KEYWORDS: Record<CalibrationResult["taskType"], string[]> = {
  tool_recommendation: [
    "מה הכי טוב", "מה לבחור", "תמליץ", "איזה כלי", "עדיף",
    "best tool", "recommend", "which tool", "what should i use",
    "רוצה לבנות", "אני צריך כלי", "מחפש כלי",
  ],
  tool_comparison: [
    "מה ההבדל", "לעומת", "vs", "השוואה", "compare", "difference",
    "מול", "או", "cursor vs", "claude vs", "chatgpt vs",
    "מה עדיף", "איזה עדיף",
  ],
  how_to_guide: [
    "איך", "כיצד", "הסבר", "מדריך", "שלבים", "how to",
    "how do i", "explain", "guide", "צעד אחר צעד", "step by step",
  ],
  research: [
    "מחקר", "research", "מה זה", "what is", "מה היא",
    "הסבר לי על", "tell me about", "פרטים על", "עומק",
  ],
  content_creation: [
    "כתוב", "צור", "generate", "write", "תוכן", "content",
    "פרומפט", "prompt", "תסריט", "script", "מאמר",
  ],
  automation: [
    "אוטומציה", "automation", "workflow", "זרימה", "trigger",
    "webhook", "connect", "integrate", "חיבור", "אינטגרציה",
  ],
  presentation: [
    "מצגת", "presentation", "slides", "ppt", "deck",
    "ויז'ואל", "visual", "גמה", "gamma", "beautiful.ai",
  ],
  code_help: [
    "קוד", "code", "bug", "שגיאה", "error", "debug",
    "function", "api", "typescript", "python", "javascript",
    "react", "next.js", "בעיה בקוד",
  ],
  general_question: [],  // fallback
};

// ─── מילות מפתח לזיהוי עדיפות ────────────────────────────────────────────────
const PRIORITY_KEYWORDS: Record<CalibrationResult["priority"], string[]> = {
  price:    ["חינם", "זול", "בלי לשלם", "תקציב נמוך", "free", "cheap", "budget", "ללא עלות", "בחינם"],
  quality:  ["הכי טוב", "מקצועי", "איכות", "מדויק", "best", "quality", "professional", "ללא פשרות"],
  speed:    ["מהיר", "מהירות", "עכשיו", "מיד", "quickly", "fast", "asap", "בהקדם", "דחוף"],
  balanced: [],  // fallback
};

// ─── מילות מפתח לזיהוי רמת פירוט ────────────────────────────────────────────
const DETAIL_KEYWORDS = {
  quick:      ["קצר", "בקצרה", "תלסכם", "briefly", "quick", "tldr", "בקצר", "רק תגיד לי"],
  full_guide: ["מדריך מלא", "כל השלבים", "בפירוט", "step by step", "צעד אחר צעד", "full guide", "הכל"],
};

// ─── פונקציית ניתוח עיקרית ───────────────────────────────────────────────────

/**
 * detectCalibration — מנתח הודעת משתמש ומחזיר CalibrationResult
 *
 * @param userMessage - הודעת המשתמש הנוכחית
 * @param userProfile - פרופיל משתמש (אופציונלי — אם קיים, מוסיף כלים קיימים)
 * @param conversationHistory - היסטוריית שיחה (לזיהוי מידע שכבר נאמר)
 */
export function detectCalibration(
  userMessage: string,
  userProfile?: UserProfile,
  conversationHistory?: { role: string; content: string }[]
): CalibrationResult {
  const q = userMessage.toLowerCase();

  // ── 1. זיהוי סוג משימה ────────────────────────────────────────────────────
  let taskType: CalibrationResult["taskType"] = "general_question";
  let taskScore = 0;

  for (const [type, keywords] of Object.entries(TASK_KEYWORDS) as [CalibrationResult["taskType"], string[]][]) {
    if (type === "general_question") continue;
    const matches = keywords.filter(kw => q.includes(kw.toLowerCase())).length;
    if (matches > taskScore) {
      taskScore = matches;
      taskType = type;
    }
  }

  // ── 2. זיהוי עדיפות ────────────────────────────────────────────────────────
  let priority: CalibrationResult["priority"] = "balanced";
  for (const [p, keywords] of Object.entries(PRIORITY_KEYWORDS) as [CalibrationResult["priority"], string[]][]) {
    if (p === "balanced") continue;
    if (keywords.some(kw => q.includes(kw.toLowerCase()))) {
      priority = p;
      break;
    }
  }

  // ── 3. זיהוי רמת פירוט ────────────────────────────────────────────────────
  let detailLevel: CalibrationResult["detailLevel"] = "recommended";
  if (DETAIL_KEYWORDS.quick.some(kw => q.includes(kw.toLowerCase()))) {
    detailLevel = "quick";
  } else if (DETAIL_KEYWORDS.full_guide.some(kw => q.includes(kw.toLowerCase()))) {
    detailLevel = "full_guide";
  } else if (taskType === "how_to_guide" || taskType === "automation") {
    detailLevel = "full_guide";  // משימות מורכבות → פירוט אוטומטי
  }

  // ── 4. זיהוי כלים קיימים ─────────────────────────────────────────────────
  const existingTools: string[] = [];

  // מפרופיל משתמש
  if (userProfile?.ownedTools?.length) {
    existingTools.push(...userProfile.ownedTools.map(t => t.id));
  }

  // זיהוי מהטקסט — "יש לי ChatGPT Plus", "אני משתמש ב-Cursor"
  const ownershipPhrases = ["יש לי", "משתמש ב", "רכשתי", "קניתי", "i have", "i use", "i'm using", "subscribed to"];
  const textMentionsOwnership = ownershipPhrases.some(p => q.includes(p));

  if (textMentionsOwnership || !userProfile) {
    for (const [mention, toolId] of Object.entries(TOOL_MENTION_MAP)) {
      if (q.includes(mention.toLowerCase()) && !existingTools.includes(toolId)) {
        existingTools.push(toolId);
      }
    }
  }

  // זיהוי מהיסטוריית שיחה
  if (conversationHistory) {
    for (const msg of conversationHistory) {
      const h = msg.content.toLowerCase();
      if (ownershipPhrases.some(p => h.includes(p))) {
        for (const [mention, toolId] of Object.entries(TOOL_MENTION_MAP)) {
          if (h.includes(mention.toLowerCase()) && !existingTools.includes(toolId)) {
            existingTools.push(toolId);
          }
        }
      }
    }
  }

  // ── 5. זיהוי אקוסיסטמים רלוונטיים ────────────────────────────────────────
  const ecosystemKeywords: Record<string, string[]> = {
    Anthropic: ["claude", "anthropic", "claude code"],
    Google:    ["gemini", "google", "ai studio", "gemma", "bard"],
    OpenAI:    ["chatgpt", "gpt", "openai", "dall-e", "sora"],
    Microsoft: ["microsoft", "copilot", "bing", "azure", "office"],
    Coding:    ["cursor", "windsurf", "github copilot", "replit", "v0", "lovable", "bolt"],
    Automation:["zapier", "make", "n8n", "airtable", "workflow", "אוטומציה"],
    Media:     ["runway", "heygen", "elevenlabs", "suno", "midjourney", "וידאו", "תמונה", "קול"],
    Research:  ["perplexity", "notion", "מחקר"],
  };

  const relevantEcosystems: string[] = [];
  for (const [eco, keywords] of Object.entries(ecosystemKeywords)) {
    if (keywords.some(kw => q.includes(kw.toLowerCase()))) {
      relevantEcosystems.push(eco);
    }
  }

  // ── 6. האם צריך הבהרה? ────────────────────────────────────────────────────
  let needsClarification = false;
  let clarificationQuestion: string | undefined;

  if (taskType === "tool_recommendation" && existingTools.length === 0 && !userProfile) {
    needsClarification = true;
    clarificationQuestion = "כדי שאוכל להמליץ הכי טוב — יש לך מנויים קיימים לכלים כמו ChatGPT Plus, Claude Pro, Cursor או אחרים?";
  } else if (taskType === "tool_recommendation" && priority === "balanced") {
    // אם לא ידוע תקציב ולא ידוע מה חשוב לו
    const budgetMentioned = ["$", "שקל", "תקציב", "budget", "מחיר"].some(p => q.includes(p));
    if (!budgetMentioned && !userProfile?.monthlyBudget) {
      needsClarification = true;
      clarificationQuestion = "מה חשוב לך יותר: לחסוך כסף, לקבל את הכי מהיר, או לקבל את הכי איכותי?";
    }
  } else if (taskType === "automation" && relevantEcosystems.length === 0) {
    needsClarification = true;
    clarificationQuestion = "מה אתה רוצה לחבר? (לדוגמה: Gmail → Notion, או WhatsApp → Google Sheets)";
  }

  // ── 7. חישוב confidence ─────────────────────────────────────────────────
  const confidence = Math.min(
    1,
    (taskScore > 0 ? 0.4 : 0.1) +
    (existingTools.length > 0 ? 0.2 : 0) +
    (relevantEcosystems.length > 0 ? 0.2 : 0) +
    (priority !== "balanced" ? 0.1 : 0) +
    (detailLevel !== "recommended" ? 0.1 : 0)
  );

  return {
    taskType,
    detailLevel,
    priority,
    existingTools,
    relevantEcosystems,
    needsClarification,
    clarificationQuestion,
    confidence,
  };
}

// ─── פונקציית עזר: בנה הקשר כיוון לפרומפט ────────────────────────────────────

/**
 * calibrationToPromptHint — ממיר CalibrationResult להנחיות בתוך system prompt
 * מיובא ב-route.ts ומוסף לפני ה-wiki context
 */
export function calibrationToPromptHint(cal: CalibrationResult): string {
  const lines: string[] = ["## הקשר אוטומטי לשאלה הנוכחית:"];

  const taskLabels: Record<CalibrationResult["taskType"], string> = {
    tool_recommendation: "המלצת כלי AI",
    tool_comparison:     "השוואת כלים",
    how_to_guide:        "מדריך ביצוע",
    research:            "מחקר עמוק",
    content_creation:    "יצירת תוכן",
    automation:          "בניית אוטומציה",
    presentation:        "עזרה במצגת",
    code_help:           "עזרה בקוד",
    general_question:    "שאלה כללית",
  };

  const detailLabels: Record<CalibrationResult["detailLevel"], string> = {
    quick:      "תשובה קצרה וממוקדת בלבד",
    recommended:"המלצה מנומקת עם השוואה",
    full_guide: "מדריך מלא צעד-אחר-צעד עם הסברים",
  };

  const priorityLabels: Record<CalibrationResult["priority"], string> = {
    price:    "עדיפות מחיר נמוך (העדף כלים חינמיים/זולים)",
    quality:  "עדיפות איכות מקסימלית",
    speed:    "עדיפות מהירות — הכי מהיר להתחיל",
    balanced: "איזון בין מחיר לאיכות",
  };

  lines.push(`- **סוג משימה:** ${taskLabels[cal.taskType]}`);
  lines.push(`- **רמת פירוט נדרשת:** ${detailLabels[cal.detailLevel]}`);
  lines.push(`- **עדיפות המשתמש:** ${priorityLabels[cal.priority]}`);

  if (cal.existingTools.length > 0) {
    lines.push(`- **כלים שיש למשתמש:** ${cal.existingTools.join(", ")} — **העדף המלצות שמנצלות אותם**`);
  } else {
    lines.push(`- **כלים קיימים:** לא ידוע — אל תניח שיש לו מנויים`);
  }

  if (cal.relevantEcosystems.length > 0) {
    lines.push(`- **אקוסיסטמים רלוונטיים:** ${cal.relevantEcosystems.join(", ")}`);
  }

  if (cal.needsClarification && cal.clarificationQuestion) {
    lines.push(`\n⚠️ **חסר מידע קריטי** — שאל תחילה: "${cal.clarificationQuestion}"`);
    lines.push(`(אחרי שתקבל תשובה — ספק המלצה מלאה. אל תשאל יותר משאלה אחת.)`);
  }

  lines.push(`- **רמת ביטחון בניתוח:** ${Math.round(cal.confidence * 100)}%`);

  return lines.join("\n");
}

// ─── פונקציית עזר: פרופיל ריק (ברירת מחדל) ───────────────────────────────────
export function emptyUserProfile(): UserProfile {
  return {
    ownedTools: [],
    preferredLanguage: "he",
    techLevel: "intermediate",
  };
}
