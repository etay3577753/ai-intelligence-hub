import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const WIKI_DIR      = path.join(process.cwd(), "..", "backend", "data", "wiki");
const GEMINI_KEY    = process.env.GEMINI_API_KEY ?? "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";

// ─── Ecosystem routing map ─────────────────────────────────────────────────────
// כל קובץ wiki ממופה לאקוסיסטם + מקלידי רלוונטיות
const WIKI_ECOSYSTEM_MAP: Record<string, { ecosystem: string; keywords: string[] }> = {
  "claude-code.md":       { ecosystem: "Anthropic", keywords: ["claude code", "cli", "טרמינל", "terminal", "קוד", "code", "agentic", "bash"] },
  "claude.md":            { ecosystem: "Anthropic", keywords: ["claude", "אנתרופיק", "anthropic", "claude.ai", "claude pro", "projects", "artifacts"] },
  "claude-ai-web.md":     { ecosystem: "Anthropic", keywords: ["claude.ai", "claude pro", "claude web", "ממשק claude"] },
  "anthropic-api.md":     { ecosystem: "Anthropic", keywords: ["anthropic api", "api key", "sdk", "מפתח api"] },
  "mcp-protocol.md":      { ecosystem: "Anthropic", keywords: ["mcp", "model context protocol", "tools", "integrations", "חיבורים"] },
  "claude-agent-sdk.md":  { ecosystem: "Anthropic", keywords: ["agent sdk", "multi-agent", "agents", "סוכן", "אוטומציה"] },
  "claude-cowork.md":     { ecosystem: "Anthropic", keywords: ["claude cowork", "cowork", "שיתוף פעולה"] },
  "claude-in-chrome.md":  { ecosystem: "Anthropic", keywords: ["chrome", "browser", "דפדפן", "claude in chrome"] },
  "anthropic-company.md": { ecosystem: "Anthropic", keywords: ["anthropic", "חברה", "היסטוריה", "constitutional ai"] },
  "claude-quark.md":      { ecosystem: "Anthropic", keywords: ["quark", "claude quark"] },

  "google-ai-studio.md":  { ecosystem: "Google", keywords: ["ai studio", "google ai", "studio", "gemini api", "grounding", "tokens ארוך", "מסמכים", "1m tokens"] },
  "google-gemini-full.md":{ ecosystem: "Google", keywords: ["gemini", "google", "gemini.google.com", "gemini advanced", "gemini pro"] },
  "gemma4-local.md":      { ecosystem: "Google", keywords: ["gemma", "local", "מקומי", "ollama", "פרטיות"] },

  "chatgpt.md":           { ecosystem: "OpenAI", keywords: ["chatgpt", "gpt", "openai", "chat.openai"] },
  "chatgpt-full.md":      { ecosystem: "OpenAI", keywords: ["chatgpt", "gpt-4", "gpt-4o", "openai", "dall-e", "code interpreter"] },

  "cursor-ide.md":        { ecosystem: "Coding", keywords: ["cursor", "ide", "עורך קוד", "vs code", "autocomplete", "editor"] },
  "cursor-agents.md":     { ecosystem: "Coding", keywords: ["cursor agents", "cursor agent", "agent mode cursor"] },
  "github-copilot.md":    { ecosystem: "Coding", keywords: ["copilot", "github", "github copilot", "inline", "suggestions"] },
  "windsurf-ide.md":      { ecosystem: "Coding", keywords: ["windsurf", "codeium", "ide", "עורך"] },
  "aider-cline.md":       { ecosystem: "Coding", keywords: ["aider", "cline", "cli", "open source", "קוד פתוח"] },

  "lovable-dev.md":       { ecosystem: "NoCode", keywords: ["lovable", "no-code", "אתר", "web app", "react", "ממשק"] },
  "bolt-new.md":          { ecosystem: "NoCode", keywords: ["bolt", "bolt.new", "stackblitz", "web", "agentic"] },
  "v0-vercel.md":         { ecosystem: "NoCode", keywords: ["v0", "vercel", "ui", "components", "react", "shadcn"] },
  "replit-agent.md":      { ecosystem: "NoCode", keywords: ["replit", "deploy", "full stack", "hosting"] },
  "devin-ai.md":          { ecosystem: "NoCode", keywords: ["devin", "software engineer", "ai developer"] },

  "n8n-automation.md":    { ecosystem: "Automation", keywords: ["n8n", "automation", "workflow", "אוטומציה", "open source"] },
  "make-automation.md":   { ecosystem: "Automation", keywords: ["make", "integromat", "automation", "זרימה"] },
  "zapier-ai-agents.md":  { ecosystem: "Automation", keywords: ["zapier", "automation", "integration", "אינטגרציה"] },
  "gumloop-ai.md":        { ecosystem: "Automation", keywords: ["gumloop", "automation", "scraping"] },

  "perplexity-ai.md":     { ecosystem: "Research", keywords: ["perplexity", "מחקר", "search", "חיפוש", "מקורות", "web search"] },
  "notion-ai.md":         { ecosystem: "Productivity", keywords: ["notion", "ניהול", "documents", "wiki", "workspace"] },
  "microsoft-copilot.md": { ecosystem: "Microsoft", keywords: ["microsoft", "copilot", "office", "teams", "bing"] },

  "runway-video.md":      { ecosystem: "Media", keywords: ["runway", "video", "וידאו", "animation", "gen-2"] },
  "heygen-avatars.md":    { ecosystem: "Media", keywords: ["heygen", "avatar", "אוואטר", "וידאו", "presenter"] },
  "elevenlabs-voice.md":  { ecosystem: "Media", keywords: ["elevenlabs", "voice", "קול", "tts", "text to speech"] },
  "suno-music.md":        { ecosystem: "Media", keywords: ["suno", "music", "מוזיקה", "audio"] },
  "did-israeli.md":       { ecosystem: "Media", keywords: ["d-id", "did", "ישראלי", "avatar", "video"] },

  "browser-use-oss.md":   { ecosystem: "Automation", keywords: ["browser use", "browser automation", "web scraping", "דפדפן"] },
  "base44-israeli.md":    { ecosystem: "Israeli", keywords: ["base44", "בייס", "ישראלי", "no-code", "אפליקציה"] },
  "nemoclaw-openclaw.md": { ecosystem: "Israeli", keywords: ["nemoclaw", "openclaw", "ישראלי", "open source"] },
  "jasper-copyai.md":     { ecosystem: "Content", keywords: ["jasper", "copy.ai", "copywriting", "שיווק", "marketing"] },
};

