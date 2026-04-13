/**
 * Frontend Orchestrator — TypeScript mirror of backend/orchestrator.py
 * Works standalone (no backend required) by reading the JSON files directly.
 */

import path from "path";
import fs from "fs";

const TOOLS_PATH    = path.join(process.cwd(), "..", "backend", "data", "tools_master.json");
const PROJECTS_PATH = path.join(process.cwd(), "..", "backend", "data", "user_projects.json");
const MY_TOOLS_PATH = path.join(process.cwd(), "..", "backend", "data", "my_tools.json");

// ── Category keyword map ───────────────────────────────────────────────────────
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "מצגות":                  ["מצגת","פרזנטציה","שקופית","slides","presentation","deck","powerpoint"],
  "מודלי שפה / צ'אטבוטים": ["כתיבה","תוכן","מאמר","טקסט","שאלות","צ'אט","בלוג","ניסוח","סיכום","תרגום"],
  "וידאו ועריכה":           ["סרטון","וידאו","עריכה","קליפ","animation","אנימציה","ריל","יוטיוב"],
  "יצירת תמונות":           ["תמונה","גרפיקה","ויזואל","image","אילוסטרציה","thumbnail"],
  "אוטומציות":              ["אוטומציה","זרימה","workflow","אינטגרציה","בוט","חיבור","api"],
  "שיווק":                  ["שיווק","פרסום","קמפיין","מודעה","סושיאל","אינסטגרם","פייסבוק","אימייל"],
  "No-Code / פיתוח":        ["אפליקציה","אתר","קוד","פיתוח","app","landing page","דף נחיתה"],
  "פרודוקטיביות":           ["ניהול","משימות","פגישה","לוח זמנים","ארגון","מעקב","יעילות"],
  "אודיו ומוזיקה":          ["מוזיקה","שיר","אודיו","קריינות","פודקאסט","הקלטה","voice"],
  "למידה ומחקר":            ["מחקר","לימוד","מאמר","ניתוח","מידע","אקדמי","מדע","flashcards"],
  "עיצוב גרפי":             ["עיצוב גרפי","ברנד","זהות מותג","לוגו","אינפוגרפיקה","canva"],
};

const CATEGORY_CLARIFYING: Record<string, string> = {
  "מצגות":                   "האם המצגת מיועדת לקהל עסקי, אקדמי, או שיווקי?",
  "וידאו ועריכה":            "מה אורך הסרטון המתוכנן, ובאיזו פלטפורמה הוא יפורסם?",
  "יצירת תמונות":            "האם התמונות מיועדות לשימוש מסחרי?",
  "שיווק":                   "באיזו רשת חברתית מתמקד הקמפיין?",
  "No-Code / פיתוח":         "האם יש לך ניסיון בכתיבת קוד?",
  "אוטומציות":               "אילו מערכות/אפליקציות אתה רוצה לחבר?",
  "אודיו ומוזיקה":           "האם זה לשימוש אישי או מסחרי?",
  "למידה ומחקר":             "על איזה תחום המחקר מתמקד?",
  "פרודוקטיביות":            "כמה אנשים בצוות שלך?",
  "מודלי שפה / צ'אטבוטים":  "מה אורך ותדירות התוכן שאתה מתכנן לייצר?",
  "עיצוב גרפי":              "מה רמת הניסיון שלך בעיצוב גרפי?",
};

// ── Data helpers ──────────────────────────────────────────────────────────────
export function loadTools(): Tool[] {
  const raw = fs.readFileSync(TOOLS_PATH, "utf-8");
  return JSON.parse(raw).tools as Tool[];
}

export function loadMyTools(): MyToolsDB {
  if (!fs.existsSync(MY_TOOLS_PATH)) return { user_tiers: {}, tool_strengths: {} };
  return JSON.parse(fs.readFileSync(MY_TOOLS_PATH, "utf-8")) as MyToolsDB;
}

export function loadProjects(): ProjectsDB {
  if (!fs.existsSync(PROJECTS_PATH)) return { projects: [] };
  return JSON.parse(fs.readFileSync(PROJECTS_PATH, "utf-8")) as ProjectsDB;
}

export function saveProjects(data: ProjectsDB): void {
  fs.writeFileSync(PROJECTS_PATH, JSON.stringify(data, null, 2), "utf-8");
}

// ── Core logic ────────────────────────────────────────────────────────────────
export function matchCategories(task: string): string[] {
  const lower = task.toLowerCase();
  const scores: Record<string, number> = {};
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = kws.filter((kw) => lower.includes(kw)).length;
    if (score > 0) scores[cat] = score;
  }
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]).map(([c]) => c);
  return sorted.length ? sorted : ["מצגות", "מודלי שפה / צ'אטבוטים", "יצירת תמונות"];
}

const TIER_SCORE: Record<string, number> = { free: 1, pro: 3, api: 5 };

