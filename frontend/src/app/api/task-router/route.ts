import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const WIKI_DIR      = path.join(process.cwd(), "..", "backend", "data", "wiki");
const KB_PATH       = path.join(process.cwd(), "..", "backend", "data", "knowledge-base", "ecosystem-inventory.json");
const GEMINI_KEY    = process.env.GEMINI_API_KEY  ?? "";
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface RouteResult {
  rank:          number;
  routeType:     "Quality-first" | "Cheapest" | "Already-Paid" | "Local-only" | "Fastest";
  toolName:      string;
  why:           string;
  pros:          string[];
  cons:          string[];
  confidence:    number;
  estimatedCost: string;
  privacyNote:   string;
  prompt:        string;
  handoff_steps: string[];   // WP4
}

export interface DecisionReceipt {
  understood:    string;
  factors:       string[];
  primaryChoice: string;
  rejected:      string[];
  confidence:    string;
}

export interface TaskRouterResult {
  summary:         string;
  routes:          RouteResult[];
  decisionReceipt: DecisionReceipt;
  model:           string;
}

// ─── AccessMap ────────────────────────────────────────────────────────────────
interface AccessMap {
  web_sub:        "yes" | "no" | "partial";
  api_key:        "yes" | "no" | "partial";
  local_runtime:  "yes" | "no" | "partial";
  org_access:     "yes" | "no" | "partial";
  student_access: "yes" | "no" | "partial";
  notes:          string;
}

// ─── IP1: Contradiction types ─────────────────────────────────────────────────
export interface ContradictionOption {
  label:  string;
  action: string;
  sub?:   string;
}

export interface ContradictionResult {
  clarification_needed: true;
  contradictionCase:    "A" | "B";
  question:             string;
  context:              string;
  options:              ContradictionOption[];
}

// ─── IP1: Contradiction detection ────────────────────────────────────────────
/**
 * Technical vocabulary that beginners rarely use unless they have some background.
 * Case B fires when 2+ of these appear in the task description.
 */
const TECHNICAL_TERMS = [
  "docker", "kubernetes", "microservices", "api", "bash", "terminal",
  "npm", "git", "webpack", "typescript", "postgresql", "mongodb",
  "redis", "nginx", "lambda", "ci/cd", "pipeline", "cli", "venv",
  "ssh", "linux", "server", "backend", "frontend", "react", "node",
  "python", "flask", "django", "graphql", "rest", "endpoint", "deploy",
];

function detectContradiction(
  answers:   { privacy: string; experience: string; freeText: string },
  accessMap: AccessMap | undefined,
  task:      string,
): ContradictionResult | null {

  // Case A: User wants local-only privacy but has no local runtime configured
  if (answers.privacy === "מקומי בלבד" && accessMap?.local_runtime === "no") {
    return {
      clarification_needed: true,
      contradictionCase:    "A",
      question: "שאלת הבהרה — פרטיות מקומית מול גישה",
      context:  "בחרת 'מקומי בלבד' (הכל נשאר על המחשב) — אבל לפי הגדרות הגישה שלך אין Runtime מקומי פעיל (Ollama / LM Studio). בלי Runtime מקומי, כלי AI מקומיים לא יפעלו.",
      options: [
        {
          label:  "🔧 אוריד Ollama — הדריכו אותי",
          action: "install_ollama",
          sub:    "תקבל שלבי התקנה מפורטים ב-handoff steps",
        },
        {
          label:  "☁️ שנה ל׳ענן — בסדר׳",
          action: "set_privacy_cloud",
          sub:    "יפתחו הכלים הטובים ביותר: Bolt.new, Claude, Cursor ועוד",
        },
        {
          label:  "⚠️ המשך בכל מקרה",
          action: "proceed_limited",
          sub:    "ההמלצות יהיו מוגבלות — יתכן שאין כלים זמינים",
        },
      ],
    };
  }

  // Case B: Beginner selected but task contains ≥2 technical terms
  const taskLower = task.toLowerCase();
  const found = TECHNICAL_TERMS.filter(t => taskLower.includes(t));
  if (answers.experience === "מתחיל" && found.length >= 2) {
    return {
      clarification_needed: true,
      contradictionCase:    "B",
      question: "שאלת הבהרה — רמת הניסיון",
      context:  `שמנו לב שהמשימה שלך כוללת מונחים טכניים (${found.slice(0, 3).join(", ")}) אבל בחרת "מתחיל". נרצה לוודא שנמליץ על הכלים הנכונים:`,
      options: [
        {
          label:  "🎓 מתחיל — מכיר מושגים, בלי ניסיון מעשי",
          action: "keep_experience",
          sub:    "נסביר הכל מאפס, ממשקים חזותיים, ללא קוד",
        },
        {
          label:  "⚡ בינוני — יש לי קצת ניסיון מעשי",
          action: "set_experience_intermediate",
          sub:    "נניח ידע בסיסי, כלים חזקים וגמישים יותר",
        },
      ],
    };
  }

  return null;
}