// ─── Dynamic wiki loader — RAG based on actual question ───────────────────────
function loadWikiForQuestion(lastUserMessage: string): { ctx: string; usedFiles: string[] } {
  if (!fs.existsSync(WIKI_DIR)) return { ctx: "", usedFiles: [] };

  const q = lastUserMessage.toLowerCase();

  // Score every wiki file against the user's question
  const scores: { file: string; score: number }[] = [];

  for (const [fname, meta] of Object.entries(WIKI_ECOSYSTEM_MAP)) {
    let score = 0;
    for (const kw of meta.keywords) {
      if (q.includes(kw.toLowerCase())) {
        // Multi-word keywords score higher
        score += kw.includes(" ") ? 4 : 2;
      }
    }
    // Boost if filename stem appears in query
    const stem = fname.replace(".md", "").replace(/-/g, " ");
    if (q.includes(stem)) score += 3;

    if (score > 0) scores.push({ file: fname, score });
  }

  // Sort by score descending
  scores.sort((a, b) => b.score - a.score);

  // If nothing matched — use general top files
  const toLoad = scores.length > 0
    ? scores.slice(0, 8).map(s => s.file)
    : ["claude-code.md", "cursor-ide.md", "google-gemini-full.md", "chatgpt.md", "lovable-dev.md", "perplexity-ai.md", "notion-ai.md", "n8n-automation.md"];

  // Build context
  let ctx = "";
  let totalChars = 0;
  const MAX_TOTAL = 80000;
  const MAX_PER_FILE = 15000;
  const usedFiles: string[] = [];

  for (const fname of toLoad) {
    if (totalChars >= MAX_TOTAL) break;
    const fpath = path.join(WIKI_DIR, fname);
    if (!fs.existsSync(fpath)) continue;
    const raw = fs.readFileSync(fpath, "utf-8");
    const snippet = raw.length > MAX_PER_FILE ? raw.slice(0, MAX_PER_FILE) + "\n...[נקצר]" : raw;
    ctx += `\n\n=== ${fname} (${WIKI_ECOSYSTEM_MAP[fname]?.ecosystem ?? ""}) ===\n${snippet}`;
    totalChars += snippet.length;
    usedFiles.push(fname);
  }

  return { ctx, usedFiles };
}

