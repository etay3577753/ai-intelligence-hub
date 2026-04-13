/**
 * Deep Chapter Research Runner
 * Makes 6 separate Perplexity calls (one per chapter) → one rich wiki file
 * Each chapter gets ~8000 tokens → total ~48000 tokens per tool
 *
 * Usage:
 *   node run_deep_chapter.js claude-code
 *   node run_deep_chapter.js cursor-ide
 *   node run_deep_chapter.js [tool-id]
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = "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";
const WIKI_DIR = path.join(__dirname, "..", "data", "wiki");

// ─────────────────────────────────────────────────────────────────────────────
// TOOL DEFINITIONS
// Each tool has: id, filename, ecosystem, title, context (shared background),
// and 6 chapter prompts — each designed for a focused 8000-token deep-dive
// ─────────────────────────────────────────────────────────────────────────────
const TOOLS = {

  "claude-code": {
    filename: "claude-code.md",
    ecosystem: "Anthropic",
    title: "Claude Code — מדריך עמוק ומלא: מ-CLI מתחיל ועד Agent מתקדם",
    context: "Claude Code הוא CLI של Anthropic שמריץ Claude ישירות מהטרמינל ועובד על קוד בפרויקטים אמיתיים.",
    chapters: [
      {
        num: 1,
        title: "פרק 1: תקציר טכני ומה זה בכלל",
        prompt: `אתה מסביר לבן 13 חכם שמתחיל לקודד ולמבוגר מתחיל, מה זה Claude Code של Anthropic.

הסבר בפירוט מלא ועשיר:

## מה זה Claude Code בפשטות?
- תאר כאילו אתה מסביר לבן 13 שיודע מה זה terminal: "Claude Code זה כמו..."
- למה זה שונה מ-ChatGPT? מה המשמעות של "עובד על הקבצים שלך ישירות"?
- מה זה CLI ולמה זה חשוב לדברלופרים?
- איך זה שונה מ-Cursor? מ-GitHub Copilot?

## ההיסטוריה והדליפה המפורסמת:
- מתי יצא? איזה גרסאות היו?
- דליפת קוד המקור (מרץ 2026): מה בדיוק דלף? 512K שורות TypeScript - מה זה אומר?
- מה גילינו מהדליפה על "Undercover Mode"? מה זה?
- תגובת Anthropic לדליפה

## המודל מאחורי Claude Code:
- איזה מודל רץ: claude-sonnet-4-6? claude-opus-4-6?
- Benchmarks: SWE-bench scores - כמה? מה זה אומר?
- Context window: כמה טוקן? למה זה חשוב לקוד?
- Extended Thinking - מה זה ומתי Claude Code משתמש בו?

## Installation מלא:
- npm install -g @anthropic-ai/claude-code
- דרישות מערכת: Node.js גרסה כמה?
- Windows: native vs WSL2 - מה עדיף ולמה?
- הגדרת API key ב-.env
- בדיקה ראשונה: claude --version

## כל הפקודות הבסיסיות:
- claude (interactive mode)
- claude "שאלה ישירה" (one-shot)
- claude --continue (המשך שיחה)
- claude --resume (חזרה להיסטוריה)
- כל הflags: --model, --max-tokens, --temperature, --output-format, --verbose

כתוב לפחות 1500 מילים בעברית עשירה. כלול דוגמאות אמיתיות. הסבר כל מונח.`
      },
      {
        num: 2,
        title: "פרק 2: CLAUDE.md, Hooks ומערכת ה-Permissions",
        prompt: `כתוב מדריך עמוק ומפורט על CLAUDE.md, Hooks ומערכת Permissions של Claude Code.

## CLAUDE.md — הקובץ הסודי שמשנה הכל:
- מה זה CLAUDE.md ולמה זה כמו "הוראות עבודה לקלוד"?
- היררכיה: ~/.claude/CLAUDE.md (גלובלי) vs ./CLAUDE.md (פרויקט) vs תת-תיקיות
- מה לכתוב בו? דוגמאות אמיתיות:
  * "דבר תמיד בעברית"
  * "אל תמחק קבצים ללא אישור"
  * "הפרויקט משתמש ב-TypeScript strict mode"
  * "הדפסות debug תמיד עם console.debug ולא console.log"
- @import — הכנסת קבצים אחרים ל-CLAUDE.md
- CLAUDE.md לפי שפת תכנות (Python, TypeScript, Rust)
- מה קורה אם CLAUDE.md סותר הוראה של המשתמש?

## Hooks — אוטומציה אמיתית:
- מה זה Hooks ב-Claude Code? (Shell commands שרצים לפני/אחרי פעולות)
- PreToolUse: רץ לפני שClaud מבצע פעולה
- PostToolUse: רץ אחרי פעולה
- Notification: כשClaud רוצה להתריע
- Stop: כשAgentloop מסתיים
- דוגמאות hooks אמיתיות:
  * auto-format עם prettier אחרי כל שמירת קובץ
  * git add -A אחרי כל שינוי
  * שליחת notification ל-Slack כשמשימה מסתיימת
  * blocking hook שמונע מחיקת קבצים .env
- איפה מגדירים hooks: settings.json
- הגבלות: מה hooks לא יכולים לעשות?

## Permissions — מה Claude Code מותר לעשות:
- default permissions: קריאה תמיד, כתיבה צריכה אישור
- --dangerously-skip-permissions: מה זה? מתי להשתמש? הסיכון האמיתי
- Allowed tools: bash, read, write, web_fetch
- /permissions command — הגדרה בזמן ריצה
- Enterprise permissions — admin controls
- Prompt injection via files — הסיכון הגדול

## Settings.json המלא:
- ~/.claude/settings.json — כל הפרמטרים
- model, maxTokens, temperature
- hooks configuration
- allowed/denied tools
- theme, language settings

כתוב לפחות 1500 מילים. כלול דוגמאות קוד CLAUDE.md ו-settings.json אמיתיות.`
      },
      {
        num: 3,
        title: "פרק 3: Agent Loop, MCP ו-Multi-Agent",
        prompt: `כתוב מדריך עמוק על ה-Agent Loop של Claude Code, MCP integration ו-Multi-Agent workflows.

## ה-Agent Loop — לב ליבו של Claude Code:
- מה זה Agent Loop? הסבר כמו לבן 13: "Claude Code עובד כמו..."
- observe → think → act → repeat: הסבר כל שלב
- כמה סיבובים יכולים להיות? מה עוצר את הלופ?
- Tool execution pipeline: מה קורה כשClaude רוצה לבצע פעולה
- Context window management: מה קורה כשה-context מתמלא?
- Memory compaction: איך Claude Code "מסכם" ומתכווץ
- מה ה-Undercover Mode שדלף? (הסבר מהדליפה)

## כל הTools הזמינים:
- bash: הרצת shell commands
- read_file / write_file: קריאה וכתיבה
- list_directory / find: navigation
- web_fetch: גישה לאינטרנט
- github: git operations
- computer_use (בגרסות מסוימות): שליטה ב-GUI
- task: יצירת sub-agent!

## MCP ב-Claude Code:
- מה זה MCP? הסבר בפשטות: "USB-C לAI"
- claude mcp add [name] [command] — הוספת MCP server
- claude mcp list — כל ה-servers
- --mcp-debug — debugging
- MCP servers מובנים ב-Claude Code:
  * filesystem MCP
  * github MCP
  * brave-search MCP
- הגדרה ב-claude_desktop_config.json
- Zapier MCP — חיבור ל-8000+ אפליקציות
- דוגמה: MCP server לישראל (Monday.com, Wix)

## Multi-Agent Workflows:
- Task tool: יצירת sub-agent מ-agent
- spawning parallel agents
- orchestrator vs. subagent roles
- context sharing — מה עובר בין agents?
- coordination patterns: sequential, parallel, fan-out
- דוגמה אמיתית: research agent + code agent + review agent

## Windows ו-WSL Setup מלא:
- Windows Native: מה עובד ומה לא?
- WSL2: למה זה עדיף לרוב הדברים?
- path conflicts: איך Claude Code מתמודד עם C:\\vs /mnt/c/
- Git credentials ב-WSL
- performance: native vs WSL — מדידות אמיתיות

כתוב לפחות 1500 מילים. כלול דוגמאות shell commands אמיתיות.`
      },
      {
        num: 4,
        title: "פרק 4: תמחור, עלויות וניהול תקציב",
        prompt: `כתוב ניתוח כלכלי עמוק ומלא של Claude Code — כמה זה עולה, מתי כדאי, ואיך לחסוך.

## מודל התמחור המלא:
- Claude Code עצמו: חינם (CLI)
- מה עולה כסף: ה-API calls למודל
- מחיר claude-sonnet-4-6: $3/1M input, $15/1M output
- מחיר claude-opus-4-6: $15/1M input, $75/1M output
- מחיר claude-haiku-4-5: $0.80/1M input, $4/1M output
- מה זה טוקן? הסבר כמו לבן 13 (דמיין כרטיסיות מילים)
- כמה טוקנים "עולה" שיחה טיפוסית?

## חישוב עלות ריאלי:
- Task פשוט: "תקן את הbug הזה" — כמה טוקנים? כמה עולה?
- Task בינוני: "צור קומפוננטה React" — כמה?
- Task מורכב: "refactor כל ה-authentication" — כמה?
- Session של שעה של פיתוח: עלות ממוצעת
- מה ה"מלכודת": context window גדולה = יותר input tokens

## Claude.ai Plans vs. API:
- Claude Pro ($20/mo): כולל Claude Code עם usage limits
- Claude Max ($100/mo): פחות הגבלות, יותר usage
- Claude Team ($30/user/mo): לצוותים
- Enterprise: custom pricing
- Pure API: ללא subscription, תשלום per token
- מה עדיף למפתח בודד? לסטארטאפ? לארגון גדול?

## Prompt Caching — חיסכון של 90%:
- מה זה Prompt Caching? הסבר בפשטות
- CLAUDE.md נשמר ב-cache → חיסכון ענק
- cache_control: ephemeral vs. persistent
- כמה חוסכים על session ארוכה? חישוב
- Batch API: 50% הנחה אם לא צריך real-time

## טיפים לחיסכון:
- .claude-ignore: מה לא לכלול ב-context
- --model haiku לmicro-tasks
- פיצול tasks גדולים לקטנים
- context compression עם /compact
- מה לשים ב-CLAUDE.md לחסוך טוקנים

## השוואת ROI:
- Claude Code vs. junior developer: עלות לשעה
- Claude Code vs. Cursor Pro ($20/mo): מה עדיף?
- Claude Code vs. GitHub Copilot ($10/mo): השוואה
- breakeven point: כמה שעות פיתוח שווה החיסכון?

כתוב לפחות 1500 מילים עם חישובים אמיתיים ומספרים.`
      },
      {
        num: 5,
        title: "פרק 5: Claude Code בישראל — מה ישראלים אומרים",
        prompt: `כתוב על Claude Code מנקודת מבט ישראלית: מה אומרים מפתחים ישראלים, משפיעני טכנולוגיה ישראלים, ומה הייחוד של שימוש ב-Claude Code בישראל.

## מה מפתחים ישראלים אומרים על Claude Code:
- מה הביקורות של מפתחים ישראלים ב-Twitter/X ו-LinkedIn?
- פודקאסטים טכנולוגיים ישראלים שדיברו על Claude Code (Reversim, DevOps Israel, וכדומה)
- קהילת הסטארטאפים הישראלית: איך Claude Code נכנס לtoolchain?
- יוטיוברים וסטרימרים ישראלים שמדגימים Claude Code
- פורומים ישראליים (Facebook groups, Slack communities) — מה אומרים שם?

## שימוש בעברית ב-Claude Code:
- האם Claude Code מדבר עברית? באיזה רמה?
- CLAUDE.md בעברית: האם עובד?
- קוד עם תגובות בעברית — מה קורה?
- משתני שם בעברית — תמיכה?
- RTL בפלט — בעיות ידועות
- שגיאות דקדוק עברי ב-output (מגדר, גוף, זמן)

## חוק הגנת הפרטיות הישראלי ו-Claude Code:
- תיקון 13 לחוק הגנת הפרטיות (אוגוסט 2025) — מה רלוונטי?
- האם מותר לשלוח קוד עם data ישראלי לAnthropic?
- PII בקוד: מספרי ת.ז., כרטיסי אשראי, data רפואי
- Data retention של Anthropic: כמה זמן שומרים?
- Enterprise plans ו-zero retention option
- GDPR vs. ישראל — מה החברות הישראליות עושות?

## הייחוד הישראלי:
- חיבור ל-Monday.com דרך MCP
- אינטגרציה עם שירותים ישראליים (Tranzila, Payoneer, iCount)
- RTL apps: React עם direction rtl ו-Claude Code
- עבודה על שעות ישראל vs. שרתי Anthropic בארה"ב — latency?
- VAT והחזרי מס על subscription (עוסק מורשה)

## Startup Nation ו-Claude Code:
- סטארטאפים ישראלים שמשתמשים ב-Claude Code
- VC ישראלים שממליצים על AI coding tools
- תוכניות אקסלרטור שכוללים Claude Code ב-toolkit
- השוואה: מפתח ישראלי עם Claude Code vs. בלעדיו — פרודוקטיביות

כתוב לפחות 1500 מילים. כלול ציטוטים ספציפיים מישראלים אם ניתן.`
      },
      {
        num: 6,
        title: "פרק 6: מסקנות, טיפים סודיים וPROMPTS שעובדים",
        prompt: `כתוב את הפרק הסופי של המדריך על Claude Code: המלצות אמיתיות, prompts שעובדים, ו"נוסחאות סודיות".

## האם להשתמש? מי ולמה:
- למפתח בודד (freelancer): כן/לא/מתי?
- לסטארטאפ קטן (2-5 אנשים): מה ה-use case הכי טוב?
- לחברה בינונית (50+ מהנדסים): מה צריך לדעת?
- למי Claude Code לא מתאים? (עם הסבר כן)
- השוואה סופית: Claude Code vs. Cursor vs. GitHub Copilot vs. Windsurf

## PROMPTS שעובדים — "נוסחאות סודיות":
כתוב prompts אמיתיים שמשתמשים מדווחים שעובדים:

**לבאגים:**
"בדוק את הקובץ X, מצא למה Y לא עובד, ותקן בלי לשנות את השאר"

**לrefactoring:**
"refactor את הפונקציה X כדי שתהיה יותר readable, תוסיף JSDoc, אבל אל תשנה את הlogic"

**לreview:**
"קרא את כל הקבצים בתיקיית /src ותגיד לי מה הבעיות הכי קריטיות"

**לtests:**
"צור unit tests ל-X עם Jest, כסה edge cases שלא חשבתי עליהם"

**ל-multi-agent:**
"יצור agent שמחפש ב-GitHub Issues, מוצא bugs שנפתחים, ומוצר PRs לתיקון"

## CLAUDE.md templates מנוסים:
- Template לפרויקט React/TypeScript
- Template לפרויקט Python/FastAPI
- Template לFullstack (Next.js + Supabase)
- Template לישראלים: RTL + עברית

## טעויות נפוצות ואיך להימנע:
- "Claude מחק לי קבצים" — איך למנוע
- "Claude שינה לי דברים שלא ביקשתי" — איך למנוע
- "הContext התמלא ולא זוכר" — מה לעשות
- "Claude תקוע בלופ" — איך לשבור
- "עלות גבוהה בלי ציפייה" — ניהול תקציב

## עתיד Claude Code (2026-2027):
- מה צפוי לפי roadmap ידוע
- Background Agents (Beta) — מה זה?
- Claude Code בCloud (no local setup)
- אינטגרציות עם IDEs (VS Code extension?)
- מה עדיין חסר ומתי יגיע

## ציונים סופיים:
- ציון כולל: X/10
- קלות הלמידה: X/10
- עלות-תועלת: X/10
- תמיכת עברית: X/10
- מתאים ל: [רשימה]
- לא מתאים ל: [רשימה]

כתוב לפחות 1500 מילים. זה הפרק הכי חשוב — תן המלצות אמיתיות ופרקטיות.`
      }
    ]
  },

  "cursor-ide": {
    filename: "cursor-ide.md",
    ecosystem: "Dev/Code",
    title: "Cursor IDE — מדריך עמוק: מה זה, איך עובד, וכמה עולה",
    context: "Cursor הוא IDE מבוסס VS Code עם AI מובנה, כלי הprogramming הפופולרי ביותר בקרב מפתחים ב-2025-2026.",
    chapters: [
      {
        num: 1,
        title: "פרק 1: מה זה Cursor ולמה כולם עברו אליו",
        prompt: `כתוב פרק עמוק ופשוט על מה זה Cursor IDE.

## מה זה Cursor בפשטות:
- הסבר לבן 13 שיודע מה זה VS Code: "Cursor זה כמו VS Code רק שיש בו..."
- למה Cursor היה חידוש ב-2023? מה לא היה לפני?
- כמה משתמשים יש? (מספרים ספציפיים)
- מי מאחוריו: Anysphere Inc. — מי המייסדים? כמה גייסו?

## Cursor vs. VS Code — ההבדלים:
- Cursor הוא fork של VS Code — מה זה אומר?
- Extensions VS Code עובדות ב-Cursor? (כן/לא)
- ממשק: מה זהה ומה שונה?
- Performance: Cursor כבד יותר?

## המודלים הזמינים:
- claude-3-7-sonnet (ברירת מחדל): למה? מה הוא עושה טוב?
- claude-opus-4-6: מתי להשתמש? כמה עולה?
- GPT-4o: מתי עדיף על Claude?
- Gemini 2.0 Flash: מה הייחוד?
- cursor-small: מה זה? מתי כדאי?
- o3/o4-mini: reasoning models ב-Cursor

## MAX Mode:
- מה זה MAX Mode?
- כמה עולה יותר?
- מתי שווה? (דוגמאות use-cases)

## Chat, Composer, Inline Edit — ההבדלים:
- Chat (ctrl+L): לשאלות ולבנייה
- Composer (ctrl+I): לedit מרובה קבצים
- Inline Edit (ctrl+K): מהיר, ישיר בתוך הקוד
- Terminal Chat: עזרה עם פקודות
- Agent Mode: מה זה ואיך שונה?

כתוב לפחות 1500 מילים עם דוגמאות אמיתיות.`
      },
      { num: 2, title: "פרק 2: @ References, Rules ו-Context Management", prompt: `כתוב פרק עמוק על מערכת ה-@ references, .cursor/rules ו-Context Management ב-Cursor.

## @ References — ה"שפה" של Cursor:
- @file: "תסתכל על הקובץ הזה" — כמה קבצים ניתן?
- @folder: "תסתכל על כל התיקייה"
- @codebase: "תסתכל על כל הפרויקט" (embeddings!)
- @web: "חפש ברשת" — מה מקורות?
- @docs: "תסתכל בdocumentation" — אילו docs?
- @git: "תסתכל על השינויים ב-git"
- @terminal: "תסתכל על הoutput של הterminal"
- @cursor rules: "הcustom rules שלי"

## .cursor/rules (מחליף את .cursorrules):
- מה ההבדל מ-CLAUDE.md?
- מבנה הקובץ
- Global rules vs. project-specific
- Language-specific rules
- framework-specific rules (React, FastAPI, וכדומה)
- Rules שמפתחים ישראלים משתמשים בהם (עברית, RTL)
- דוגמת rules מלא לפרויקט ישראלי

## Codebase Indexing:
- מה זה indexing? (embeddings על כל הקוד)
- כמה זמן לקח? איך עובד?
- .cursorignore: מה להוציא
- Reindex: מתי צריך?
- privacy: מה נשלח לשרתים של Cursor?

## Context Window Management:
- כמה tokens יש לכל מודל ב-Cursor?
- מה קורה כשהcontext מתמלא?
- Smart Context (Auto): איך Cursor בוחר?
- manual context: @file עדיף על @codebase מתי?

כתוב לפחות 1500 מילים עם דוגמאות rules אמיתיות.` },
      { num: 3, title: "פרק 3: Agent Mode, YOLO ו-Background Agents", prompt: `כתוב פרק עמוק על Agent Mode ב-Cursor, YOLO mode, ו-Background Agents.

## Agent Mode — הלב של Cursor:
- מה זה Agent Mode? (Cursor עובד לבד, לא רק עונה)
- autonomous task execution — הסבר צעד אחרי צעד
- כמה actions בסיבוב אחד?
- מה האורך המקסימלי של task?

## Terminal Integration:
- Cursor מריץ פקודות terminal לבד
- npm install, git, pytest, docker — הכל
- מה קורה כשcommand נכשל? retry logic?
- error recovery: איך Cursor מתמודד עם שגיאות

## YOLO Mode:
- מה זה YOLO? ("You Only Look Once" — ריצה ללא אישור)
- הסיכונים: מה עלול לקרות?
- מתי להשתמש? (dev environment בלבד!)
- איך להגדיר
- הגבלות: מה אפילו YOLO לא עושה?

## Background Agents (Beta 2026):
- מה זה Background Agents?
- איך עובד: Cursor ב-cloud רץ בלי שפתוח
- use cases: overnight refactoring, long tasks
- pricing: כמה עולה?
- מצב נוכחי: stable? beta?

## Multi-file Editing:
- Composer ל-multi-file
- כמה קבצים יכול לשנות בו זמנית?
- Checkpoint / Undo: איך לחזור אחורה?
- diff review: review לפני apply

כתוב לפחות 1500 מילים.` },
      { num: 4, title: "פרק 4: תמחור ו-ROI אמיתי", prompt: `כתוב ניתוח כלכלי מלא של Cursor — כמה עולה, מה מקבלים, ומה ה-ROI האמיתי.

## תכניות Cursor (2026):
- Free: כמה Fast requests? כמה Slow requests? מה זה?
- Pro ($20/mo): unlimited? מה המגבלות האמיתיות?
- Business ($40/user/mo): מה מוסיף?
- Enterprise: מה הייחוד?
- Usage-based: מה ה"overage" pricing?

## Fast vs. Slow Requests:
- מה ההבדל? latency? quality?
- כמה Fast requests יש ב-Pro?
- מה קורה כשנגמרים? עוברים לSlow?
- מה עדיף למה: Fast לcode completion, Slow לAgent?

## Token Pricing בפרטים:
- Cursor משתמש ב-API של Anthropic/OpenAI
- claude-sonnet: מחיר ל-Cursor vs. ישירות ל-API
- האם יש markup? כמה?
- BYOK (Bring Your Own Key): האם Cursor תומך?
- Cursor Business with BYOK — מה המשמעות?

## ROI אמיתי — מה מפתחים מדווחים:
- סקרים: כמה שעות מחסכים ביום?
- GitHub Copilot survey: 55% faster coding — ב-Cursor?
- Junior vs. Senior: מי מרוויח יותר?
- use cases עם ROI הכי גבוה
- use cases עם ROI נמוך (מה לא כדאי ל-AI)

## Cursor vs. Claude Code API: עלות השוואה:
- task טיפוסי: כמה עולה ב-Cursor vs. Claude Code direct?
- מה עדיף לאיזה developer?
- Total Cost of Ownership: subscription + API overages

כתוב לפחות 1500 מילים עם טבלאות השוואה.` },
      { num: 5, title: "פרק 5: Cursor בישראל ו-RTL Support", prompt: `כתוב על שימוש ב-Cursor IDE בישראל, תמיכת עברית, ומה הקהילה הישראלית אומרת.

## הקהילה הישראלית ו-Cursor:
- יוטיוברים ישראלים שמדגימים Cursor (ציין ערוצים ספציפיים)
- פודקאסטים ישראלים על Cursor (Reversim? The Developers? Geektime Podcast?)
- Twitter/X ישראלי: hashtags, חשבונות פופולריים על AI coding
- לינקדאין ישראלי: posts ויראליים על Cursor
- קהילות Facebook ישראליות לדברלופרים: מה הדיונים?
- בוטקמפים ישראלים שמלמדים Cursor (ITC? Elevation? John Bryce?)

## עברית ב-Cursor:
- Chat בעברית: איך מגיב?
- Rules בעברית: עובד?
- comments בקוד בעברית: מה Cursor עושה?
- RTL components: React with direction rtl — כמה טוב Cursor מבין?
- שמות משתנים בעברית: מה קורה?

## פרויקטים ישראליים עם Cursor:
- פיתוח אפליקציות עם עברית (וואטסאפ, sms, אתרים)
- E-commerce ישראלי: Shopify + Hebrew
- govtech ישראלי: מה המגבלות?
- fintech ישראלי: אבטחה ו-Cursor

## Privacy ב-Cursor לחברות ישראליות:
- Privacy Mode ב-Cursor: מה מוציאים?
- SOC 2 Type II compliance
- GDPR — האם מספיק לישראל?
- Enterprise data isolation
- חוזה DPA עם Cursor לחברות ישראליות

כתוב לפחות 1500 מילים.` },
      { num: 6, title: "פרק 6: המלצות סופיות ו-Tips מנוסים", prompt: `כתוב את הפרק הסופי על Cursor: המלצות, טיפים, ו-rules שעובדים.

## .cursor/rules templates לישראלים:
כתוב rules מלאים ואמיתיים:

Template לReact + TypeScript + עברית:
(כתוב rules file שלם ומפורט)

Template לPython + FastAPI:
(כתוב rules file שלם)

Template לNext.js fullstack:
(כתוב rules file שלם)

## Prompts שעובדים ב-Cursor:
- "תסתכל על @codebase ותגיד לי מה הbug הכי סביר שגורם ל-X"
- "צור component ל-Y עם shadcn/ui, TypeScript strict, RTL support"
- "refactor את @file לפי patterns של clean architecture"
- "כתוב tests ל-@file עם 100% coverage על כל edge cases"
- "תסתכל על @git diff ותסביר מה השתנה ב-plain language"

## טעויות נפוצות ב-Cursor:
- לא להשתמש ב-@codebase כשצריך רק קובץ אחד (בזבוז tokens)
- לתת context קצר מדי ולקבל פתרון שגוי
- לא לעשות review של diff לפני apply
- YOLO בפרויקט production — סיכון אמיתי
- לשכוח לעדכן rules כשהפרויקט גדל

## Cursor Shortcuts שמשנים חיים:
- ctrl+L: פתיחת Chat
- ctrl+I: פתיחת Composer
- ctrl+K: Inline Edit
- ctrl+shift+L: הוספת selection לchat
- Tab: קבלת completion
- Esc: דחיית completion
- ctrl+Z: undo של cursor changes

## השוואה סופית: Cursor vs. כל האחרים:
טבלה מלאה:
| Feature | Cursor | Windsurf | GitHub Copilot | Claude Code |
מחיר, Models, Multi-file, Agent, Terminal, Privacy

## ציוני סיכום:
ציון כולל: X/10
מה Cursor עושה הכי טוב:
מה עדיין חסר:
מי צריך לבחור Cursor:

כתוב לפחות 1500 מילים.` }
    ]
  },

  "gemma4-local": {
    filename: "gemma4-local.md",
    ecosystem: "Google",
    title: "Gemma 4 — מודל Google פתוח-קוד שרץ מקומית: מדריך מלא",
    context: "Gemma 4 הוא מודל שפה פתוח-קוד של Google DeepMind שרץ מקומית על המחשב ללא עלות API, מדגם 1B עד 27B פרמטרים, עם multimodal ו-context של 128K.",
    chapters: [
      {
        num: 1,
        title: "פרק 1: מה זה Gemma 4 ולמה זה מהפכה",
        prompt: `אתה מסביר לבן 13 חכם ולמפתח מתחיל מה זה Gemma 4 של Google ולמה זה חשוב.

## מה זה Gemma 4 בפשטות:
- הסבר כאנלוגיה: "Gemma 4 זה כמו שגוגל נותנת לך את המוח שלה בחינם שתשים אותו על המחשב שלך"
- פתוח-קוד vs. קנייני: מה ההבדל? למה חשוב שהקוד פתוח?
- ההבדל מ-Gemini API: שלם לגוגל מדי חודש vs. הורד ותריץ בחינם
- מתי יצא Gemma 4? מה השינוי הגדול מ-Gemma 3?

## היסטוריה: ממה זה הגיע?
- Gemma 1 (פברואר 2024): הגרסה הראשונה — מה היה בה?
- Gemma 2 (יוני 2024): מה השתפר?
- Gemma 3 (מרץ 2025): ה-multimodal הגיע
- Gemma 4 (2026): מה חדש לגמרי? מה שינה?
- PaliGemma, CodeGemma, ShieldGemma — מה הקשר?

## כל גדלי המודל — ובחירה נכונה:
- Gemma 4 1B: מה מסוגל? על איזה חומרה? מתאים לאיזה משימות?
- Gemma 4 4B: המתוק של הסדרה — למה?
- Gemma 4 12B: איזון טוב — מה צריך להריץ אותו?
- Gemma 4 27B: הגדול — GTX 1070 Ti 8GB — האם מסתדר?
- MoE (Mixture of Experts): מה זה ולמה זה חכם?
- Gemma 4 27B vs Gemma 4 27B-IT (instruction-tuned) — מה ההבדל?

## Benchmarks — מה הוא מסוגל:
- MMLU: כמה? לעומת GPT-4o ו-Claude Sonnet?
- HumanEval (קוד): כמה? מתאים לכתיבת קוד?
- MATH: ביצועי מתמטיקה
- Multimodal benchmarks: ראיית תמונות
- Context 128K: מה זה אומר בפועל?
- RTL/עברית: האם Gemma 4 יודע עברית? כמה טוב?

## רישיון ותנאי שימוש:
- Gemma License: מה מותר ומה אסור?
- שימוש מסחרי: כן/לא/תלוי?
- כמה משתמשים מותר?
- מה ההבדל מ-Llama License?

כתוב לפחות 1500 מילים בעברית עשירה עם דוגמאות ומספרים אמיתיים.`
      },
      {
        num: 2,
        title: "פרק 2: התקנה מלאה — Ollama, LM Studio ו-llama.cpp על Windows",
        prompt: `כתוב מדריך התקנה מלא ומפורט של Gemma 4 מקומית על Windows עם GTX 1070 Ti 8GB VRAM.

## שיטה 1: Ollama (הכי קלה — מומלצת למתחילים):
- מה זה Ollama? ("Docker של מודלי AI")
- הורדה והתקנה על Windows: קישור, שלבים מדויקים
- הרצת Gemma 4:
  \`\`\`
  ollama pull gemma4:4b
  ollama pull gemma4:12b
  ollama run gemma4:4b
  \`\`\`
- כל הפקודות: list, pull, rm, show, serve
- הגדרת OLLAMA_HOST לאפשר גישה מרשת
- Ollama REST API: endpoint, format הבקשה
- הגדרת OLLAMA_MODELS לנתיב מותאם
- כמה זיכרון VRAM כל גודל צורך?

## שיטה 2: LM Studio (ממשק גרפי נוח):
- מה LM Studio? ממשק GUI לניהול מודלים
- הורדה, התקנה, HuggingFace integration
- חיפוש "Gemma 4" ב-LM Studio
- הגדרות: layers on GPU, context window, threads
- הפעלת Local Server: פורט 1234, endpoints
- OpenAI-compatible API — מה זה אומר לנו?

## שיטה 3: llama.cpp ו-GGUF (המתקדמים):
- מה זה GGUF? (פורמט דחיסה ל-inference מהיר)
- Q4_K_M vs Q5_K_M vs Q8_0 — מה ההבדל בדיוק ובמהירות?
- הורדה מ-HuggingFace: \`huggingface-cli download\`
- build או download של llama.cpp על Windows
- הרצה: כל הפרמטרים החשובים (--n-gpu-layers, --ctx-size, --threads)

## שיטה 4: transformers של HuggingFace (Python):
\`\`\`python
from transformers import AutoTokenizer, AutoModelForCausalLM
import torch

tokenizer = AutoTokenizer.from_pretrained("google/gemma-4-4b-it")
model = AutoModelForCausalLM.from_pretrained(
    "google/gemma-4-4b-it",
    device_map="cuda",
    torch_dtype=torch.float16
)
\`\`\`
- load_in_4bit / load_in_8bit — quantization על הfly
- מה צריך: torch, transformers, accelerate, bitsandbytes

## מה יעבוד על GTX 1070 Ti 8GB VRAM:
- טבלה: גודל מודל → VRAM נדרש → CPU offload?
- Gemma 4 1B: בוודאות — כמה מהיר?
- Gemma 4 4B: עם Q4 — בהחלט
- Gemma 4 12B: חצי CPU, חצי GPU — אפשרי?
- Gemma 4 27B: CPU בלבד — כמה איטי?

כתוב לפחות 1500 מילים עם כל הפקודות המדויקות.`
      },
      {
        num: 3,
        title: "פרק 3: Gemma 4 ב-Python — API מקומי לפרויקט Next.js + FastAPI",
        prompt: `כתוב מדריך מפורט על שילוב Gemma 4 מקומי ב-Python/FastAPI ובפרויקט Next.js.

## ה-Ollama REST API — כל מה שצריך:
\`\`\`
POST http://localhost:11434/api/generate
POST http://localhost:11434/api/chat
GET  http://localhost:11434/api/tags
\`\`\`
- מבנה הבקשה המלא: model, prompt, stream, options
- מבנה התגובה: response, context, eval_count
- Streaming responses: איך לקבל token אחרי token?
- options חשובים: temperature, top_p, top_k, num_ctx, num_predict

## Provider ב-FastAPI — קוד מלא ומוכן:
\`\`\`python
# backend/providers/gemma_provider.py
import httpx
from typing import AsyncGenerator

class GemmaProvider:
    def __init__(self, model="gemma4:4b", base_url="http://localhost:11434"):
        self.model = model
        self.base_url = base_url

    async def chat(self, messages: list[dict], stream=False) -> str:
        ...

    async def stream_chat(self, messages: list[dict]) -> AsyncGenerator:
        ...

    async def is_available(self) -> bool:
        ...
\`\`\`
כתוב את הקוד המלא עם error handling, timeout, retry logic.

## אינטגרציה עם הOrchestrator הקיים:
- כיצד להוסיף GemmaProvider לרשימת הProviders
- בחירה אוטומטית: אם Ollama זמין → השתמש ב-Gemma, אחרת → Gemini API
- fallback logic: Gemma מקומי → Gemini API → error
- הוספה ל-frontend: dropdown לבחירת מודל

## Next.js Frontend — שליחת בקשות ל-Gemma:
\`\`\`typescript
// שינוי ב-route.ts — הוספת Gemma/Ollama option
async function callOllama(messages, systemPrompt): Promise<string> {
  const res = await fetch("http://localhost:11434/api/chat", {
    method: "POST",
    body: JSON.stringify({
      model: "gemma4:4b",
      messages: [
        { role: "system", content: systemPrompt },
        ...messages
      ],
      stream: false
    })
  });
  ...
}
\`\`\`

## השוואת מהירות וביצועים מעשית:
- Tokens per second: Gemma 4 4B על GTX 1070 Ti — כמה?
- Gemma 4 12B עם CPU offload — כמה איטי?
- Latency: כמה זמן לתגובה ראשונה?
- Memory usage: RAM + VRAM בפועל
- השוואה: Gemini API (500ms) vs Gemma מקומי (X שניות)

## עלות-תועלת אמיתית:
- עלות Gemini API: $0.075 לכל מיליון tokens input
- עלות Gemma 4 מקומי: $0 (חשמל בלבד — כ-$0.001 לשיחה)
- בכמה שיחות יחזיר את ההשקעה?
- מה הגבולות: לא יכול להחליף Gemini בכל מקרה — מתי לא?

כתוב לפחות 1500 מילים עם קוד עובד מלא.`
      },
      {
        num: 4,
        title: "פרק 4: Multimodal — תמונות, מסמכים וקוד עם Gemma 4",
        prompt: `כתוב פרק עמוק על יכולות multimodal של Gemma 4 — תמונות, ראיית קוד, ועיבוד מסמכים.

## Gemma 4 Multimodal — מה הוא רואה:
- האם Gemma 4 יכול לראות תמונות? מאיזה גודל?
- PaliGemma 2 vs Gemma 4 Vision — מה ההבדל?
- image formats מתמך: JPEG, PNG, WebP, GIF?
- resolution מקסימלית: כמה pixels?
- כמה תמונות ב-context אחד?

## Vision API ב-Ollama:
\`\`\`python
import base64

def encode_image(image_path):
    with open(image_path, "rb") as f:
        return base64.b64encode(f.read()).decode()

response = requests.post("http://localhost:11434/api/generate", json={
    "model": "gemma4:4b",
    "prompt": "מה יש בתמונה הזו?",
    "images": [encode_image("screenshot.png")]
})
\`\`\`
כתוב דוגמאות מלאות לניתוח screenshots, קוד מתמונות, UI analysis.

## שימוש בצ'אט שלנו — העלאת תמונה ל-Gemma:
- שינוי ב-route.ts לתמיכה ב-images עם Ollama
- base64 data URL → Ollama images format
- error handling כשהמודל לא תומך בvisual

## Context Window 128K — שימוש אמיתי:
- 128K tokens = כמה דפים של טקסט?
- שליחת קובץ Python שלם: אפשרי?
- שליחת codebase קטן: איך לעשות?
- Document QA: שאל שאלות על PDF ארוך
- Conversation memory: כמה הודעות נזכר?

## Code Generation — כמה טוב Gemma 4 בקוד:
- Python: כמה טוב? דוגמאות אמיתיות
- TypeScript/React: מסוגל?
- SQL: joins, subqueries — מה הביצועים?
- HumanEval benchmark: כמה? לעומת GPT-4o?
- debugging: זיהוי bugs בקוד מורכב
- test generation: כתיבת tests אוטומטית

## Fine-tuning ו-LoRA (מתקדמים):
- מה זה fine-tuning? "הכשרה מחדש" בפשטות
- LoRA: fine-tuning זול וקצר
- כמה זמן ל-fine-tune Gemma 4 4B?
- datasets ישראליים: יש? איפה?
- כלים: unsloth, axolotl, trl

כתוב לפחות 1500 מילים עם קוד אמיתי ועובד.`
      },
      {
        num: 5,
        title: "פרק 5: Gemma 4 vs. ChatGPT, Claude, Llama 4 — השוואה מלאה",
        prompt: `כתוב השוואה מלאה ועמוקה של Gemma 4 מול כל המתחרים, ובפרט לשימוש בפרויקט ישראלי מקומי.

## Gemma 4 vs. Llama 4 של Meta (המתחרה הכי ישיר):
- שניהם פתוח-קוד — מה ההבדל?
- גדלי מודל: Llama 4 Scout (17B MoE) vs Gemma 4 12B
- ביצועים: benchmarks head-to-head
- VRAM: מה דורש פחות?
- context window: מי גדול יותר?
- רישיון: Llama vs Gemma — מה ההבדל המעשי?
- עברית: מי מבין יותר?
- קוד: מי כותב טוב יותר?

## Gemma 4 vs. Mistral (Small ו-Medium):
- Mistral 7B vs Gemma 4 4B — מי מנצח?
- Mistral מאירופה: יתרון פרטיות/GDPR?
- ביצועי קוד: Mistral Codestral vs Gemma?
- context: שניהם 128K?

## Gemma 4 vs. Phi-4 של Microsoft:
- Phi-4 14B vs Gemma 4 12B: הgolden range
- Phi-4 מצטיין במתמטיקה — vs Gemma?
- VRAM requirements השוואה
- Windows integration: Phi-4 ב-Windows AI Studio vs Gemma ב-Ollama

## Gemma 4 מקומי vs. Gemini 2.5 Flash API:
- ביצועים: Gemini 2.5 Flash מנצח בכמה %?
- עלות: $0 vs. $0.075/M tokens
- פרטיות: הכל מקומי vs. נשלח לגוגל
- מהירות: API (500ms) vs מקומי (2-5s)
- אמינות: לא תלוי באינטרנט
- מתי הגיוני להחליף? מתי לא?

## Gemma 4 vs. Claude Haiku API (הכי זול של Anthropic):
- claude-haiku-4-5 מחיר: $0.25/M tokens
- Gemma 4 4B: $0 (חשמל)
- ביצועים: Haiku מנצח? בכמה?
- מתי Haiku שווה את הכסף?

## טבלת השוואה גדולה:
| Feature | Gemma 4 4B | Gemma 4 12B | Llama 4 Scout | Mistral 7B | Phi-4 14B | Gemini Flash |
|---------|------------|-------------|----------------|------------|-----------|-------------|
| VRAM | | | | | | N/A |
| עברית | | | | | | |
| קוד | | | | | | |
| מהירות | | | | | | |
| עלות | חינם | חינם | חינם | חינם | חינם | $ |

כתוב לפחות 1500 מילים עם מספרים אמיתיים.`
      },
      {
        num: 6,
        title: "פרק 6: אינטגרציה מלאה ב-The Master AI Architect — קוד ופרומפטים",
        prompt: `כתוב מדריך מעשי מלא לשילוב Gemma 4 ב-The Master AI Architect — פרויקט Next.js 15 + FastAPI על Windows GTX 1070 Ti.

## תוכנית אינטגרציה שלב אחר שלב:

### שלב 1: הפעלת Ollama עם Gemma 4:
\`\`\`bash
# Windows PowerShell
ollama pull gemma4:4b          # הורד 4B (מהיר, 2.5GB)
ollama pull gemma4:12b         # הורד 12B (טוב יותר, 7.5GB)
ollama serve                   # הפעל שרת (פורט 11434)
\`\`\`

### שלב 2: backend/providers/ollama_provider.py — קוד מלא:
כתוב provider מלא עם:
- health check (is_available)
- chat (sync)
- stream_chat (async generator)
- encode_images (multimodal)
- proper error handling ו-timeouts

### שלב 3: backend/orchestrator.py — הוספת Gemma:
- איך להוסיף GemmaProvider לרשימה
- logic: בדוק Ollama available → השתמש, אחרת → fallback
- env variable: PREFER_LOCAL_MODEL=true

### שלב 4: frontend/.env.local שינויים:
\`\`\`
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=gemma4:4b
NEXT_PUBLIC_HAS_LOCAL_MODEL=true
\`\`\`

### שלב 5: frontend/src/app/api/chat/ai/route.ts שינויים:
\`\`\`typescript
async function callOllama(messages, systemPrompt): Promise<string> {
  // קוד מלא
}

// בtry chain:
if (process.env.OLLAMA_BASE_URL) {
  try { response = await callOllama(...); model = "gemma4:4b (local)"; }
  catch(e) { /* fallback */ }
}
\`\`\`

### שלב 6: UI — badge "🏠 Local" לעומת "☁️ API":
- הצג למשתמש האם תשובה מגיעה ממודל מקומי או API
- עלות: "חינם" vs "$0.001"

## פרומפטים לClaude Code לביצוע האינטגרציה:
כתוב 3 פרומפטים מוכנים לשליחה ל-Claude Code (copy-paste ready):

**פרומפט 1**: התקנת Ollama ו-Gemma 4 + test
**פרומפט 2**: יצירת OllamaProvider ב-FastAPI
**פרומפט 3**: חיבור ה-frontend לOllama כחלופה לGemini

## ציונים וסיכום סופי:
- Gemma 4 4B על GTX 1070 Ti: ציון X/10 לפרויקט שלנו
- Gemma 4 12B על GTX 1070 Ti: ציון X/10
- כדאיות אינטגרציה: כן/לא ולמה?
- המלצה: מה לעשות קודם, מה אחר כך

כתוב לפחות 1500 מילים. זה הפרק הכי מעשי — תן קוד עובד אמיתי.`
      }
    ]
  },

  "claude-cowork": {
    filename: "claude-cowork.md",
    ecosystem: "Anthropic",
    title: "Claude Cowork — סוכן הדסקטופ של Anthropic: מדריך מלא",
    context: "Claude Cowork הוא סוכן desktop של Anthropic שרואה את המסך ומבצע משימות משרדיות אוטונומיות.",
    chapters: [
      { num: 1, title: "פרק 1: מה זה Claude Cowork ואיך הוא עובד", prompt: `כתוב מדריך עמוק ופשוט על Claude Cowork של Anthropic לשנת 2026.

## מה זה Claude Cowork בפשטות:
- הסבר לבן 13: "Cowork זה כמו עוזר אישי שיושב ליד המחשב שלך ו..."
- מה ההבדל מ-ChatGPT? מ-Claude.ai? מ-Claude Code?
- מה אומרים "Computer Use" ו-"Desktop Agent"?
- מתי יצא? מה מצב ה-GA/Beta?
- אילו plans נדרשים: Pro, Max, Team, Enterprise?

## ה-Computer Use API — הטכנולוגיה מאחורי Cowork:
- איך Claude "רואה" את המסך? screenshots? pixel? semantic?
- tool: screenshot → מה Claude רואה?
- tool: click(x,y) → איך ה-coordinates עובדים?
- tool: type_text → מה ה-latency?
- tool: scroll → כמה pixels?
- כמה FPS? כמה latency per action?
- מה המודל שמריץ: claude-sonnet-4-6? claude-opus?
- Computer Use API v1 vs v2 — מה השתפר?

## Dispatch — ההרחבה לטלפון:
- מה זה Dispatch? (הושק 17 מרץ 2026)
- איך שולחים משימה מהטלפון?
- mobile app? web interface? WhatsApp integration?
- notification כשמשימה מסתיימת
- use case: "תשלח מייל ל-X בזמן שאני נוסע"

## Setup ו-Prerequisites:
- אילו OS נתמכים: macOS? Windows? Linux?
- דרישות hardware
- installation
- permissions שClaude Cowork צריך
- sandbox vs. full access

כתוב לפחות 1500 מילים.` },
      { num: 2, title: "פרק 2: אינטגרציות ו-Use Cases", prompt: `כתוב על כל האינטגרציות של Claude Cowork וה-use cases האמיתיים.

## אינטגרציות Office:
**Slack:**
- שליחת הודעות לcannel
- קריאת הודעות ומענה
- עדכון סטטוס
- יצירת reminders

**Gmail / Outlook:**
- כתיבת מיילים על בסיס brief
- מיון וסיכום inbox
- תגובה לפי template
- unsubscribe אוטומטי מspam

**Google Docs / Word:**
- כתיבת מסמכים מbriefs
- עריכה ופורמטינג
- הוספת תגובות
- שמירה ושליחה

**Google Sheets / Excel:**
- מילוי נתונים
- יצירת formulas
- גרפים ודוחות
- data cleaning

**GitHub:**
- פתיחת issues
- code review
- merge PRs
- עדכון documentation

**HubSpot / CRM:**
- עדכון lead status
- הוספת notes
- יצירת tasks לfollow-up
- דוחות pipeline

## Local Filesystem:
- גישה לקבצים מקומיים
- ארגון תיקיות
- שמירה ומחיקה
- מה Cowork לא יכול לגשת?

## Use Cases אמיתיים:
- "סכם את כל המיילים מהשבוע ושלח דוח ל-manager"
- "פתח issue ב-GitHub לכל bug ב-Jira"
- "עדכן את ה-CRM עם כל הpipeline מהפגישה"
- "צור presentation מה-brief הזה"

כתוב לפחות 1500 מילים עם דוגמאות שלב אחר שלב.` },
      { num: 3, title: "פרק 3: אבטחה, פרטיות ומגבלות", prompt: `כתוב על אבטחה ומגבלות של Claude Cowork.

## מה Cowork רואה ומה לא:
- screen recording: כל הzoom? רק window פעיל?
- password fields: האם מוסתרים?
- credentials: איך מוגנים?
- payment info: האם Cowork יכול לראות?
- data שנשלח ל-Anthropic: מה בדיוק?

## Data Privacy Policy:
- retention: כמה זמן Anthropic שומר screenshots?
- zero data retention option (Enterprise)
- SOC 2 Type II
- GDPR compliance
- ישראל: חוק הגנת הפרטיות תיקון 13

## Security Controls:
- audit logs: מה מתועד?
- admin controls ב-Enterprise
- whitelist/blacklist אפליקציות
- sandbox mode

## מגבלות ידועות:
- מה Cowork לא יכול לעשות?
- apps לא נתמכות
- latency issues
- שגיאות נפוצות ופתרונות
- מה קורה כשCowork נתקע?

## Comparison:
- vs. OpenAI Operator
- vs. Google Project Mariner
- vs. Microsoft Copilot Actions

כתוב לפחות 1500 מילים.` },
      { num: 4, title: "פרק 4: תמחור ו-ROI", prompt: `כתוב ניתוח כלכלי של Claude Cowork.

## מי יכול להשתמש:
- Claude Pro ($20/mo): כן? לא?
- Claude Max ($100/mo): כן
- Claude Team ($30/user/mo): כן
- Claude Enterprise: כן
- מה מקבלים בכל plan מבחינת Cowork?

## עלות per Task:
- Cowork כולל בplan? API נפרד?
- computer_use tokens: כמה עולה screenshot?
- task פשוט (שליחת מייל): עלות?
- task מורכב (עדכון CRM מפגישה): עלות?
- session של שעה: עלות כוללת?

## ROI חישוב:
- כמה זמן חוסך Cowork ל-knowledge worker?
- השוואה ל-VA (Virtual Assistant): עלות/שעה
- השוואה ל-automation tools (Zapier, n8n)
- breakeven point: מתי Cowork כדאי כלכלית?

## Enterprise Value:
- פרודוקטיביות: Microsoft דיווחה על 26%+ בCopilot — Cowork?
- ROI calculations לארגון 100 עובדים

כתוב לפחות 1200 מילים עם חישובים.` },
      { num: 5, title: "פרק 5: Cowork בישראל", prompt: `כתוב על Claude Cowork מנקודת מבט ישראלית.

## ישראלים ו-Cowork:
- מה אומרים מפתחים ואנשי tech ישראלים?
- LinkedIn ישראלי: posts על Cowork
- Twitter/X ישראלי: חוות דעת
- קהילות Slack/WhatsApp ישראליות לtech

## עברית ב-Cowork:
- Cowork יכול לקרוא עברית מהמסך?
- כתיבת מיילים בעברית
- Excel בעברית (RTL)
- Word בעברית
- פגישות Zoom בעברית: transcript?

## שירותים ישראליים:
- Monday.com: האם Cowork יכול לעבוד עם Monday?
- Priority (חשבשבת): ERP ישראלי — תמיכה?
- iCount: חשבוניות — Cowork?
- Tranzila/Cardcom: payments
- חיבור לממשלה ישראלית (gov.il): אפשרי?

## פרטיות וחוק ישראלי:
- תיקון 13 לחוק הגנת הפרטיות
- data sovereignty: data נשאר בישראל?
- פיקוח על שימוש בAI בעבודה (חוק?)

כתוב לפחות 1500 מילים.` },
      { num: 6, title: "פרק 6: מסקנות ו-Tips", prompt: `כתוב מסקנות והמלצות מעשיות על Claude Cowork.

## האם להשתמש? עבור מי?
- knowledge workers: כן/לא/מתי?
- developers: מה יותר מתאים? (Claude Code?)
- managers: use cases ספציפיים
- מי לא צריך Cowork?

## Prompts שעובדים ל-Cowork:
- "פתח Gmail, חפש מיילים מ-X מהשבוע האחרון, סכם ושמור ל-Docs"
- "עדכן ב-HubSpot: Deal עם Company X עבר לStage Proposal"
- "פתח את ה-PR ב-GitHub, קרא את הreviewer comments, תקן"
- "צור slide deck ב-Google Slides מה-outline הזה"

## Workflow Templates:
- Morning standup workflow
- Weekly report workflow
- CRM update workflow
- Email triage workflow

## טעויות נפוצות:
- לתת Cowork משימה ארוכה מדי ללא checkpoints
- לא להגדיר scope ברור
- permissions לא מוגדרים מראש

## עתיד Cowork:
- roadmap: מה Anthropic תכננה?
- integrations מתוכננות
- multi-modal improvements

ציונים:
כולל: X/10 | אבטחה: X/10 | עברית: X/10

כתוב לפחות 1200 מילים.` }
    ]
  }
};