// ─── WP2: Blocked tools list ──────────────────────────────────────────────────
function buildBlockedToolsList(map: AccessMap): string[] {
  const blocked = new Set<string>();

  if (map.api_key === "no") {
    blocked.add("Claude Code");
    blocked.add("Aider");
    blocked.add("Cline");
    blocked.add("Aider/Cline");
    blocked.add("OpenAI Assistants API");
    blocked.add("Anthropic API");
  }

  if (map.local_runtime === "no") {
    blocked.add("Gemma 4 (Local)");
    blocked.add("Ollama");
    blocked.add("LM Studio");
    blocked.add("llama.cpp");
    blocked.add("Jan.ai");
  }

  if (map.web_sub === "no" && map.org_access === "no" && map.student_access === "no") {
    blocked.add("GitHub Copilot");
  }

  if (map.web_sub === "no") {
    blocked.add("Claude Pro");
    blocked.add("ChatGPT Plus");
    blocked.add("Gemini Advanced");
    blocked.add("Perplexity Pro");
    blocked.add("Copilot Pro");
  }

  return [...blocked];
}

// ─── WP2: Server-side result cleaning ────────────────────────────────────────
/**
 * Removes any routes the AI recommended despite the blocked-tools constraint,
 * and adds them to decisionReceipt.rejected with reason "אין גישה".
 * This is the second enforcement layer (prompt = first, UI = third).
 */
function cleanResult(
  result:       Omit<TaskRouterResult, "model">,
  accessMap:    AccessMap,
  blockedTools: string[],
): Omit<TaskRouterResult, "model"> {
  const blockedLower = new Set(blockedTools.map(t => t.toLowerCase()));
  const serverRejected: string[] = [];

  const cleanedRoutes = result.routes.filter(route => {
    const toolLower = route.toolName.toLowerCase();

    // Tool-level block: name match (exact or partial)
    const isToolBlocked = blockedLower.has(toolLower) ||
      [...blockedTools].some(b => toolLower.includes(b.toLowerCase()));
    if (isToolBlocked) {
      serverRejected.push(`${route.toolName} — נפסל: אין גישה`);
      return false;
    }

    // Route-type block: Already-Paid with no paid access
    if (route.routeType === "Already-Paid") {
      const hasPaid =
        accessMap.web_sub !== "no" ||
        accessMap.api_key !== "no" ||
        accessMap.org_access === "yes" ||
        accessMap.student_access === "yes";
      if (!hasPaid) {
        serverRejected.push(`${route.toolName} (Already-Paid) — נפסל: אין גישה בתשלום`);
        return false;
      }
    }

    // Route-type block: Local-only with no local runtime
    if (route.routeType === "Local-only" && accessMap.local_runtime === "no") {
      serverRejected.push(`${route.toolName} (Local-only) — נפסל: אין Runtime מקומי`);
      return false;
    }

    return true;
  });

  // Re-rank surviving routes so rank is always 1, 2, 3…
  cleanedRoutes.forEach((r, i) => { r.rank = i + 1; });

  return {
    ...result,
    routes: cleanedRoutes,
    decisionReceipt: {
      ...result.decisionReceipt,
      // Append server-enforced rejections — these are the authoritative ones.
      // Keep AI-generated rejections only if they don't duplicate what we added.
      rejected: [
        ...result.decisionReceipt.rejected.filter(r =>
          !serverRejected.some(sr => sr.startsWith(r.split("—")[0].trim()))
        ),
        ...serverRejected,
      ],
    },
  };
}

// ─── WP1: Dynamic wiki loading with Hebrew relevance scoring ──────────────────
/**
 * Hebrew keyword → relevant wiki filenames (priority boost).
 * When the task mentions one of these terms, matching files rise to the top.
 */