// ─── Ecosystem routing decision guide ─────────────────────────────────────────
// זה הלב של מתדולוגיית קבלת ההחלטות:
// לכל אקוסיסטם — מתי ללכת לאיזה כלי ספציפי + הדרכת UI
const ECOSYSTEM_ROUTING = `
## מדריך ניתוב אקוסיסטמים — כאשר ממליץ על כלי, היה ספציפי לרמת ה-URL ופעולות UI

### Anthropic — מתי לאן ולמה:
| מקרה שימוש | הכלי הנכון | URL | הערה |
|------------|------------|-----|-------|
| שיחה/שאלות/כתיבה יומיומית | claude.ai | https://claude.ai | בחר "Claude Sonnet" מהתפריט למטה |
| צריך לזכור מסמכים/קבצים לאורך זמן | claude.ai → Projects | https://claude.ai → לחץ "New Project" | העלה קבצים ל-Knowledge Base של הProject |
| קוד בפרויקט קיים על המחשב | Claude Code (CLI) | npm install -g @anthropic-ai/claude-code | פתח terminal בתיקיית הפרויקט → claude |
| בניית agent/אפליקציה שמשתמשת ב-Claude | Anthropic API | https://console.anthropic.com | צור API key → בחר claude-sonnet-4-6 |
| חיבור Claude לכלים חיצוניים (GitHub, DB) | Claude Code + MCP | ב-CLAUDE.md: הגדר mcp servers | ראה תיעוד MCP |

### Google — מתי לאן ולמה:
| מקרה שימוש | הכלי הנכון | URL | הוראת UI |
|------------|------------|-----|----------|
| שיחה רגילה / שאלות כלליות | gemini.google.com | https://gemini.google.com | Gemini 2.0 Flash — מהיר וחינמי |
| צריך context ארוך (1M+ tokens) / מסמכים ענקיים | Google AI Studio | https://aistudio.google.com | מסך ראשי → "Create prompt" → בחר **Gemini 2.5 Pro** בתפריט המודל (ימין למעלה) |
| צריך חיפוש web בזמן אמת בתוך הפרומפט | Google AI Studio | https://aistudio.google.com | ב-Studio: Enable **"Grounding with Google Search"** (הגדרות ימין) |
| לבנות אפליקציה מאפס ב-AI | Google AI Studio | https://aistudio.google.com → "Build" tab | בחר מודל → לחץ **"Build"** → מקבל React+Node.js |
| LLM מקומי, ללא שליחת נתונים לענן | Gemma via Ollama | ollama pull gemma3 | ריצה מקומית על GPU/CPU |

### OpenAI — מתי לאן ולמה:
| מקרה שימוש | הכלי הנכון | URL | הוראת UI |
|------------|------------|-----|----------|
| שיחה יומיומית, תמונות, DALL-E | ChatGPT | https://chat.openai.com | בחר GPT-4o מהתפריט למעלה |
| צריך לנתח קבצי Excel/PDF/קוד | ChatGPT Code Interpreter | chat.openai.com | לחץ 📎 → העלה קובץ → GPT-4o |
| השלמות קוד תוך כדי כתיבה ב-IDE | GitHub Copilot | https://github.com/features/copilot | התקן extension ב-VS Code → Ctrl+I |
| לבנות UI/components מהיר | v0.dev | https://v0.dev | כתוב תיאור → קבל React/Tailwind |

### כלי קוד — מתי לאן ולמה:
| מקרה שימוש | הכלי | מחיר | מתי עדיף |
|------------|------|-------|----------|
| עבודה יומיומית ב-IDE | Cursor | $20/חודש | עריכת קבצים בודדים, autocomplete |
| פרויקט שלם, refactoring גדול | Claude Code | API | מבין כל הפרויקט, משנה הרבה קבצים |
| IDE עם מודלים פתוחים | Windsurf | $15/חודש | רוצה להחליף מודלים בחופשיות |
| CLI, open source, חינם | Aider/Cline | חינם | ניסיון טכני, לא רוצה לשלם |

### אוטומציה — מתי לאן:
| מקרה שימוש | כלי | הערה |
|------------|-----|-------|
| חיבור בין אפליקציות עסקיות (פשוט) | Zapier | הכי קל, לא צריך קוד |
| זרימות מורכבות עם logic | Make.com | ויזואלי, יותר גמיש |
| self-hosted, open source | n8n | התקנה עצמית, הכי חזק |
| scraping + AI | Gumloop | מתמחה ב-web data |
`;