// ─────────────────────────────────────────────────────────────────────────────

async function callPerplexity(prompt) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      model: "sonar-pro",
      messages: [
        {
          role: "system",
          content: `אתה חוקר AI בכיר ואדריכל מערכות ישראלי. אתה כותב בעברית עשירה, ברורה ומפורטת.

## מתודולוגיית Deep Research Framework:

### מיפוי מיקרו-פיצ'רים:
- LLMs: Context Window, Temperature, Top P, Logit Bias, Stop Sequences, Seed
- Coding tools: Tool Calling, Sandbox, MCP support, SWE-bench score
- כל פרמטר = ערך מדויק, לא "תמיכה חלקית"

### פרוטוקול "הנוסחה הסודית":
- חפש undocumented triggers: Nano Banana ב-Gemini, ultrathink ב-Claude, XML tags
- system prompt patterns שלא מופיעים בשיווק
- hidden API parameters (logprobs, best_of, cache_control)

### Stress Tests:
- ProofGrid: בעיות לוגיקה עם שלבי הסקה מרובים
- Perturbation: האם שינוי פורמט משנה נכונות?
- HeQ: מגדר עברי, בניין, דו-משמעות ללא ניקוד
- Load-Accuracy: דיוק עם context ארוך

### לוקליזציה ישראלית:
- תשלומים: Tranzila, BridgerPay, מס"ב MASAV
- רגולציה: חוק הגנת הפרטיות 5741-1981 + תיקון 13
- RTL Maturity: ציון 1-5
- Israeli Market Fit: ציון 1-10

### Subscription Analysis:
- RPM/TPM לכל tier
- האם data לאימון? Seed parameter? Zero retention?

## כללי כתיבה:
- מינימום 1500 מילים לכל תגובה — אל תקצר!
- הסבר כל מונח כמו לבן 13 חכם שיודע מחשבים
- מספרים מדויקים, גרסאות, תאריכים, מחירים
- מקורות: דוקומנטציה רשמית, GitHub, Hacker News, בלוגים ישראליים
- מונחים: עברית + (English)
- טבלאות, קוד אמיתי, prompts שניתן להעתיק`
        },
        { role: "user", content: prompt }
      ],
      temperature: 0.2,
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
    req.setTimeout(180000, () => { req.destroy(); reject(new Error("timeout")); });
    req.write(payload);
    req.end();
  });
}