const HEBREW_KEYWORD_MAP: Record<string, string[]> = {
  "אתר":         ["lovable-dev.md", "bolt-new.md", "v0-vercel.md", "cursor-ide.md", "replit-agent.md"],
  "אפליקציה":    ["lovable-dev.md", "bolt-new.md", "replit-agent.md", "cursor-ide.md"],
  "קוד":         ["cursor-ide.md", "github-copilot.md", "windsurf-ide.md", "claude-code.md", "aider-cline.md"],
  "פיתוח":       ["cursor-ide.md", "claude-code.md", "github-copilot.md", "windsurf-ide.md"],
  "אוטומציה":    ["n8n-automation.md", "make-automation.md", "zapier-ai-agents.md", "gumloop-ai.md"],
  "כתיבה":       ["chatgpt.md", "claude.md", "notion-ai.md", "jasper-copyai.md"],
  "תוכן":        ["chatgpt.md", "claude.md", "notion-ai.md", "jasper-copyai.md"],
  "תמונות":      ["runway-video.md", "heygen-avatars.md"],
  "וידאו":       ["runway-video.md", "heygen-avatars.md", "did-israeli.md"],
  "מוזיקה":      ["suno-music.md"],
  "מחקר":        ["perplexity-ai.md", "chatgpt-full.md", "google-gemini-full.md"],
  "ניתוח":       ["perplexity-ai.md", "chatgpt-full.md", "google-ai-studio.md"],
  "api":          ["anthropic-api.md", "claude-code.md", "claude-agent-sdk.md"],
  "מקומי":       ["gemma4-local.md", "browser-use-oss.md"],
  "פרטיות":      ["gemma4-local.md", "claude.md"],
  "בוט":         ["browser-use-oss.md", "n8n-automation.md", "make-automation.md"],
  "סוכן":        ["claude-agent-sdk.md", "cursor-agents.md", "devin-ai.md"],
  "עיצוב":       ["v0-vercel.md", "lovable-dev.md"],
  "ישראל":       ["base44-israeli.md", "did-israeli.md", "nemoclaw-openclaw.md"],
  "mcp":         ["mcp-protocol.md", "claude-code.md"],
};

function loadWikiContext(task: string): string {
  if (!fs.existsSync(WIKI_DIR)) return "";

  const allFiles = fs.readdirSync(WIKI_DIR)
    .filter(f => f.endsWith(".md"))
    .sort();  // stable base order

  const taskLower = task.toLowerCase();

  // Score every file: +2 if English tool name appears in task, +3 if Hebrew keyword matches
  const scoreMap = new Map<string, number>();
  allFiles.forEach(f => scoreMap.set(f, 1));

  // Hebrew keyword boost
  for (const [kw, files] of Object.entries(HEBREW_KEYWORD_MAP)) {
    if (taskLower.includes(kw)) {
      files.forEach(f => scoreMap.set(f, (scoreMap.get(f) ?? 1) + 3));
    }
  }

  // English tool name boost (task may mention "Cursor", "Claude Code", etc.)
  allFiles.forEach(f => {
    const toolKeyword = f.replace(".md", "").replace(/-/g, " ");
    if (taskLower.includes(toolKeyword)) {
      scoreMap.set(f, (scoreMap.get(f) ?? 1) + 2);
    }
  });

  // Sort by score desc, then alphabetically for ties
  const ranked = [...scoreMap.entries()]
    .sort(([aF, aS], [bF, bS]) => bS - aS || aF.localeCompare(bF))
    .map(([f]) => f);

  // Build official wiki context (budget: 14 000 chars, up to 1 200/file)
  let ctx = "";
  let totalChars = 0;
  const OFFICIAL_MAX  = 14000;
  const PER_FILE      = 1200;

  for (const fname of ranked) {
    if (totalChars >= OFFICIAL_MAX) break;
    const fpath = path.join(WIKI_DIR, fname);
    if (!fs.existsSync(fpath)) continue;
    const raw     = fs.readFileSync(fpath, "utf-8");
    const snippet = raw.length > PER_FILE ? raw.slice(0, PER_FILE) + "\n...[נקצר]" : raw;
    ctx += `\n\n=== ${fname} ===\n${snippet}`;
    totalChars += snippet.length;
  }

  // YouTube community wiki — secondary context, budget: 2 000 chars
  const youtubeDir = path.join(WIKI_DIR, "youtube");
  if (fs.existsSync(youtubeDir)) {
    const ytFiles = fs.readdirSync(youtubeDir)
      .filter(f => f.endsWith(".md"))
      .slice(0, 10);

    let ytCtx = "";
    let ytChars = 0;
    const YT_MAX      = 2000;
    const YT_PER_FILE = 350;

    for (const fname of ytFiles) {
      if (ytChars >= YT_MAX) break;
      const raw     = fs.readFileSync(path.join(youtubeDir, fname), "utf-8");
      const snippet = raw.length > YT_PER_FILE ? raw.slice(0, YT_PER_FILE) + "\n...[נקצר]" : raw;
      ytCtx  += `\n${snippet}`;
      ytChars += snippet.length;
    }

    if (ytCtx) {
      ctx += `\n\n## מקורות קהילה (ניסיון מעשי — לא תיעוד רשמי):
${ytCtx}`;
    }
  }

  return ctx;
}