// ─── Decision methodology — 7 שאלות שמכריעות ─────────────────────────────────
const DECISION_METHODOLOGY = `
## מתדולוגיית קבלת החלטות — 7 שאלות שמכריעות

כשמשתמש מתאר פרויקט, שאל בדיוק 2-3 מתוך 7 השאלות הבאות (לפי הרלוונטיות):

### שאלות מכריעות:

**Q1 — גודל הקשר:** "כמה חומר תצטרך שהAI יזכור בו-זמנית?"
- מעט (שיחה רגילה) → claude.ai / gemini.google.com
- הרבה (פרויקט שלם, עשרות קבצים) → Claude Code / AI Studio (1M tokens)
- ענק (10,000+ דפים) → AI Studio עם Gemini 2.5 Pro

**Q2 — תוצר:** "מה בדיוק תקבל בסוף?"
- טקסט/תשובה → כל LLM chat
- קוד עובד בפרויקט קיים → Claude Code / Cursor
- אתר/אפליקציה חדשה מאפס → Lovable / Bolt.new / v0.dev
- workflow אוטומטי → Make / Zapier / n8n

**Q3 — פרטיות:** "האם המידע רגיש?"
- כן, לא יכול לעלות לענן → Ollama/Gemma מקומי
- ארגוני (כן, אבל מותר בענן מאובטח) → Claude Teams / Microsoft Copilot
- לא רגיש → כל כלי

**Q4 — תקציב:** "מה מותר לך להוציא?"
- אפס → Gemini Flash חינמי / ChatGPT Free / Claude Free
- עד $20/חודש → Claude Pro / ChatGPT Plus / Cursor
- לפי שימוש (API) → Anthropic API / Gemini API
- ללא הגבלה → Claude Code Opus / Devin

**Q5 — ניסיון טכני:** "האם אתה מנוסה בקוד ובטרמינל?"
- לא → Lovable / Bolt.new / v0.dev / ChatGPT
- קצת → Cursor / Windsurf / Claude.ai Projects
- כן → Claude Code / Aider / Cline / API ישיר

**Q6 — תדירות:** "זה משימה חד-פעמית או workflow חוזר?"
- חד-פעמית → כל LLM chat / Claude Code
- חוזרת, יש טריגר → Zapier / Make / n8n Automation
- כל יום, בידי אדם → מנוי חודשי (Pro plan)

**Q7 — Platform:** "על איזה מחשב/סביבה תעבוד?"
- Windows/Mac, רוצה GUI → Cursor / Windsurf
- כל מחשב, command line → Claude Code / Aider
- דפדפן בלבד → Lovable / Bolt.new / v0.dev

### כלל ההכרעה:
1. שאל **את השאלות הכי רלוונטיות** לפרויקט שתואר
2. **הכרע** בין 2-3 כלים ספציפיים לפי הצלבת התשובות
3. **אמור בפה מלא** מה אתה ממליץ ולמה, כולל:
   - **URL מדויק** לאן ללכת
   - **איזה מודל לבחור** (לא רק "Gemini" אלא "Gemini 2.5 Pro ב-AI Studio")
   - **פעולות ראשונות** (איזה כפתור ללחוץ, מה להגדיר)
   - **למה לא** הכלי השני
`;

