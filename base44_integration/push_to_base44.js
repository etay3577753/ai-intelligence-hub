/**
 * AI Intelligence Hub → Base44 Push Script
 * ==========================================
 * גרסה מתוקנת של הקוד שBase44 שלח — עם ה-URL הנכון והנתונים האמיתיים.
 *
 * שימוש:
 *   node push_to_base44.js
 *
 * דרישות:
 *   npm install node-fetch  (אם Node < 18)
 */

// ─── הגדרות ───────────────────────────────────────────────────────────────────

// ✅ URL נכון — לא api.base44.com (שבור)
const BASE44_API = "https://base44.app/api";

// ✅ APP_ID בלי preview-sandbox-- prefix
const APP_ID = "6a12ac36d1e7c422d8dff817";

// ✅ auth header נכון — לא Bearer, אלא api_key
const API_KEY  = "ac8971c61fc24b25ba6fe9958742767e";

const HEADERS = {
  "Content-Type": "application/json",
  "api_key": API_KEY,
};

// ─── פונקציית דחיפה בסיסית ───────────────────────────────────────────────────

async function pushRecord(entity, data) {
  const url = `${BASE44_API}/apps/${APP_ID}/entities/${entity}/upsert`;
  const res  = await fetch(url, {
    method:  "POST",
    headers: HEADERS,
    body:    JSON.stringify({ ...data, imported_from: "claude_code_local" }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
  return res.json();
}

// ─── מחקרי עומק (AITool entity) ──────────────────────────────────────────────

const RESEARCH_DATA = [
  {
    name:           "Claude Code",
    ecosystem_name: "Anthropic",
    category:       "מחקר עומק",
    description:    "כלי AI לפיתוח קוד מהמסוף — Claude ישירות ב-terminal עם גישה לקבצים, Git, ואינטרנט. מאפשר פיתוח מהיר עם הבנת context מלא של הפרויקט.",
    source_url:     "https://claude.ai/code",
    source_id:      "claude_code",
    tags:           ["מחקר", "Anthropic", "קוד", "CLI"],
    quality_score:  94,
  },
  {
    name:           "Cursor",
    ecosystem_name: "Cursor",
    category:       "מחקר עומק",
    description:    "עורך קוד מבוסס VS Code עם AI מובנה. תומך ב-multi-file editing, codebase context, ו-chat על הקוד. אחד הכלים הפופולריים ביותר למפתחים ב-2024-2025.",
    source_url:     "https://cursor.com",
    source_id:      "cursor",
    tags:           ["מחקר", "קוד", "IDE"],
    quality_score:  91,
  },
  {
    name:           "Perplexity AI",
    ecosystem_name: "Perplexity",
    category:       "מחקר עומק",
    description:    "מנוע חיפוש מבוסס AI עם ציטוטים בזמן אמת. מאחד חיפוש + AI + מקורות. אידיאלי למחקר מהיר עם עדכניות מקסימלית.",
    source_url:     "https://perplexity.ai",
    source_id:      "perplexity",
    tags:           ["מחקר", "חיפוש", "מחקר עומק"],
    quality_score:  89,
  },
  {
    name:           "Zapier AI",
    ecosystem_name: "Zapier",
    category:       "מחקר עומק",
    description:    "פלטפורמת אוטומציה עם AI. מחבר אלפי אפליקציות ומאפשר זרימות עבודה אוטומטיות בלי קוד. פופולרי מאוד לאוטומציות שיווק ועסקים.",
    source_url:     "https://zapier.com",
    source_id:      "zapier",
    tags:           ["מחקר", "אוטומציה", "No-Code"],
    quality_score:  86,
  },
  {
    name:           "MCP (Model Context Protocol)",
    ecosystem_name: "Anthropic",
    category:       "מחקר עומק",
    description:    "פרוטוקול סטנדרטי לחיבור LLMs לכלים חיצוניים. מאפשר ל-Claude ולמודלים אחרים לגשת לDB, APIs, ופונקציות מקומיות בצורה מאובטחת.",
    source_url:     "https://modelcontextprotocol.io",
    source_id:      "mcp",
    tags:           ["מחקר", "Anthropic", "פרוטוקול", "integrations"],
    quality_score:  92,
  },
];

// ─── סרטוני YouTube לדוגמה (IntelligenceFeed entity) ─────────────────────────

const YOUTUBE_SAMPLES = [
  {
    title:          "Race Conditions — מה הן ולמה הן מסוכנות",
    source_name:    "YouTube — אלירן גיני",
    summary_hebrew: "הסבר על Race Conditions בתכנות — מצב שבו שני threads מנסים לגשת למשאב משותף בו-זמנית וגורמים לבאגים לא דטרמיניסטיים.",
    content:        "race conditions הם מצב שבו שני threads מנסים לגשת למשאב משותף בו-זמנית. זה יוצר באגים שקשה מאוד לשחזר כי הם תלויים בתזמון המדויק של הריצה.",
    url:            "https://youtube.com/watch?v=example1",
    date:           "2025-03-15",
    source_id:      "race_conditions_example",
    tags:           ["YouTube", "אלירן גיני", "תכנות", "Rails"],
  },
  {
    title:          "Docker מ-A עד Z — למתחילים",
    source_name:    "YouTube — אלירן גיני",
    summary_hebrew: "הסבר מקיף על Docker — מה זה container, למה Docker עדיף על VM, ואיך מתחילים לעבוד עם Docker Compose.",
    content:        "Docker הוא כלי לאריזת אפליקציות ב-containers. כל container כולל את כל מה שהאפליקציה צריכה — קוד, runtime, ספריות. מאפשר 'works on my machine' לכולם.",
    url:            "https://youtube.com/watch?v=example2",
    date:           "2025-02-20",
    source_id:      "docker_basics_example",
    tags:           ["YouTube", "אלירן גיני", "Docker", "DevOps"],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🚀 AI Intelligence Hub → Base44 Push\n");
  console.log(`📡 API: ${BASE44_API}`);
  console.log(`🆔 App: ${APP_ID}\n`);

  // Push AITool records
  console.log("── מחקרי עומק (AITool) ──────────────────────");
  for (const tool of RESEARCH_DATA) {
    try {
      await pushRecord("AITool", tool);
      console.log(`  ✅ ${tool.name}`);
    } catch (e) {
      console.log(`  ❌ ${tool.name}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 200)); // rate limit
  }

  // Push IntelligenceFeed records (YouTube)
  console.log("\n── סרטוני YouTube (IntelligenceFeed) ────────");
  for (const video of YOUTUBE_SAMPLES) {
    try {
      await pushRecord("IntelligenceFeed", video);
      console.log(`  ✅ ${video.title.slice(0, 50)}`);
    } catch (e) {
      console.log(`  ❌ ${video.title.slice(0, 40)}: ${e.message}`);
    }
    await new Promise(r => setTimeout(r, 200));
  }

  console.log("\n✅ סיום!\n");
  console.log("💡 לדחיפת כל 349 הקבצים מהמחשב המקומי:");
  console.log("   python backend/base44_push.py --api-key ac8971c61fc24b25ba6fe9958742767e --app-id 6a12ac36d1e7c422d8dff817");
}

main().catch(console.error);