// ─── KB3: Structured knowledge-base context ───────────────────────────────────
/**
 * Reads ecosystem-inventory.json and returns a compact structured summary
 * of the most relevant tools for the given task + accessMap.
 *
 * Scoring:
 *   +5  exact tool name appears in task
 *   +3  per use_case sentence that shares 2+ words with task
 *   +2  per matching recommendation tag keyword in task
 *   +1  description keyword match
 *
 * Returns "" if the KB file doesn't exist or no tools score > 0.
 * Budget: ~2 500 chars — intentionally smaller than wiki (14 000).
 */
function loadKBContext(task: string, accessMap?: AccessMap): string {
  if (!fs.existsSync(KB_PATH)) return "";

  let inventory: {
    tools: Array<{
      id: string;
      name: string;
      vendor: string;
      category: string;
      description: string;
      use_cases: string[];
      tags: string[];
      subscription_tiers: Array<{ tier_name?: string; level: string; price: string; access_key: string }>;
      primary_access_key: string;
      relations: Array<{ tool_id: string; type: string; note?: string }>;
    }>;
  };

  try {
    inventory = JSON.parse(fs.readFileSync(KB_PATH, "utf-8"));
  } catch {
    return "";
  }

  const taskLower = task.toLowerCase();
  const words     = taskLower.split(/\s+/).filter(w => w.length > 3);

  const scored = inventory.tools.map(tool => {
    let score = 0;

    // Exact name match (strongest signal)
    if (taskLower.includes(tool.name.toLowerCase())) score += 5;

    // Use-case relevance: each use_case that shares ≥2 words with task
    for (const uc of tool.use_cases) {
      const ucLower = uc.toLowerCase();
      const shared  = words.filter(w => ucLower.includes(w)).length;
      if (shared >= 2) score += 3;
      else if (shared === 1) score += 1;
    }

    // Tag keywords in task
    for (const tag of tool.tags) {
      const tagWords = tag.replace(/-/g, " ").split(" ");
      if (tagWords.some(tw => taskLower.includes(tw))) score += 2;
    }

    // Description keyword match
    const descLower = tool.description.toLowerCase();
    const descShared = words.filter(w => descLower.includes(w)).length;
    if (descShared >= 3) score += 1;

    return { tool, score };
  })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 7);

  if (scored.length === 0) return "";

  const lines: string[] = ["\n\n## מאגר ידע מובנה — כלים רלוונטיים למשימה:"];

  for (const { tool, score: _score } of scored) {
    lines.push(`\n### ${tool.name} (${tool.vendor})`);
    lines.push(`- ${tool.description}`);

    // Access availability from user's accessMap
    if (accessMap) {
      const userKey = tool.primary_access_key as keyof AccessMap;
      const access  = accessMap[userKey];
      lines.push(`- גישה: ${access === "yes" ? "✅ זמין" : access === "partial" ? "⚠️ חלקי" : "❌ לא מוגדר"}`);
    }

    // Cheapest available tier
    const freeTier = tool.subscription_tiers.find(t => t.level === "free" || t.price === "free");
    if (freeTier) lines.push(`- תוכנית חינמית: ${freeTier.price}`);

    // Key tags (first 3)
    if (tool.tags.length > 0) {
      lines.push(`- תגיות: ${tool.tags.slice(0, 3).join(", ")}`);
    }

    // Competing / related tools (compact)
    const competing = tool.relations.filter(r => r.type === "competing").map(r => r.tool_id);
    if (competing.length > 0) {
      lines.push(`- מתחרים ישירים: ${competing.slice(0, 3).join(", ")}`);
    }
  }

  const result = lines.join("\n");
  // Hard cap at 2500 chars
  return result.length > 2500 ? result.slice(0, 2500) + "\n...[נקצר]" : result;
}