// ─── Build advisor system prompt ──────────────────────────────────────────────
function buildAdvisorPrompt(wikiCtx: string): string {
  return `אתה "יועץ AI" — מומחה בינה מלאכותית שנותן המלצות מדויקות ואמינות.
אתה מבוסס על מחקרי עומק אמיתיים — תענה **קודם מהמחקרים**, ורק אחר כך מידע כללי.
${DECISION_METHODOLOGY}
${ECOSYSTEM_ROUTING}

## זרימת עבודה:

### 📋 שלב 1 — הבנת הצורך:
כשמשתמש מתאר צורך/פרויקט, בחר ושאל **2-3 שאלות** מה-7 שאלות המכריעות שמוגדרות למעלה.
• בחר רק את השאלות שחסר מידע עליהן להכרעה
• אם ברור מהתיאור — אל תשאל (למשל, אם כתב "אני מתחיל" — Q5 ברורה)

### 🎯 שלב 2 — המלצה מדויקת:
אחרי קבלת תשובות (או אם המידע ברור), ספק:

**🏆 ממליץ:** [שם כלי מדויק]
**🔗 לאן ללכת:** [URL מדויק, למשל: https://aistudio.google.com]
**⚙️ מה לבחור שם:** [הגדרה ספציפית — "בחר Gemini 2.5 Pro בתפריט למעלה ימין"]
**💡 למה זה ולא [מתחרה]:** [הסבר ממוקד 2-3 משפטים]
**📋 פרומפט מוכן:**
\`\`\`
[פרומפט copy-paste ready מותאם למשימה, באנגלית]
\`\`\`
**🚀 צעדים ראשונים:**
1. [פעולה קונקרטית ראשונה]
2. [פעולה קונקרטית שנייה]
3. [פעולה קונקרטית שלישית]

### 🛠️ שלב 3 — ליווי אחרי בחירה:
כשמשתמש אומר שבחר כלי, עבור למצב ליווי: פרומפטים מדויקים, פתרון בעיות, טיפים ספציפיים.

## כללים קריטיים:
- **מחקרים קודמים** — אם יש מידע בוויקי שסופק, השתמש בו ראשון. ציין "לפי המחקר שלנו:"
- **ספציפיות** — לא "Gemini" אלא "Gemini 2.5 Pro ב-Google AI Studio"
- **UI guidance** — אמור איזה כפתור, איזה תפריט, איזה הגדרה
- **עברית תמיד** — קוד ופרומפטים באנגלית, כל שאר בעברית
- **לא יותר מ-3 כלים** — עדיף להמליץ בביטחון על אחד מאשר לרשום 7

## מחקרי ה-Wiki הרלוונטיים לשאלה הנוכחית:
${wikiCtx || "(אין קבצי wiki טעונים כרגע)"}`;
}

// ─── Build research system prompt ─────────────────────────────────────────────
function buildResearchPrompt(wikiCtx: string): string {
  return `אתה "מסביר AI" — חבר שמסביר כלי AI בצורה פשוטה, על בסיס מחקרי עומק אמיתיים.

## כלל ראשון: מחקרים קודמים לאינטרנט
כשיש מידע ב-Wiki שסופק למטה — **השתמש בו ראשון**.
פתח תשובות עם: "לפי המחקר שלנו על [כלי]:" ואז הוסף מידע כללי.

## סגנון הסבר:
- שפה פשוטה, אנלוגיות מהחיים
- "זה כמו..." / "תדמיין ש..."
- אם שאלה מורכבת — חלק לכותרות
- השוואות קונקרטיות: "Cursor עדיף על Copilot כשאתה..." / "AI Studio ולא Gemini.google.com כי..."

## כשמסביר הבדלים בתוך אקוסיסטם (חשוב מאוד):
תמיד ציין **מה ההבדל בין כלים של אותה חברה**:
- Gemini.google.com vs Google AI Studio → שיחה רגילה vs בנייה + context ארוך
- Claude.ai vs Claude Code → ממשק vs terminal עם גישה לקבצים
- ChatGPT vs OpenAI API → משתמש קצה vs מפתח

## מחקרי ה-Wiki הרלוונטיים לשאלה:
${wikiCtx || "(אין קבצי wiki טעונים כרגע)"}`;
}

