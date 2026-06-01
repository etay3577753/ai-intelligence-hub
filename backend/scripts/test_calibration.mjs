/**
 * test_calibration.mjs
 * בדיקה פנימית של לוגיקת detectCalibration ללא TypeScript compiler.
 * מממש מחדש את הלוגיקה ב-vanilla JS כדי לאמת את הזרימה.
 */

// ── מקביל ל-calibration_questions.ts ──────────────────────────────────────────

const TOOL_MENTION_MAP = {
  "claude": "claude", "claude code": "claude-code", "claude pro": "claude",
  "anthropic": "claude", "gemini": "gemini", "google gemini": "gemini",
  "ai studio": "google-ai-studio", "google ai studio": "google-ai-studio",
  "gemma": "gemma4", "notebooklm": "notebooklm", "chatgpt": "chatgpt",
  "gpt": "chatgpt", "gpt-4": "chatgpt", "gpt-4o": "chatgpt",
  "openai": "chatgpt", "dall-e": "chatgpt", "dalle": "chatgpt",
  "sora": "chatgpt", "copilot": "microsoft-copilot", "bing": "microsoft-copilot",
  "github copilot": "github-copilot", "cursor": "cursor-ide",
  "windsurf": "windsurf-ide", "replit": "replit-agent", "aider": "aider-cline",
  "cline": "aider-cline", "devin": "devin-ai", "v0": "v0-vercel",
  "v0.dev": "v0-vercel", "lovable": "lovable-dev", "bolt": "bolt-new",
  "bolt.new": "bolt-new", "base44": "base44-israeli",
  "zapier": "zapier-ai-agents", "make": "make-automation", "n8n": "n8n-automation",
  "gumloop": "gumloop-ai", "runway": "runway-video", "heygen": "heygen-avatars",
  "elevenlabs": "elevenlabs-voice", "suno": "suno-music",
  "midjourney": "midjourney", "perplexity": "perplexity-ai", "notion": "notion-ai",
};

const TASK_KEYWORDS = {
  tool_recommendation: ["מה הכי טוב","מה לבחור","תמליץ","איזה כלי","עדיף","best tool","recommend","which tool","what should i use","רוצה לבנות","אני צריך כלי","מחפש כלי"],
  tool_comparison:     ["מה ההבדל","לעומת","vs","השוואה","compare","difference","מול","או","cursor vs","claude vs","chatgpt vs","מה עדיף","איזה עדיף"],
  how_to_guide:        ["איך","כיצד","הסבר","מדריך","שלבים","how to","how do i","explain","guide","צעד אחר צעד","step by step"],
  research:            ["מחקר","research","מה זה","what is","מה היא","הסבר לי על","tell me about","פרטים על","עומק"],
  content_creation:    ["כתוב","צור","generate","write","תוכן","content","פרומפט","prompt","תסריט","script","מאמר"],
  automation:          ["אוטומציה","automation","workflow","זרימה","trigger","webhook","connect","integrate","חיבור","אינטגרציה"],
  presentation:        ["מצגת","presentation","slides","ppt","deck","ויז'ואל","visual","גמה","gamma","beautiful.ai"],
  code_help:           ["קוד","code","bug","שגיאה","error","debug","function","api","typescript","python","javascript","react","next.js","בעיה בקוד"],
  general_question:    [],
};

const PRIORITY_KEYWORDS = {
  price:    ["חינם","זול","בלי לשלם","תקציב נמוך","free","cheap","budget","ללא עלות","בחינם"],
  quality:  ["הכי טוב","מקצועי","איכות","מדויק","best","quality","professional","ללא פשרות"],
  speed:    ["מהיר","מהירות","עכשיו","מיד","quickly","fast","asap","בהקדם","דחוף"],
  balanced: [],
};

const DETAIL_KEYWORDS = {
  quick:      ["קצר","בקצרה","תלסכם","briefly","quick","tldr","בקצר","רק תגיד לי"],
  full_guide: ["מדריך מלא","כל השלבים","בפירוט","step by step","צעד אחר צעד","full guide","הכל"],
};