// ─── System prompt (WP2 + WP3 + WP4) ─────────────────────────────────────────
function buildSystemPrompt(
  wiki:           string,
  blockedTools:   string[],
  knowledgeLevel?: string,
): string {

  // WP2 — hard blocked constraint
  const blockedSection = blockedTools.length > 0
    ? `\n## ⛔ BLOCKED TOOLS — אסור להמליץ בשום מקרה:
${blockedTools.map(t => `- ${t}`).join("\n")}
כלים אלו אינם זמינים למשתמש. אם הם הכי מתאימים — פסול אותם ורשום אותם ב-rejected עם הסיבה "אין גישה".`
    : "";

  // WP3 — explanation level
  const isExpert   = knowledgeLevel === "מנוסה";
  const languageSection = isExpert
    ? `\n## שפת ההסבר — מנוסה:
מותר להשתמש במינוח טכני (API, CLI, token, runtime, pipeline). "why" יכול להיות ישיר וטכני.
handoff_steps יכולים להניח ידע בסיסי של CLI ו-Git.`
    : `\n## שפת ההסבר — מתחיל (חובה לכל route):
- פתח את "why" תמיד כך: "[שם כלי] הוא [הסבר 1 משפט פשוט]. זה מתאים לך כי..."
- אסור: API, CLI, token, runtime, endpoint — ללא הסבר בסוגריים מיד אחרי
- בhandoff_steps: כתוב "לחץ על...", "פתח...", "הדבק...", "כתוב..." — ברמת ילד בן 13`;

  // WP4 — hybrid handoff source rule
  const handoffSection = `\n## כלל hybrid לbuildoff_steps:
לפני שאתה כותב את handoff_steps לכל route, בדוק בwiki שסופק:
1. האם יש URL רשמי לכלי? → השתמש בו בשלב הפתיחה/הרשמה
2. האם יש workflow מתועד (התקן → צור → הפעל)? → בסס את הsteps עליו
3. האם יש הוראות ספציפיות (פקודות, hotkeys, שמות תפריטים)? → הכנס אותם מדויק
אם אין מידע ב-wiki → צור steps לוגיים מידע כללי שלך.
לאחר מכן — נסח הכל לפי "שפת ההסבר" שמוגדרת למעלה.`;

  return `אתה "Task Router" — מנוע המלצות כלי AI עצמאי ונייטרלי.
קבל תיאור משימה ומאפיינים → החזר JSON בלבד (ללא markdown, ללא הסבר).
${blockedSection}
${languageSection}
${handoffSection}

## JSON Schema מדויק לחזרה:
{
  "summary": "סיכום בעברית של מה שהמשתמש רוצה (2-3 משפטים)",
  "routes": [
    {
      "rank": 1,
      "routeType": "Quality-first",
      "toolName": "שם הכלי",
      "why": "פתח בהסבר מה הכלי עושה, אחר כך למה זה מתאים לפרויקט הזה (2-3 משפטים)",
      "pros": ["יתרון 1", "יתרון 2", "יתרון 3"],
      "cons": ["חיסרון 1", "חיסרון 2"],
      "confidence": 85,
      "estimatedCost": "חינם / $20/חודש / API בתשלום לפי שימוש",
      "privacyNote": "קוד עולה לשרתי [ספק] / עובד מקומי לחלוטין / hybrid",
      "prompt": "I want to build [description].\\n\\nHelp me [action].\\n\\nRequirements:\\n- [req1]\\n- [req2]\\n\\nStart by [first step].",
      "handoff_steps": [
        "עבור לכתובת [URL מדויק] והירשם / התחבר",
        "צור פרויקט חדש — לחץ על [שם כפתור]",
        "הדבק את הפרומפט שמופיע למטה ולחץ Enter",
        "כשתקבל תשובה — [מה לעשות הלאה, צעד קונקרטי]"
      ]
    }
  ],
  "decisionReceipt": {
    "understood": "מה המערכת הבינה מהתיאור",
    "factors": ["פקטור 1", "פקטור 2", "פקטור 3"],
    "primaryChoice": "למה הכלי הראשון נבחר",
    "rejected": ["Cursor IDE — נפסל: מצריך ידע קידוד", "Claude Code — נפסל: אין גישה (API key חסר)"],
    "confidence": "גבוה"
  }
}

## כלים זמינים להמלצה:
### פיתוח קוד / Web:
Claude Code, Cursor IDE, GitHub Copilot, Lovable, v0.dev, Windsurf IDE, Replit Agent, Bolt.new, Gemma 4 (Local), Aider/Cline

### כתיבה / תוכן / אנליזה:
ChatGPT (chat.openai.com), Claude.ai (claude.ai), Gemini Advanced, Perplexity AI, Notion AI

### עיצוב / תמונות:
Canva AI, Midjourney, DALL-E 3 (via ChatGPT Plus), Adobe Firefly, Kling AI

### אוטומציה / No-code:
n8n, Make.com, Zapier AI, Relevance AI, Voiceflow

### ניתוח נתונים / מחקר:
Perplexity AI, NotebookLM (Google), Julius AI, ChatGPT Code Interpreter

### בוטים / API:
Browser Use, Botpress, Dify.ai, OpenAI Assistants API

## סוגי מסלולים:
- "Quality-first" — איכות מקסימלית
- "Cheapest"       — הפתרון הזול/חינמי ביותר שעדיין עובד
- "Already-Paid"   — משתמש בכלי שהמשתמש כבר שילם עליו
- "Local-only"     — רץ מקומית, אין שליחת נתונים לענן
- "Fastest"        — הכי מהיר לתוצאה

## כללים קריטיים:
- החזר 2-3 routes בלבד
- הפרומפטים חייבים להיות באנגלית, מוכנים ל-copy-paste
- confidence הוא מספר 0-100
- JSON בלבד — ללא \`\`\`json wrapper, ללא שום טקסט לפני/אחרי
- rank מתחיל ב-1
- handoff_steps: בדיוק 3-4 שלבים, עברית, גוף שני

## ידע Wiki על הכלים:
${wiki}`;
}

