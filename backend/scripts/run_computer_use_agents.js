/**
 * Computer Use Agents Research Runner
 * Researches browser/desktop agents from various ecosystems (NOT Anthropic-specific)
 * Each report follows the 6-chapter methodology
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = "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";
const WIKI_DIR = path.join(__dirname, "..", "data", "wiki");

const SYSTEM_PROMPT = `אתה מחקרן בכיר ב"מרכז הידע לבינה מלאכותית". אתה כותב דוחות מחקר עמוקים בעברית.

## תבנית חובה — 6 פרקים לכל דוח:

### פרק 1: תקציר טכני (Technical Summary)
- גרסת מודל מדויקת, סוג, יכולות ליבה
- ביצועי benchmark (מספרים ספציפיים)
- מיקום בעץ המוצרים של הספק

### פרק 2: סקירת ממשק והגדרות מלאה (UI & Settings Audit)
- ציון נוחות ניווט 1-10 עם הסבר
- כל פרמטר זמין: Temperature, Top P, Frequency Penalty, Presence Penalty, Stop Sequences, Logit Bias
- כפתורים, טוגלים, מצבים נסתרים
- System Instructions — גישה, מגבלות, שדות
- UX ספציפי: streaming, latency, feedback

### פרק 3: ניתוח כלכלי ומגבלות (Economics & Quotas)
- טבלה: גרסה חינמית vs. תשלום (עלות/1M tokens, RPM, TPM, Context Window)
- חישוב עלות שיחה טיפוסית
- Batch API / Prompt Caching / הנחות
- תמחור Enterprise vs. API

### פרק 4: מבחני מאמץ (5 Stress Tests)
1. Perturbation Test — עקביות תחת שינוי פורמט
2. Hebrew Morphology — דקדוק עברי ומגדר
3. ProofGrid — לוגיקה חסרה בהוכחות
4. Phonemic Ambiguity — דו-משמעות ללא ניקוד
5. Load-Accuracy — יציבות תחת עומס

### פרק 5: לוקליזציה לישראל (Israeli Localization)
- תאימות RTL — בעיות ידועות ופתרונות
- טיפול במגדר עברי (שגיאות, פתרונות)
- חוק הגנת הפרטיות הישראלי 1981
- MASAV ותשלומים מקומיים
- התאמה תרבותית (וואטסאפ vs. פורמלי)

### פרק 6: מסקנות והמלצות (Final Recommendations)
- האם להטמיע? מתי? לאיזה שימוש?
- "נוסחאות סודיות" — prompts שעבדו
- השוואה לחלופות

## כללים קריטיים:
- מינימום 6000 מילים
- כל פרק: לפחות 3 תת-פרקים
- מונחים טכניים: עברית + (English)
- ציין תאריכים, גרסאות, מחירים מדויקים
- כלול דוגמאות קוד/prompt אמיתיות
- התבסס על מקורות: דוקומנטציה רשמית, GitHub, HuggingFace, arXiv, Hacker News`;

const RESEARCH_TOPICS = [
  {
    id: "nemoclaw-openclaw",
    filename: "nemoclaw-openclaw.md",
    ecosystem: "Computer Use Agents",
    title: "NemoClaw / OpenClaw — סוכן Computer Use פתוח בשיתוף NVIDIA: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על NemoClaw ו-OpenClaw לשנת 2026 — סוכן Computer Use קוד-פתוח המופעל בשיתוף NVIDIA, עם דגש על הרצה מקומית מאובטחת.

## נושאים לכיסוי מלא:

### מהו NemoClaw / OpenClaw?
- מה הקשר בין NemoClaw ל-OpenClaw? האם הם אותו פרויקט?
- תפקיד NVIDIA בפרויקט: NeMo framework, GPU optimization
- מאגר GitHub — כתובת, כוכבים, contributors, רישיון
- מצב פיתוח: production-ready / experimental?
- מה המודל שמריץ: LLaMA 3? Mistral? Qwen? או API חיצוני?

### יכולות טכניות:
**Computer Use Core:**
- screenshot → action pipeline
- GUI element detection (icons, buttons, text)
- coordinate-based vs. semantic-based actions
- multi-monitor support
- keyboard + mouse simulation (xdotool? pyautogui?)

**Local Execution:**
- הרצה מקומית מלאה — requirements: VRAM, CPU, RAM
- GPU acceleration via NVIDIA CUDA
- אילו GPUs נתמכות: RTX 3080? RTX 4090? A100?
- quantization options: 4-bit, 8-bit
- offline mode — ללא גישה לאינטרנט

**Safety Sandbox:**
- container isolation (Docker? Podman?)
- filesystem restrictions
- network isolation options
- audit logging

### Installation ו-Setup מלא:
- prerequisites
- docker-compose / bare metal
- GPU passthrough configuration
- model download ו-setup
- configuration files

### Performance Benchmarks:
- latency per action vs. Claude Computer Use vs. GPT-4o
- accuracy on ScreenSpot / OSWorld benchmarks
- VRAM usage at different quality levels
- throughput: tasks per hour

### Use Cases המתאימים:
- אוטומציה של desktop apps ללא API
- testing ו-QA local applications
- RPA (Robotic Process Automation) חלופה
- gaming automation
- accessibility tools

### השוואה מקיפה:
- vs. Claude Computer Use (Cowork)
- vs. Google Project Mariner
- vs. OpenAI Operator
- vs. Browser Use (Playwright-based)
- vs. Stagehand

### אבטחה ופרטיות:
- יתרון הרצה מקומית: data never leaves machine
- סיכוני prompt injection
- sandbox escapes
- responsible use

עמוד על כל 6 פרקי התבנית עם דוגמאות קוד Python ו-bash מלאות.`
  },
  {
    id: "browser-use-oss",
    filename: "browser-use-oss.md",
    ecosystem: "Computer Use Agents",
    title: "Browser Use — סוכן הדפדפן קוד-פתוח: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Browser Use (browser-use) לשנת 2026 — ספריית Python קוד-פתוח לאוטומציה של דפדפן בשפה טבעית עם LLMs.

## נושאים לכיסוי מלא:

### מהו Browser Use?
- GitHub repo: browser-use/browser-use — כמה כוכבים? contributors? רישיון?
- מי יצר אותו? history
- אילו LLMs נתמכים: OpenAI, Anthropic, Gemini, Ollama?
- מה Playwright ו-Chromium עושים מתחת לכיסה
- מצב הפרויקט: stable / actively developed?

### ארכיטקטורה:
- Agent loop: plan → act → observe → repeat
- DOM extraction vs. screenshot-based
- element selection strategy
- memory: conversation history, state tracking
- tool definitions: click, type, scroll, navigate, extract

### Installation ו-Quick Start:
- pip install browser-use
- playwright setup
- .env configuration
- first working example
- common errors ופתרונות

### Advanced Features:
- custom tools הוספה
- multi-tab support
- file upload/download
- authentication handling (login flows)
- captcha handling (או לא?)
- headless vs. headed mode

### Performance ו-Reliability:
- benchmarks על WebArena / Mind2Web / ScreenSpot
- success rate על tasks מורכבים
- token usage per task
- cost per task עם Claude Sonnet vs. GPT-4o

### Use Cases:
- web scraping ב-scale
- form automation
- e-commerce automation (checkout flows)
- lead generation
- competitive monitoring

### Alternatives Comparison:
- vs. Stagehand (Browserbase)
- vs. Playwright MCP
- vs. AgentQL
- vs. Selenium (legacy)
- vs. Claude Cowork / Quark

### עבור ישראל:
- תמיכה בעברית ו-RTL
- חיבור לאתרים ממשלתיים (gov.il)
- שילוב עם שירותים ישראליים

עמוד על כל 6 פרקי התבנית עם דוגמאות קוד Python מלאות.`
  },
  {
    id: "genspark-claw",
    filename: "genspark-claw.md",
    ecosystem: "Computer Use Agents",
    title: "Genspark Claw — סוכן הדפדפן של Genspark: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Genspark Claw לשנת 2026 — סוכן אוטומציה של דפדפן מ-Genspark שמיועד לביצוע tasks אוטונומיים ברשת.

## נושאים לכיסוי מלא:

### מהו Genspark Claw?
- מה Genspark כחברה? מי מאחוריה?
- Claw ספציפית: אג'נט דפדפן? desktop? שילוב?
- מודל AI שמריץ: קניינו? Claude? GPT?
- גישה: API, web app, Chrome extension?
- מצב: GA / Beta / waitlist?

### יכולות:
- web browsing אוטונומי
- task planning ו-execution
- multi-step workflows
- form filling ו-submission
- data extraction ו-aggregation
- research tasks

### Pricing:
- תכנית חינמית
- plans בתשלום
- API access
- enterprise

### Benchmarks ו-Performance:
- success rate על tasks אמיתיים
- latency
- comparison to alternatives

### Use Cases:
- research automation
- competitor analysis
- lead generation
- content aggregation

### השוואה לשוק:
- vs. Claude Cowork
- vs. Browser Use
- vs. Taskade Agent
- vs. Lindy AI

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "cursor-agents",
    filename: "cursor-agents.md",
    ecosystem: "Computer Use Agents",
    title: "Cursor Agents — מצב הסוכן של Cursor IDE: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Cursor Agents (Agent Mode) לשנת 2026 — מצב הסוכן האוטונומי של Cursor IDE שמריץ קוד, מתקן שגיאות ומנהל פרויקטים.

## נושאים לכיסוי מלא:

### Cursor Agent Mode:
- מהו Agent Mode ב-Cursor (vs. Chat vs. Composer)?
- אילו מודלים: claude-3-7-sonnet, GPT-4o, Gemini, cursor-small?
- MAX mode — מה זה? מה עולה יותר?
- YOLO mode — הרצת פקודות ללא אישור
- Background agents — מה זה?

### יכולות Agent:
**File Operations:**
- קריאה/כתיבה/יצירה/מחיקה של קבצים
- refactoring על פני project שלם
- multi-file edits

**Terminal Integration:**
- הרצת commands
- npm install, git, docker, pytest
- error recovery — מה קורה כשcommand נכשל?

**Codebase Understanding:**
- indexing ו-embeddings
- @ symbols: @file, @folder, @codebase, @web, @docs
- Context management

**Web Search:**
- @web integration
- searching Stack Overflow, GitHub
- reading documentation

### CLAUDE.md / .cursor/rules:
- איך להגדיר rules לAgent
- project-specific context
- memory patterns

### Pricing:
- Fast requests vs. Slow requests
- Token limits per plan
- context window per model

### Security:
- YOLO mode risks
- .cursorrules best practices
- secrets management

### Comparison:
- vs. Claude Code
- vs. GitHub Copilot Workspace
- vs. Windsurf Cascade
- vs. Devin

עמוד על כל 6 פרקי התבנית עם configuration examples ו-use-cases מפורטים.`
  }
];

async function callPerplexity(topic) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: "sonar-pro",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: topic.prompt }
      ],
      temperature: 0.1,
      max_tokens: 8000,
      return_citations: true,
      search_recency_filter: "month"
    });

    const options = {
      hostname: "api.perplexity.ai",
      path: "/chat/completions",
      method: "POST",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    };

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          if (json.error) return reject(new Error(JSON.stringify(json.error)));
          const content = json.choices[0].message.content;
          const citations = json.citations || [];
          const usage = json.usage || {};
          const cost = ((usage.prompt_tokens * 3 + usage.completion_tokens * 15) / 1000000).toFixed(4);
          resolve({ content, citations, usage, cost });
        } catch(e) { reject(e); }
      });
    });

    req.on("error", reject);
    req.setTimeout(120000, () => { req.destroy(); reject(new Error("timeout")); });
    req.write(payload);
    req.end();
  });
}

function saveWiki(topic, result) {
  let md = `# ${topic.title}\n\n`;
  md += result.content;
  md += "\n\n---\n";
  md += "**מקורות:**\n";
  result.citations.forEach((c, i) => md += `${i+1}. ${c}\n`);
  md += `\n**עלות מחקר זה**: $${result.cost}\n`;
  md += `**תאריך מחקר**: 2026-04-05\n`;
  md += `**מודל מחקר**: sonar-pro\n`;
  md += `**אקו-סיסטם**: ${topic.ecosystem}\n`;

  const filePath = path.join(WIKI_DIR, topic.filename);
  fs.writeFileSync(filePath, md, "utf8");
  return filePath;
}

async function main() {
  const args = process.argv.slice(2);
  const targetId = args[0];

  const topics = targetId
    ? RESEARCH_TOPICS.filter(t => t.id === targetId)
    : RESEARCH_TOPICS;

  if (topics.length === 0) {
    console.error(`Topic "${targetId}" not found. Available: ${RESEARCH_TOPICS.map(t => t.id).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n🖥️  מריץ ${topics.length} מחקרים — Computer Use Agents\n`);

  for (const topic of topics) {
    console.log(`\n⏳ [${topic.id}] מתחיל מחקר...`);
    const start = Date.now();
    try {
      const result = await callPerplexity(topic);
      const filePath = saveWiki(topic, result);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`✅ [${topic.id}] נשמר: ${filePath}`);
      console.log(`   📊 ${result.content.length} תווים | ${result.citations.length} מקורות | $${result.cost} | ${elapsed}s`);

      if (topics.indexOf(topic) < topics.length - 1) {
        console.log("   ⏸️  ממתין 3 שניות...");
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch(err) {
      console.error(`❌ [${topic.id}] שגיאה:`, err.message);
    }
  }

  console.log("\n🏁 סיום!\n");
}

main();