const ECOSYSTEM_KEYWORDS = {
  Anthropic: ["claude","anthropic","claude code"],
  Google:    ["gemini","google","ai studio","gemma","bard"],
  OpenAI:    ["chatgpt","gpt","openai","dall-e","sora"],
  Microsoft: ["microsoft","copilot","bing","azure","office"],
  Coding:    ["cursor","windsurf","github copilot","replit","v0","lovable","bolt"],
  Automation:["zapier","make","n8n","airtable","workflow","אוטומציה"],
  Media:     ["runway","heygen","elevenlabs","suno","midjourney","וידאו","תמונה","קול"],
  Research:  ["perplexity","notion","מחקר"],
};

function detectCalibration(userMessage, userProfile, conversationHistory) {
  const q = userMessage.toLowerCase();

  // 1. סוג משימה
  let taskType = "general_question";
  let taskScore = 0;
  for (const [type, keywords] of Object.entries(TASK_KEYWORDS)) {
    if (type === "general_question") continue;
    const matches = keywords.filter(kw => q.includes(kw.toLowerCase())).length;
    if (matches > taskScore) { taskScore = matches; taskType = type; }
  }

  // 2. עדיפות
  let priority = "balanced";
  for (const [p, keywords] of Object.entries(PRIORITY_KEYWORDS)) {
    if (p === "balanced") continue;
    if (keywords.some(kw => q.includes(kw.toLowerCase()))) { priority = p; break; }
  }

  // 3. רמת פירוט
  let detailLevel = "recommended";
  if (DETAIL_KEYWORDS.quick.some(kw => q.includes(kw.toLowerCase()))) detailLevel = "quick";
  else if (DETAIL_KEYWORDS.full_guide.some(kw => q.includes(kw.toLowerCase()))) detailLevel = "full_guide";
  else if (taskType === "how_to_guide" || taskType === "automation") detailLevel = "full_guide";

  // 4. כלים קיימים
  const existingTools = [];
  if (userProfile?.ownedTools?.length) existingTools.push(...userProfile.ownedTools.map(t => t.id));
  const ownershipPhrases = ["יש לי","משתמש ב","רכשתי","קניתי","i have","i use","i'm using","subscribed to"];
  const textMentionsOwnership = ownershipPhrases.some(p => q.includes(p));
  if (textMentionsOwnership || !userProfile) {
    for (const [mention, toolId] of Object.entries(TOOL_MENTION_MAP)) {
      if (q.includes(mention.toLowerCase()) && !existingTools.includes(toolId)) existingTools.push(toolId);
    }
  }

  // 5. אקוסיסטמים
  const relevantEcosystems = [];
  for (const [eco, keywords] of Object.entries(ECOSYSTEM_KEYWORDS)) {
    if (keywords.some(kw => q.includes(kw.toLowerCase()))) relevantEcosystems.push(eco);
  }

  // 6. הבהרה
  let needsClarification = false;
  let clarificationQuestion;
  if (taskType === "tool_recommendation" && existingTools.length === 0 && !userProfile) {
    needsClarification = true;
    clarificationQuestion = "כדי שאוכל להמליץ הכי טוב — יש לך מנויים קיימים לכלים כמו ChatGPT Plus, Claude Pro, Cursor או אחרים?";
  } else if (taskType === "tool_recommendation" && priority === "balanced") {
    const budgetMentioned = ["$","שקל","תקציב","budget","מחיר"].some(p => q.includes(p));
    if (!budgetMentioned && !userProfile?.monthlyBudget) {
      needsClarification = true;
      clarificationQuestion = "מה חשוב לך יותר: לחסוך כסף, לקבל את הכי מהיר, או לקבל את הכי איכותי?";
    }
  } else if (taskType === "automation" && relevantEcosystems.length === 0) {
    needsClarification = true;
    clarificationQuestion = "מה אתה רוצה לחבר? (לדוגמה: Gmail → Notion, או WhatsApp → Google Sheets)";
  }

  // 7. confidence
  const confidence = Math.min(1,
    (taskScore > 0 ? 0.4 : 0.1) +
    (existingTools.length > 0 ? 0.2 : 0) +
    (relevantEcosystems.length > 0 ? 0.2 : 0) +
    (priority !== "balanced" ? 0.1 : 0) +
    (detailLevel !== "recommended" ? 0.1 : 0)
  );

  return { taskType, detailLevel, priority, existingTools, relevantEcosystems,
           needsClarification, clarificationQuestion, confidence };
}