// ─── Access map formatter ─────────────────────────────────────────────────────
function formatAccessMap(map: AccessMap): string {
  const lines: string[] = [];

  if (map.web_sub === "yes")          lines.push("✅ יש מנוי Web (Claude Pro / ChatGPT Plus / Gemini Advanced וכד׳)");
  else if (map.web_sub === "partial") lines.push("⚡ יש מנוי Web חלקי");
  else                                lines.push("❌ אין מנוי Web — גישה לחינמי בלבד");

  if (map.api_key === "yes")          lines.push("✅ יש API Keys");
  else if (map.api_key === "partial") lines.push("⚡ יש API Keys חלקיים");
  else                                lines.push("❌ אין API Keys — Claude Code, Aider, OpenAI API אינם זמינים");

  if (map.local_runtime === "yes") lines.push("✅ יש Runtime מקומי (Ollama / LM Studio)");
  else                             lines.push("❌ אין Runtime מקומי — Gemma Local אינו זמין");

  if (map.org_access === "yes")     lines.push("✅ יש גישה ארגונית");
  if (map.student_access === "yes") lines.push("✅ יש גישת סטודנט");
  if (map.notes?.trim())            lines.push(`📝 הערות: ${map.notes.trim()}`);

  return lines.join("\n");
}

// ─── JSON extraction ──────────────────────────────────────────────────────────
function extractJSON(raw: string): string {
  // Always use first-{ / last-} approach.
  // Avoids the regex bug where a non-greedy /```([\s\S]*?)```/ stops at backticks
  // inside prompt strings (e.g. "prompt": "run ```bash...```").
  const start = raw.indexOf("{");
  const end   = raw.lastIndexOf("}");
  if (start !== -1 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

// ─── AI calls ─────────────────────────────────────────────────────────────────
async function callGemini(userMsg: string, system: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ role: "user", parts: [{ text: userMsg }] }],
      generationConfig: { temperature: 0.3, maxOutputTokens: 4096 },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
}

