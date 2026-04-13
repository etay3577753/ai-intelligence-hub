import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const WIKI_DIR = path.join(process.cwd(), "..", "backend", "data", "wiki");
const GEMINI_KEY = process.env.GEMINI_API_KEY ?? "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";

// ─── Load wiki context ────────────────────────────────────────────────────────
function loadWikiContext(mode: "advisor" | "research"): string {
  const advisorPriority = [
    "claude-code.md",
    "cursor-ide.md",
    "github-copilot.md",
    "lovable-dev.md",
    "windsurf-ide.md",
    "bolt-new.md",
    "devin-ai.md",
    "replit-agent.md",
    "v0-vercel.md",
    "anthropic-api.md",
    "claude-cowork.md",
    "browser-use-oss.md",
    "gemma4-local.md",
  ];

  const researchPriority = [
    "claude-code.md",
    "anthropic-api.md",
    "mcp-protocol.md",
    "claude-cowork.md",
    "claude-in-chrome.md",
    "claude-agent-sdk.md",
    "cursor-ide.md",
    "github-copilot.md",
    "lovable-dev.md",
    "anthropic-company.md",
    "gemma4-local.md",
  ];

  const priority = mode === "advisor" ? advisorPriority : researchPriority;

  let ctx = "";
  let totalChars = 0;
  const MAX_TOTAL = 20000;
  const MAX_PER_FILE = 2500;

  for (const fname of priority) {
    if (totalChars >= MAX_TOTAL) break;
    const fpath = path.join(WIKI_DIR, fname);
    if (!fs.existsSync(fpath)) continue;
    const raw = fs.readFileSync(fpath, "utf-8");
    const snippet = raw.length > MAX_PER_FILE ? raw.slice(0, MAX_PER_FILE) + "\n...[נקצר]" : raw;
    ctx += `\n\n=== ${fname} ===\n${snippet}`;
    totalChars += snippet.length;
  }
  return ctx;
}

// ─── System prompts ───────────────────────────────────────────────────────────
function buildAdvisorPrompt(): string {
  const wiki = loadWikiContext("advisor");
  return `אתה "יועץ AI" — יועץ טכני עצמאי ונייטרלי לחלוטין.
המטרה שלך: לעזור למשתמש לבחור את כלי ה-AI הטוב ביותר עבור הפרויקט שלו.

## זרימת עבודה קבועה:

### 📋 שלב 1 — הבנת הפרויקט:
כשמשתמש מתאר פרויקט בפעם הראשונה, שאל בדיוק 2-3 שאלות הבהרה קצרות ועניינים:
- מה התוצר הסופי הרצוי? (אתר? אפליקציה? סקריפט? כלי?)
- מה רמת הניסיון הטכני? (מתחיל / בינוני / מנוסה)
- האם יש דרישות ספציפיות? (שפה, פלטפורמה, תקציב)

### 🎯 שלב 2 — המלצה על כלים:
אחרי הבהרות, המלץ על 2-3 כלים ספציפיים מהרשימה הזו:
Claude Code, Cursor IDE, GitHub Copilot, Lovable, v0.dev, Windsurf, Replit Agent, Bolt.new, Devin AI, Aider/Cline

לכל כלי מומלץ תן:
- 🔧 **שם הכלי**
- 💡 **למה הוא מתאים לפרויקט הזה** (2-3 משפטים ספציפיים)
- ✅ **יתרון מרכזי** ו-⚠️ **חיסרון מרכזי**
- 📋 **פרומפט מוכן לשליחה** — מותאם אישית לפרויקט שתיאר (copy-paste ready, מפורט)

### 🚀 שלב 3 — ליווי אחרי בחירה:
כשהמשתמש כותב שבחר כלי מסוים, ליווה אותו עם:
- פרומפטים מדויקים לשלב הבא
- תשובות לשאלות שעולות
- הנחיות ספציפיות לאותו כלי

## כללים:
- נייטרלי לחלוטין — המלץ על מה שהכי מתאים לפרויקט, לא על מה שהכי מפורסם
- פרומפטים: מפורטים, copy-paste ready, בתוך \`\`\` blocks
- עברית תמיד, קוד ופקודות באנגלית
- בסס המלצות על ידע הוויקי שלך

## ידע מבסיס הכלים (Wiki):
${wiki}`;
}

function buildResearchPrompt(): string {
  const wiki = loadWikiContext("research");
  return `אתה "מסביר AI" — חבר שמסביר טכנולוגיה בצורה פשוטה ונגישה.
המטרה: לענות על שאלות על כלי AI כאילו אתה מסביר לחבר שאינו טכנולוגי, או לילד בן 13.

## איך לענות:
- שפה פשוטה ויומיומית — ללא ז'רגון מסובך
- השתמש באנלוגיות מהחיים ("זה כמו...", "תדמיין ש...")
- תשובות ממוקדות — לא יותר מדי ארוכות
- אם שאלה מורכבת — שבור לחלקים קטנים עם כותרות
- בסס תשובות על המחקרים בוויקי
- אם אין לך מידע מספיק — אמור בכנות

## דוגמאות לסגנון שלך:
שאלה: "מה זה Claude Code?"
תשובה: "תדמיין שיש לך עוזר חכם שיושב ישירות בתוך המחשב שלך. במקום לפתוח אתר ולהדביק קוד, הוא רואה את כל הקבצים שלך, יכול לשנות אותם, להריץ פקודות — הכל בלי שאתה צריך לעשות copy-paste. זה Claude Code."

שאלה: "האם אני יכול לעבוד על פרויקט שהתחלתי בקלוד קוד ממחשב אחר?"
תשובה: "כן! Claude Code עובד על הקבצים שיש לך — אז כל עוד הקוד שלך שמור ב-Git (GitHub/GitLab), אתה יכול לפתוח Claude Code על כל מחשב, לעשות git clone ולהמשיך בדיוק מאיפה שעצרת."

## ידע מבסיס הידע (Wiki):
${wiki}`;
}

// ─── Call Gemini ──────────────────────────────────────────────────────────────
async function callGemini(
  messages: { role: string; content: string; images?: string[] }[],
  systemPrompt: string
): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;

  const contents = messages.map((m) => {
    const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];

    if (m.images && m.images.length > 0) {
      for (const img of m.images) {
        const [meta, data] = img.split(",");
        const mimeType = meta.match(/:(.*?);/)?.[1] ?? "image/jpeg";
        parts.push({ inlineData: { mimeType, data } });
      }
    }

    if (m.content) parts.push({ text: m.content });

    return {
      role: m.role === "assistant" ? "model" : "user",
      parts,
    };
  });

  const body = {
    system_instruction: { parts: [{ text: systemPrompt }] },
    contents,
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 4096,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini error ${res.status}: ${err}`);
  }

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

    if (m.images && m.images.length > 0) {
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
      max_tokens: 4096,
      system: systemPrompt,
      messages: anthropicMessages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude error ${res.status}: ${err}`);
  }

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

    const systemPrompt = mode === "research" ? buildResearchPrompt() : buildAdvisorPrompt();

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

    return NextResponse.json({ response, model });
  } catch (err) {
    console.error("AI chat error:", err);
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