function calibrationToPromptHint(cal) {
  const taskLabels = {
    tool_recommendation:"המלצת כלי AI", tool_comparison:"השוואת כלים",
    how_to_guide:"מדריך ביצוע", research:"מחקר עמוק",
    content_creation:"יצירת תוכן", automation:"בניית אוטומציה",
    presentation:"עזרה במצגת", code_help:"עזרה בקוד", general_question:"שאלה כללית",
  };
  const detailLabels = {
    quick:"תשובה קצרה וממוקדת בלבד",
    recommended:"המלצה מנומקת עם השוואה",
    full_guide:"מדריך מלא צעד-אחר-צעד עם הסברים",
  };
  const priorityLabels = {
    price:"עדיפות מחיר נמוך (העדף כלים חינמיים/זולים)",
    quality:"עדיפות איכות מקסימלית",
    speed:"עדיפות מהירות — הכי מהיר להתחיל",
    balanced:"איזון בין מחיר לאיכות",
  };
  const lines = ["## הקשר אוטומטי לשאלה הנוכחית:"];
  lines.push(`- **סוג משימה:** ${taskLabels[cal.taskType]}`);
  lines.push(`- **רמת פירוט נדרשת:** ${detailLabels[cal.detailLevel]}`);
  lines.push(`- **עדיפות המשתמש:** ${priorityLabels[cal.priority]}`);
  if (cal.existingTools.length > 0)
    lines.push(`- **כלים שיש למשתמש:** ${cal.existingTools.join(", ")} — **העדף המלצות שמנצלות אותם**`);
  else
    lines.push(`- **כלים קיימים:** לא ידוע — אל תניח שיש לו מנויים`);
  if (cal.relevantEcosystems.length > 0)
    lines.push(`- **אקוסיסטמים רלוונטיים:** ${cal.relevantEcosystems.join(", ")}`);
  if (cal.needsClarification && cal.clarificationQuestion) {
    lines.push(`\n⚠️ **חסר מידע קריטי** — שאל תחילה: "${cal.clarificationQuestion}"`);
    lines.push(`(אחרי שתקבל תשובה — ספק המלצה מלאה. אל תשאל יותר משאלה אחת.)`);
  }
  lines.push(`- **רמת ביטחון בניתוח:** ${Math.round(cal.confidence * 100)}%`);
  return lines.join("\n");
}

// ══════════════════════════════════════════════════════════════════════════════
// RUN TESTS
// ══════════════════════════════════════════════════════════════════════════════

const ADMIN_PROFILE = {
  userId: "admin",
  displayName: "Admin",
  ownedTools: [],
  preferredLanguage: "he",
  techLevel: "beginner",
  monthlyBudget: 20,
  primaryUseCase: undefined,
};

const TESTS = [
  {
    label: 'בדיקה 1 — "אני רוצה להכין מצגת על AI לעבודה"',
    message: "אני רוצה להכין מצגת על AI לעבודה",
    profile: ADMIN_PROFILE,
  },
  {
    label: 'בדיקה 2 — "מה ההבדל בין Claude ל-ChatGPT?"',
    message: "מה ההבדל בין Claude ל-ChatGPT?",
    profile: ADMIN_PROFILE,
  },
  {
    label: 'בדיקה 3 — "אני צריך כלי חינמי לאוטומציה"',
    message: "אני צריך כלי חינמי לאוטומציה בין Gmail לגוגל שיטס",
    profile: ADMIN_PROFILE,
  },
  {
    label: 'בדיקה 4 — "איך אני מחבר n8n עם WhatsApp?"',
    message: "איך אני מחבר n8n עם WhatsApp? צעד אחר צעד",
    profile: ADMIN_PROFILE,
  },
];

for (const test of TESTS) {
  console.log("\n" + "═".repeat(70));
  console.log(test.label);
  console.log("─".repeat(70));
  const cal = detectCalibration(test.message, test.profile, []);
  console.log("CalibrationResult:", JSON.stringify(cal, null, 2));
  console.log("\nPrompt Hint שנשלח ל-Claude:");
  console.log(calibrationToPromptHint(cal));
}

console.log("\n✅ כל הבדיקות הושלמו");