export function getToolsForCategories(categories: string[], tools: Tool[], limit = 10): Tool[] {
  const myTools = loadMyTools();
  const userTiers = myTools.user_tiers ?? {};
  const strengths = myTools.tool_strengths ?? {};

  const matched = tools.filter((t) => categories.includes(t.category));
  return matched
    .sort((a, b) => {
      // Tier bonus: tools user actively pays for rank higher
      const tierA = TIER_SCORE[userTiers[a.id] ?? "free"] ?? 1;
      const tierB = TIER_SCORE[userTiers[b.id] ?? "free"] ?? 1;

      // Strength bonus: sum of strengths relevant to category
      const strengthScore = (id: string) => {
        const s = strengths[id];
        if (!s) return 0;
        return (s.deep_reasoning ?? 0) + (s.writing ?? 0) + (s.hebrew ?? 0);
      };

      const srcScore = (t: Tool) => (t.source === "A+B" ? 2 : 1);
      const ratScore = (t: Tool) => (t.rating ? t.rating.length : 0);

      const scoreA = tierA * 3 + strengthScore(a.id) + srcScore(a) + ratScore(a);
      const scoreB = tierB * 3 + strengthScore(b.id) + srcScore(b) + ratScore(b);
      return scoreB - scoreA;
    })
    .slice(0, limit);
}

// Returns the best tool the user owns (highest tier score), for use as Master Brain label
export function getMasterBrain(tools: Tool[]): { tool: Tool | null; tier: string } {
  const myTools = loadMyTools();
  const userTiers = myTools.user_tiers ?? {};

  let bestTool: Tool | null = null;
  let bestScore = 0;

  for (const tool of tools) {
    const score = TIER_SCORE[userTiers[tool.id] ?? "free"] ?? 1;
    if (score > bestScore) {
      bestScore = score;
      bestTool = tool;
    }
  }

  return { tool: bestTool, tier: bestScore > 1 ? (userTiers[bestTool?.id ?? ""] ?? "free") : "free" };
}

export function generateClarifyingQuestions(task: string, categories: string[]): string[] {
  const base = [
    "מה רמת הניסיון הטכני שלך? (מתחיל / בינוני / מתקדם)",
    "מה התקציב שלך לכלי? (חינם בלבד / עד 50$ לחודש / ללא הגבלה)",
  ];
  const specific =
    categories.map((c) => CATEGORY_CLARIFYING[c]).find(Boolean) ??
    "מה המטרה העיקרית — חיסכון בזמן, שיפור איכות, או הפחתת עלויות?";
  return [...base, specific];
}

export function generateRecommendation(project: Project, tools: Tool[]): string {
  const relevant = getToolsForCategories(project.matched_categories, tools, 3);
  if (!relevant.length) return "לא נמצאו כלים מתאימים. נסה לתאר את המשימה בצורה אחרת.";

  const myTools = loadMyTools();
  const userTiers = myTools.user_tiers ?? {};
  const userBrandTiers: Record<string, Record<string, { options: Array<{ id: string; label: string; maps_to: string }> }>> =
    myTools.brand_tiers ?? {};
  const userBrandSelections: Record<string, string> = myTools.user_brand_tiers ?? {};
  const { tool: masterTool } = getMasterBrain(tools);

  // Resolve a human-readable tier label for a tool
  function resolveTierLabel(toolId: string): string {
    // Check if tool belongs to a brand tier def
    for (const [brandKey, brandDef] of Object.entries(userBrandTiers)) {
      const def = brandDef as { options: Array<{ id: string; label: string }> };
      const selectedId = userBrandSelections[brandKey];
      // Check tool_ids match — not available in this simplified lookup, use options
      if (selectedId) {
        const opt = def.options.find((o) => o.id === selectedId);
        if (opt && opt.id !== "free") return `🔑 ${opt.label}`;
      }
    }
    const generic = userTiers[toolId];
    if (!generic || generic === "free") return "🆓 גרסה חינמית";
    if (generic === "api") return "🔑 API";
    return "🔑 Pro";
  }

  const lines = relevant.map((t, i) => {
    const heb = t.hebrew_support === "תומך" ? "✅ תומך בעברית" : "⚠️ תמיכה חלקית";
    const tierNote = resolveTierLabel(t.id);
    const masterNote = masterTool?.id === t.id ? " 🏆 Master Brain" : "";
    return `**${i + 1}. ${t.name}${masterNote}**\n📌 ${t.description.slice(0, 120)}\n💰 ${t.cost}  |  ${heb}  |  ${tierNote}`;
  });

  const masterLine = masterTool
    ? `\n🏆 **ה-Master Brain שלך:** ${masterTool.name} — ישמש כ"מוח" הראשי של הפרויקט.\n`
    : "";

  return (
    `בהתבסס על התשובות שלך, הנה ההמלצות המותאמות לארגז הכלים שלך:${masterLine}\n\n${lines.join("\n\n")}\n\n` +
    `💡 **טיפ:** התחל עם הכלי הראשון — הוא המתאים ביותר לצרכים שתיארת.`
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
export interface Tool {
  id: string;
  category: string;
  name: string;
  link: string;
  description: string;
  hebrew_support: "תומך" | "לא תומך" | "לא ידוע";
  cost: string;
  rating: string | null;
  source: string;
  verified: boolean;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface Project {
  id: string;
  title: string;
  task: string;
  matched_categories: string[];
  matched_tool_ids: string[];
  chat_history: ChatMessage[];
  status: "awaiting_answers" | "recommended" | "active";
}

export interface ProjectsDB {
  projects: Project[];
}

export interface ToolStrengths {
  deep_reasoning?: number;
  coding?: number;
  writing?: number;
  hebrew?: number;
  web_search?: number;
  image_gen?: number;
  video_gen?: number;
  automation?: number;
  speed?: number;
}

export interface MyToolsDB {
  user_tiers: Record<string, string>;
  user_brand_tiers?: Record<string, string>;
  brand_tiers?: Record<string, unknown>;
  tool_strengths: Record<string, ToolStrengths>;
}