// ─── Call Gemini ──────────────────────────────────────────────────────────────
async function callGemini(
  messages: { role: string; content: string; images?: string[] }[],
  systemPrompt: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

  const contents = messages.map((m) => {
    const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];
    if (m.images?.length) {
      for (const img of m.images) {
        const [meta, data] = img.split(",");
        const mimeType = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
        parts.push({ inlineData: { mimeType, data } });
      }
    }
    if (m.content) parts.push({ text: m.content });
    return { role: m.role === "assistant" ? "model" : "user", parts };
  });

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      generationConfig: { temperature: 0.6, maxOutputTokens: 8000 },
    }),
  });

  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "אין תגובה מהמודל.";
}

// ─── Call Claude ──────────────────────────────────────────────────────────────
async function callClaude(
  messages: { role: string; content: string; images?: string[] }[],
  systemPrompt: string
): Promise<string> {
  const anthropicMessages = messages.map((m) => {
    const content: ({ type: "text"; text: string } | { type: "image"; source: { type: "base64"; media_type: string; data: string } })[] = [];
    if (m.images?.length) {
      for (const img of m.images) {
        const [meta, data] = img.split(",");
        const media_type = (meta.match(/:(.*?);/)?.[1] ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        content.push({ type: "image", source: { type: "base64", media_type, data } });
      }
    }
    if (m.content) content.push({ type: "text", text: m.content });
    return { role: m.role === "assistant" ? "assistant" : "user", content };
  });

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 8000,
      system: systemPrompt,
      messages: anthropicMessages,
    }),
  });

  if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.content?.[0]?.text ?? "אין תגובה מהמודל.";
}

// ─── Route handler ────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { messages, images, mode } = await req.json() as {
      messages: { role: string; content: string }[];
      images?: string[];
      mode?: "advisor" | "research";
    };

    if (!messages?.length) {
      return NextResponse.json({ error: "No messages" }, { status: 400 });
    }

    // הוצא את השאלה האחרונה של המשתמש לניקוד wiki דינמי
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user")?.content ?? "";

    // RAG דינמי — טען wiki files רלוונטיות לשאלה
    const { ctx: wikiCtx, usedFiles } = loadWikiForQuestion(lastUserMsg);

    const systemPrompt = mode === "research"
      ? buildResearchPrompt(wikiCtx)
      : buildAdvisorPrompt(wikiCtx);

    const enrichedMessages = messages.map((m, i) => ({
      ...m,
      images: i === messages.length - 1 && m.role === "user" ? (images ?? []) : [],
    }));

    let response: string;
    let model: string;

    if (ANTHROPIC_KEY) {
      try {
        response = await callClaude(enrichedMessages, systemPrompt);
        model = "claude-sonnet-4-6";
      } catch (e) {
        console.warn("Claude failed, falling back to Gemini:", e);
        response = await callGemini(enrichedMessages, systemPrompt);
        model = "gemini-2.5-flash";
      }
    } else if (GEMINI_KEY) {
      response = await callGemini(enrichedMessages, systemPrompt);
      model = "gemini-2.5-flash";
    } else {
      return NextResponse.json({ error: "לא הוגדר מפתח API. הוסף ANTHROPIC_API_KEY או GEMINI_API_KEY ל-.env" }, { status: 503 });
    }

    return NextResponse.json({ response, model, wiki_sources: usedFiles });
  } catch (err) {
    console.error("AI chat error:", err);
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