async function researchTool(toolId) {
  const tool = TOOLS[toolId];
  if (!tool) {
    console.error(`\nכלי "${toolId}" לא נמצא. זמינים: ${Object.keys(TOOLS).join(", ")}`);
    process.exit(1);
  }

  console.log(`\n📚 מתחיל מחקר עמוק: ${tool.title}`);
  console.log(`📁 קובץ יעד: ${tool.filename}`);
  console.log(`🔬 ${tool.chapters.length} פרקים × ~8000 tokens = מחקר מלא\n`);

  let fullContent = `# ${tool.title}\n\n`;
  fullContent += `> **אקו-סיסטם:** ${tool.ecosystem} | **עומק:** 6 פרקים | **שפה:** עברית\n\n`;
  fullContent += `---\n\n`;

  let totalCost = 0;
  const allCitations = new Set();

  for (const chapter of tool.chapters) {
    console.log(`\n⏳ [פרק ${chapter.num}/6] ${chapter.title}`);
    const start = Date.now();

    try {
      const result = await callPerplexity(chapter.prompt);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      const wordCount = result.content.split(/\s+/).length;

      fullContent += `## ${chapter.title}\n\n`;
      fullContent += result.content;
      fullContent += "\n\n---\n\n";

      result.citations.forEach(c => allCitations.add(c));
      totalCost += parseFloat(result.cost);

      console.log(`   ✅ ${wordCount} מילים | ${result.citations.length} מקורות | $${result.cost} | ${elapsed}s`);

      // Delay between chapters
      if (chapter.num < tool.chapters.length) {
        process.stdout.write("   ⏸️  ממתין 4 שניות...");
        await new Promise(r => setTimeout(r, 4000));
        process.stdout.write(" המשך!\n");
      }
    } catch(err) {
      console.error(`   ❌ שגיאה בפרק ${chapter.num}:`, err.message);
      fullContent += `## ${chapter.title}\n\n*שגיאה בטעינת פרק זה*\n\n---\n\n`;
    }
  }

  // Footer
  fullContent += "## מקורות ולינקים\n\n";
  [...allCitations].forEach((c, i) => { fullContent += `${i+1}. ${c}\n`; });
  fullContent += `\n**עלות מחקר זה**: $${totalCost.toFixed(4)}\n`;
  fullContent += `**תאריך מחקר**: 2026-04-05\n`;
  fullContent += `**מודל מחקר**: sonar-pro (6 פרקים)\n`;
  fullContent += `**אקו-סיסטם**: ${tool.ecosystem}\n`;
  fullContent += `**מילים**: ~${Math.round(fullContent.split(/\s+/).length / 100) * 100}+\n`;

  // Save
  const filePath = path.join(WIKI_DIR, tool.filename);
  fs.writeFileSync(filePath, fullContent, "utf8");

  const totalWords = fullContent.split(/\s+/).length;
  console.log(`\n✅ נשמר: ${filePath}`);
  console.log(`📊 סה"כ: ~${totalWords} מילים | $${totalCost.toFixed(4)} | ${[...allCitations].length} מקורות`);
  console.log(`\n🎉 המחקר המלא מוכן!\n`);
}

// ─── Main ───
const toolId = process.argv[2];
if (!toolId) {
  console.log("\nשימוש: node run_deep_chapter.js [tool-id]");
  console.log("כלים זמינים:", Object.keys(TOOLS).join(", "));
  process.exit(1);
}

researchTool(toolId);