async function callClaude(userMsg: string, system: string): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": ANTHROPIC_KEY,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model:      "claude-sonnet-4-6",
      max_tokens: 4096,
      system,
      messages:   [{ role: "user", content: userMsg }],
    }),
  });
  if (!res.ok) throw new Error(`Claude error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.content?.[0]?.text ?? "";
}

// ─── Route handler ─────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { task, answers, accessMap, knowledgeLevel, freeText, skipContradictionCheck } = await req.json() as {
      task:                     string;
      answers:                  { type: string; experience: string; privacy: string; priority: string; freeText: string };
      accessMap?:               AccessMap;
      knowledgeLevel?:          string;
      freeText?:                string;
      skipContradictionCheck?:  boolean;
    };

    if (!task?.trim()) {
      return NextResponse.json({ error: "חסר תיאור משימה" }, { status: 400 });
    }

    // IP1: Detect contradictions before any AI call — fast, no quota cost
    if (!skipContradictionCheck) {
      const contradiction = detectContradiction(answers, accessMap, task);
      if (contradiction) {
        return NextResponse.json(contradiction);
      }
    }

    // WP2: build blocked list early — used by both system prompt and cleanResult
    const blockedTools = accessMap ? buildBlockedToolsList(accessMap) : [];

    // WP1: relevance-scored wiki loading
    const wikiText = loadWikiContext(task);
    // KB3: structured knowledge-base context (appended to wiki, separate budget)
    const kbText   = loadKBContext(task, accessMap ?? undefined);
    const wiki     = wikiText + kbText;
    const system   = buildSystemPrompt(wiki, blockedTools, knowledgeLevel);

    const accessSection = accessMap
      ? `\n## גישה זמינה למשתמש:\n${formatAccessMap(accessMap)}`
      : "";

    const levelNote = knowledgeLevel
      ? `\n- רמת ידע: ${knowledgeLevel}`
      : "";

    const freeTextSection = freeText?.trim()
      ? `\n## הקשר נוסף מהמשתמש:\n${freeText.trim()}`
      : "";

    // IP1 Case C: User wants low cost but already has paid access → hint AI to consider Already-Paid
    const alreadyPaidHint = (
      answers.priority === "עלות נמוכה" &&
      accessMap &&
      (accessMap.api_key !== "no" || accessMap.web_sub !== "no")
    )
      ? "\n\n⚡ הערת מערכת: המשתמש בחר 'עלות נמוכה' אך כבר יש לו גישה בתשלום. שקול לכלול מסלול 'Already-Paid' — כלים שכבר שילם עליהם הם לרוב האופציה החסכונית ביותר עבורו."
      : "";

    const userMsg = `## תיאור המשימה:
${task.trim()}

## מאפיינים שנבחרו:
- סוג פרויקט: ${answers.type}
- רמת ניסיון: ${answers.experience}${levelNote}
- דרישת פרטיות: ${answers.privacy}
- עדיפות ראשית: ${answers.priority}
${accessSection}
${freeTextSection}

החזר JSON בלבד לפי ה-schema שהוגדר.${alreadyPaidHint}`;

    let raw: string;
    let model: string;

    if (ANTHROPIC_KEY) {
      try {
        raw   = await callClaude(userMsg, system);
        model = "claude-sonnet-4-6";
      } catch (e) {
        console.warn("Claude failed, trying Gemini:", e);
        raw   = await callGemini(userMsg, system);
        model = "gemini-2.5-flash";
      }
    } else if (GEMINI_KEY) {
      raw   = await callGemini(userMsg, system);
      model = "gemini-2.5-flash";
    } else {
      return NextResponse.json(
        { error: "לא הוגדר מפתח API. הוסף ANTHROPIC_API_KEY או GEMINI_API_KEY ל-.env" },
        { status: 503 },
      );
    }

    const jsonStr  = extractJSON(raw);
    let   result   = JSON.parse(jsonStr) as Omit<TaskRouterResult, "model">;

    // Ensure handoff_steps exists on every route
    result.routes = result.routes.map(r => ({
      ...r,
      handoff_steps: Array.isArray(r.handoff_steps) ? r.handoff_steps : [],
    }));

    // WP2: server-side clean — remove any routes the AI recommended despite being blocked
    if (accessMap) {
      result = cleanResult(result, accessMap, blockedTools);
    }

    return NextResponse.json({ ...result, model });

  } catch (err) {
    console.error("Task router error:", err);
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 },
    );
  }
}
