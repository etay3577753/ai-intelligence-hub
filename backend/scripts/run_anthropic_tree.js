/**
 * Anthropic Research Tree Runner
 * Runs deep research for each Anthropic sub-product via Perplexity sonar-pro
 * Each report follows the 6-chapter methodology from the PDF
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
- התבסס על מקורות: דוקומנטציה רשמית, דליפות קוד, בלוגים טכניים אמינים (Anthropic Engineering Blog, Simon Willison, Hacker News, arXiv)`;

// Each research topic with its specific deep-dive prompt
const RESEARCH_TOPICS = [
  {
    id: "anthropic-company",
    filename: "anthropic-company.md",
    ecosystem: "Anthropic",
    title: "Anthropic — מחקר שורש מקיף: החברה, מוצריה, ואדריכלות המערכות",
    prompt: `בצע מחקר עמוק ומקיף על Anthropic כחברה ועל עץ כל המוצרים שלה לשנת 2026.

## נושאים לכיסוי מלא:

### עץ מוצרים מלא של Anthropic (Root → Branches → Features):
מפה כל מוצר ותת-מוצר:
- claude.ai (web interface) — כל הפיצ'רים
- Claude Code (CLI) — כל הפקודות והפיצ'רים
- Anthropic API — כל endpoints
- MCP Protocol (Model Context Protocol) — כל integrations
- Claude Agent SDK — ארכיטקטורה multi-agent
- Constitutional AI — המנגנון הפנימי
- Claude Models: Sonnet 4.6, Opus 4.6, Haiku 4.5 — הבדלים מדויקים
- Workspaces — ניהול ארגוני
- Artifacts — יצירת קוד/UI
- Projects — זיכרון ו-context ארוך

### היסטוריה ומודל עסקי:
- מייסדים (Dario Amodei, Daniela Amodei + 9 מייסדים מ-OpenAI)
- גיוסי הון: Amazon $4B, Google $300M, Spark Capital
- הכנסות 2025-2026 (הערכות)
- מודל תמחור Tiers: Free → Pro ($20/mo) → Team → Enterprise

### Constitutional AI — המנגנון הטכני המלא:
- RLHF vs. RLAIF — ההבדל הקריטי
- 17 עקרונות החוקה — מה כתוב בה
- Self-reflection loops — כמה סיבובים, latency overhead
- CAI v2 ב-Claude 4.x — שיפורים ספציפיים
- מדידת "laziness" ו"sycophancy" — benchmarks

### Safety & Alignment:
- RSP (Responsible Scaling Policy) — ASL-2 vs. ASL-3
- Model cards — מה נחשף ומה לא
- Red teaming — internal vs. external
- SOC 2 Type II, GDPR, HIPAA compliance

### תחרות:
- Anthropic vs. OpenAI vs. Google DeepMind — נתח שוק
- Claude vs. GPT-4o vs. Gemini Ultra — הבדלי ביצועים (MMLU, HumanEval, MATH)

עמוד על כל 6 פרקי התבנית בהרחבה מלאה.`
  },
  {
    id: "claude-ai-web",
    filename: "claude-ai-web.md",
    ecosystem: "Anthropic",
    title: "claude.ai — סקירת ממשק מלאה: כל כפתור, פיצ'ר ופרמטר",
    prompt: `בצע סקירת ממשק (UI Audit) מלאה ומקיפה של claude.ai — ממשק הרשת של Claude לשנת 2026.

## נושאים לכיסוי מלא:

### כל הפיצ'רים ב-claude.ai:
**עמוד הצ'אט הראשי:**
- Chat interface — כל אפשרויות הקלט (טקסט, תמונה, קובץ, קוד)
- Model selector — אילו מודלים זמינים ובאיזה tier?
- בחירת מודל: Sonnet 4.6 vs. Opus 4.6 vs. Haiku — מתי כל אחד מופיע?
- Streaming — מהירות, אנימציה, ביטול ditengah שיחה
- Copy, retry, edit message — כל אפשרויות עריכה
- Voice input/output — האם זמין? עד כמה?

**Projects (זיכרון ו-Context):**
- יצירת Project — הגבלות כמות, שיתוף
- Project Instructions — system prompt ל-Project
- Knowledge base upload — סוגי קבצים מותרים, גודל מקס
- Project memory — כמה זמן נשמר, כמה טוקנים
- Shared projects — Teams feature

**Artifacts:**
- מה זה Artifact? מתי נוצר אוטומטית?
- סוגי Artifacts: React code, HTML, SVG, Markdown, JavaScript
- Preview pane — האם עובד בזמן אמת?
- Export Artifact — אפשרויות שמירה
- Remix Artifact — עריכה איטרטיבית

**Style & Personalization:**
- Response style: Concise / Normal / Detailed
- Format preferences: Markdown on/off
- Language preference
- Custom instructions (ב-Settings)

**Settings מלאות:**
- Account → API Keys
- Appearance (dark/light/system)
- Privacy & Safety settings
- Usage stats — אפשרויות מעקב

### הגדרות מסתרות וטריקים:
- שינוי Temperature דרך ה-UI (האם אפשרי?)
- System prompt injection דרך Projects
- Artifacts כ-mini-apps
- /slash commands — אילו קיימים?
- keyboard shortcuts מלא

### Tiers ומה כל אחד מקבל:
- Free: הגבלות יומיות, מודלים זמינים
- Pro ($20/mo): הגבלות גבוהות יותר, Early access features
- Team ($25/user/mo): ניהול ארגוני, SSO, audit logs
- Enterprise: Custom pricing, private deployment

### ניתוח UX ו-RTL עברי:
- איך claude.ai מתנהג בעברית? (RTL, מגדר, ניסוח)
- בעיות ידועות עם עברית ב-claude.ai
- השוואת UX לחלופות (ChatGPT, Gemini)

עמוד על כל 6 פרקי התבנית בהרחבה מלאה כולל benchmark numbers.`
  },
  {
    id: "anthropic-api",
    filename: "anthropic-api.md",
    ecosystem: "Anthropic",
    title: "Anthropic API — מדריך טכני מלא: כל Endpoint, פרמטר ופיצ'ר",
    prompt: `בצע מחקר טכני עמוק ומקיף על Anthropic API לשנת 2026 — כולל כל endpoint, פרמטר, תכונה מתקדמת ומחיר.

## נושאים לכיסוי מלא:

### Messages API — כל הפרמטרים:
**Basic params:**
- model (claude-opus-4-6, claude-sonnet-4-6, claude-haiku-4-5-20251001)
- max_tokens — מגבלות לפי מודל
- messages[] — role: user/assistant/system
- system — system prompt, מגבלות, best practices

**Sampling params:**
- temperature (0-2) — השפעה מדויקת על logits
- top_p (0-1) — Nucleus Sampling מנגנון
- top_k (integer) — לא זמין ב-claude.ai, רק API
- stop_sequences — מגבלות כמות
- stream (boolean) — SSE events

**Advanced params:**
- metadata.user_id — tracking
- thinking (extended thinking params: budget_tokens, type)
- tool_choice — auto/any/tool
- tools[] — function calling schemas

### Extended Thinking (Adaptive Reasoning):
- budget_tokens — כמה thinking tokens לאפשר
- streaming thinking — איך מתנהג ב-stream
- בדיוק איך מחייב — thinking tokens = output tokens ($25/M)
- מתי להשתמש: effort levels low/medium/high/max
- context compaction — מה קורה כשחוצים 200K?

### Tool Use / Function Calling:
- הגדרת tool schema (JSON Schema)
- tool_result — איך להחזיר תוצאות
- parallel tool calls — האם Claude יכול לקרוא כמה כלים במקביל?
- computer_use tool — מה זה? גרסאות beta
- bash_tool, text_editor_tool — מה הם עושים?

### Streaming (SSE Events):
- כל event types: message_start, content_block_start, content_block_delta, message_delta, message_stop
- input_json_delta — streaming JSON for tool calls
- thinking_delta — streaming extended thinking
- error handling בזמן streaming

### Prompt Caching:
- cache_control: {"type": "ephemeral"} — איך להשתמש
- מה נשמר בcache? כמה זמן? (5 דקות default)
- עלות cache read: 10% מ-input price
- עלות cache write: 25% overhead
- מתי כדאי? (Context ארוך, system prompts קבועים)

### Batch API (Message Batches):
- 50% הנחה על כל הבקשות
- async processing — max 24 שעות
- batch size — עד כמה בקשות?
- polling vs. webhook לבדיקת status
- מתי לא להשתמש (latency sensitive)

### Embeddings API:
- האם Anthropic מציע embeddings? (לא ישירות — מה החלופות?)
- Vector DB integration patterns

### Rate Limits & Errors:
- RPM/TPM לפי tier ומודל
- Error codes: 400, 401, 403, 429, 529
- Retry strategy — exponential backoff
- overloaded_error — מה זה ומתי קורה?

### Authentication & Security:
- API Keys — יצירה, rotation, scoping
- Workspaces API — ניהול מרובה users
- IP allowlisting
- Audit logs (Enterprise)

### SDK ו-Libraries:
- anthropic Python SDK — דוגמאות קוד מלאות
- anthropic TypeScript/Node.js SDK
- LangChain integration
- LlamaIndex integration
- Vertex AI (Google Cloud) — Claude דרך GCP
- AWS Bedrock — Claude דרך Amazon

עמוד על כל 6 פרקי התבנית בהרחבה מלאה עם דוגמאות קוד.`
  },
  {
    id: "mcp-protocol",
    filename: "mcp-protocol.md",
    ecosystem: "Anthropic",
    title: "MCP — Model Context Protocol: מדריך מלא לפרוטוקול החיבור בין AI לכלים",
    prompt: `בצע מחקר עמוק ומקיף על MCP (Model Context Protocol) של Anthropic לשנת 2026 — כל מה שצריך לדעת כדי לבנות, להשתמש ולפתח MCP servers.

## נושאים לכיסוי מלא:

### מה זה MCP? — הסבר טכני מלא:
- הבעיה שMCP פותר: N×M integrations → N+M
- ארכיטקטורה: MCP Host (Claude Code), MCP Client, MCP Server
- Transport layers: stdio (local), SSE (remote), WebSocket
- JSON-RPC 2.0 — הפרוטוקול הבסיסי
- Lifecycle: initialize → list tools → call tool → cleanup

### MCP Server Types — כל הסוגים:
**Resources:**
- resource URIs — schemas
- resource templates — dynamic resources
- subscriptions — real-time updates

**Tools:**
- tool schema (JSON Schema מלא)
- tool annotations: readOnly, destructive, idempotent
- async tools — streaming results

**Prompts:**
- prompt templates
- argument interpolation
- embedded resources בprompts

**Sampling:**
- שרת יכול לבקש מהמודל לייצר טקסט
- use cases: agentic loops

### MCP Servers מובנים / רשמיים (2026):
- GitHub MCP — כל operations: repos, PRs, issues, commits, code search
- Slack MCP — קריאה/כתיבה, channels, DMs
- Filesystem MCP — read/write/list local files
- PostgreSQL MCP — SQL queries
- SQLite MCP
- Google Drive MCP
- Google Maps MCP
- Brave Search MCP
- Fetch MCP — HTTP requests
- Memory MCP — persistent knowledge graph
- Puppeteer MCP — browser automation
- Docker MCP
- AWS KB Retrieval MCP

### Zapier MCP — חיבור ל-8000+ אפליקציות:
- איך עובד Zapier MCP?
- התקנה ב-Claude Code
- 8000+ actions — דוגמאות: Gmail, Sheets, Slack, Notion, HubSpot
- Authentication — OAuth flow
- מגבלות ועלות

### בניית MCP Server מאפס:
**Python SDK:**
[Python example]
# דוגמת שרת מלאה
from mcp import Server, tool

server = Server("my-tool")

@server.tool()
def my_function(param: str) -> str:
    return f"result: {param}"
[end example]

**TypeScript SDK:**
- package: @modelcontextprotocol/sdk
- דוגמאות full implementation

### הגדרת MCP ב-Claude Code:
- claude_desktop_config.json — מיקום, פורמט
- .claude/settings.json — הגדרות per-project
- mcpServers section — כל שדות הקונפיגורציה
- env variables, args, transport type
- debugging MCP: --mcp-debug flag

### MCP Security:
- Tool approval flow — "אישור פעם אחת" vs. "תמיד"
- Prompt injection via MCP tools
- Sandboxing — מה Claude Code יכול/לא יכול לעשות
- trust levels per server

### MCP vs. Function Calling vs. Plugins:
- השוואה מלאה: OpenAI Plugins, GPT Function Calling, Gemini Extensions
- מתי MCP עדיף?

### Anthropic MCP Registry (2026):
- היכן מוצאים MCP servers?
- MCP marketplace — האם קיים?
- Community servers (awesome-mcp)

עמוד על כל 6 פרקי התבנית בהרחבה מלאה עם דוגמאות קוד YAML/JSON/Python.`
  },
  {
    id: "claude-code-full",
    filename: "claude-code.md",
    ecosystem: "Anthropic",
    title: "Claude Code — מחקר מקיף: CLI, CLAUDE.md, Hooks, MCP ואדריכלות Agent",
    prompt: `בצע מחקר עמוק ומקיף על Claude Code — כלי ה-CLI של Anthropic לשנת 2026.
חשוב: דליפת קוד המקור (מרץ 2026) היא פרק אחד בלבד — הדוח צריך לכסות את כל הכלי באופן מלא.

## נושאים לכיסוי מלא:

### התקנה ו-Setup מלא:
- npm install -g @anthropic-ai/claude-code (הדרך הרשמית)
- macOS, Windows (WSL/Native), Linux
- הגדרת ANTHROPIC_API_KEY
- claude --version — איך לבדוק גרסה
- claude upgrade — עדכון אוטומטי
- Proxy settings, corporate firewalls

### ממשק שורת פקודה — כל הפקודות:
**Interactive Mode:**
- claude (ללא args) — מצב שיחה
- claude "prompt" — one-shot
- claude -p "prompt" — print mode
- claude --continue — המשך שיחה אחרונה
- claude --resume [session-id]

**Slash Commands (בתוך הצ'אט):**
- /help — עזרה
- /clear — ניקוי שיחה
- /compact — דחיסת context
- /cost — הצגת עלות שיחה
- /model — החלפת מודל
- /memory — הצגת CLAUDE.md
- /tools — כל הכלים הזמינים
- /mcp — MCP server status
- /vim — vim mode
- /permissions — הרשאות

**כלי Flags מלאים:**
- --model (-m): claude-opus-4-6, claude-sonnet-4-6
- --max-tokens
- --temperature (האם זמין?)
- --output-format: text/json/stream-json
- --verbose
- --debug
- --no-stream
- --dangerously-skip-permissions
- --allowedTools / --disallowedTools
- --add-dir (הוספת תיקייה לcontext)

### CLAUDE.md — מדריך מלא:
**מהו CLAUDE.md?**
- System prompt אוטומטי לפרויקט
- מיקומים: ~/.claude/CLAUDE.md (global), ./CLAUDE.md (project), subdirectory CLAUDE.md
- סדר טעינה והיררכיה
- @import — כולל קבצים חיצוניים

**מה כדאי לכתוב ב-CLAUDE.md?**
- Project context: מה הפרויקט עושה
- Tech stack: שפות, frameworks, tools
- Coding conventions: naming, style
- Commands: כיצד לbuild, test, run
- Architecture notes: files חשובים
- Do's and Don'ts

**תבניות CLAUDE.md לפי שימוש:**
- Node.js project template
- Python FastAPI template
- Next.js template
- דוגמה מלאה עם כל הסעיפים

### Hooks System — כל ה-Events:
**מהם Hooks?**
- shell commands שמופעלים אוטומטית
- מיקום: .claude/settings.json
- types: PreToolUse, PostToolUse, Notification, Stop

**Pre-Tool Hooks:**
- בדיקה לפני כל פעולה
- block פעולות מסוכנות
- logging כל tool call

**Post-Tool Hooks:**
- trigger אחרי tool completion
- auto-format קוד אחרי כתיבה
- run tests אחרי שינוי קוד
- git commit אוטומטי

**Notification Hooks:**
- התראות Slack/Discord/Teams
- שליחת email

**Stop Hooks:**
- קריאה לבדיקה לפני סיום
- human-in-the-loop approval

**דוגמאות hook מלאות (JSON):**
[JSON example]
{
  "hooks": {
    "PostToolUse": [{
      "matcher": {"tool_name": "Write"},
      "hooks": [{"type": "command", "command": "npx prettier --write $FILE"}]
    }]
  }
}
[end example]

### Permissions System:
- Allow/Deny per tool type
- .claude/settings.json → permissions
- allowedTools, disallowedTools
- יetwork access control
- File system boundaries (--add-dir)
- Sandbox mode

### Agent Loop — מנגנון הפנימי (על בסיס דליפת הקוד):
**Agent Loop Architecture:**
- main loop: observe → think → act → repeat
- tool execution pipeline
- context window management
- Undercover Mode — מה זה ולמה?
- Retry logic — backoff strategy
- Error recovery patterns

**Multi-Agent Workflows:**
- Task tool — יצירת sub-agent
- spawning parallel agents
- orchestrator vs. subagent roles
- context sharing between agents
- coordination patterns

### MCP ב-Claude Code:
- התקנת MCP servers: claude mcp add [name] [command]
- הגדרה ב-claude_desktop_config.json
- debugging: --mcp-debug
- כל MCP servers המובנים

### Windows ו-WSL Setup:
- Windows Native (PowerShell) — מה עובד ומה לא
- WSL2 installation — step by step
- path conflicts between Windows/Linux
- Git credentials ב-WSL
- performance: native vs. WSL

### פרק מיוחד: דליפת קוד המקור (מרץ 2026):
- מה בדיוק דלף? (npm package ללא .npmignore)
- 512K שורות TypeScript
- מה נחשף: agent loop, tool schemas, Undercover Mode
- השפעה על האבטחה
- Anthropic's response

### Security ו-Best Practices:
- אל תריץ ב-production secrets
- --dangerously-skip-permissions — סיכונים
- Prompt injection via files
- gitignore sensitive Claude configs

עמוד על כל 6 פרקי התבנית. דליפת הקוד = פרק 1 מתוך 6, לא הכל.`
  },
  {
    id: "claude-cowork",
    filename: "claude-cowork.md",
    ecosystem: "Anthropic",
    title: "Claude Cowork — סוכן הדסקטופ של Anthropic: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Claude Cowork של Anthropic לשנת 2026 — סוכן הדסקטופ האוטונומי שרואה את המסך ומבצע משימות משרדיות.

## נושאים לכיסוי מלא:

### מהו Claude Cowork?
- הגדרה מדויקת: desktop agent שרואה את המסך (Computer Use API)
- ההבדל בין claude.ai, Claude Code ו-Cowork
- אילו Tiers יש גישה: Pro, Max, Team, Enterprise בלבד
- מצב פיתוח נוכחי: GA / Beta / Preview?
- מה קרה ל-Computer Use API ב-2025-2026 ואיך Cowork מבוסס עליו

### יכולות ליבה:
**ראייה ופעולה (Vision + Action):**
- screenshot analysis — כמה FPS, resolution, latency
- כלי DOM manipulation vs. pixel-based
- OCR capabilities
- עריכת קבצים (Word, Excel, PDF) — אילו formats
- navigation בין חלונות ואפליקציות

**אינטגרציות משרדיות:**
- Slack — שליחת הודעות, קריאת channels, עדכון סטטוס
- GitHub — פתיחת issues, code review, merge PRs
- HubSpot — עדכון CRM, pipeline management
- Email (Gmail / Outlook) — כתיבה, מיון, תגובה
- Google Drive / OneDrive — ניהול קבצים
- Jira / Linear — ניהול tasks
- Zoom / Teams — הצטרפות לפגישות, רישום פרוטוקול

**Local Filesystem:**
- גישה לקבצים מקומיים — permissions נדרשות
- כתיבה לדיסק — sandbox vs. unrestricted
- הרצת אפליקציות מקומיות

### טכנולוגיה פנימית:
- Computer Use API v2 (claude-3-7-sonnet vs. claude-opus) — איזה מודל מריץ את Cowork?
- tool_use schema לcomputer_use
- screenshot_tool + action_tool + coordinate_tool
- latency per action — benchmarks
- error recovery כשפעולה נכשלת
- cost per task — חישוב אמיתי

### אבטחה ופרטיות:
- מה Cowork "רואה" ומה לא
- Data retention policy
- Enterprise security controls
- SOC 2 / ISO 27001 compliance
- Audit logs

### שימושי ישראל:
- תמיכה בעברית בממשקים ישראליים
- RTL applications (Excel בעברית, Word בעברית)
- שילוב עם Monday.com (ישראלי)
- חיבור לאפליקציות פיננסיות ישראליות

### המתחרים:
- OpenAI Computer Use (Operator)
- Google Project Mariner
- Microsoft Copilot Actions
- Browser Use (open source)
- NemoClaw / OpenClaw (NVIDIA)

עמוד על כל 6 פרקי התבנית עם דוגמאות use-case מפורטות.`
  },
  {
    id: "claude-quark",
    filename: "claude-quark.md",
    ecosystem: "Anthropic",
    title: "Claude Quark — סוכן הדפדפן הפתוח של Anthropic: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Claude Quark של Anthropic לשנת 2026 — סוכן דפדפן פתוח המאפשר אוטומציה ברמת ה-DOM בשפה טבעית.

## נושאים לכיסוי מלא:

### מהו Claude Quark?
- הגדרה מדויקת: open browser agent (Reddit, GitHub, אתרים כלליים)
- מה פירוש "פתוח" — open source? גישה ללא תשלום?
- ההבדל מ-Cowork: browser-only vs. full desktop
- קישור למאגר GitHub הרשמי
- מצב פיתוח: production / experimental / community project?
- תלויות: Playwright? Puppeteer? Chrome Extension?

### יכולות טכניות:
**DOM Manipulation:**
- natural language → CSS selector → action
- click, fill, scroll, extract text
- iframe handling
- shadow DOM support
- dynamic content (React/Vue SPAs)

**Browser Actions:**
- navigation ו-history
- cookies ו-localStorage
- form filling ו-submission
- file upload/download
- screenshot capture

**Integrations:**
- Reddit — posting, voting, scraping
- GitHub — repo operations, PR review, issues
- LinkedIn, Twitter/X — interactions
- כל אתר כללי — how?

### Architecture:
- איך Quark "מדבר" עם הדפדפן?
- MCP + Browser integration pattern
- Claude model בתוך Quark — איזה model?
- pipeline: user request → planning → action → verify
- error handling ו-retry logic

### Installation ו-Setup:
- prerequisites
- installation steps
- configuration
- security permissions (dangerous capabilities!)
- sandboxing options

### Use Cases:
- web scraping אוטומטי
- form automation
- testing ו-QA automation
- social media management
- competitive intelligence gathering

### אבטחה וסיכונים:
- prompt injection via web content — הסיכון האמיתי
- מה Quark עלול לעשות בטעות
- sandboxing best practices
- enterprise restrictions

### השוואה לכלים קיימים:
- Browser Use (open source Python)
- Stagehand (Browserbase)
- Playwright MCP
- AgentQL
- WebVoyager

עמוד על כל 6 פרקי התבנית עם דוגמאות code ו-use-cases מפורטות.`
  },
  {
    id: "claude-in-chrome",
    filename: "claude-in-chrome.md",
    ecosystem: "Anthropic",
    title: "Claude in Chrome + Dispatch — הרחבת הדפדפן וסוכן הטלפון של Anthropic",
    prompt: `בצע מחקר עמוק ומקיף על Claude in Chrome ו-Dispatch של Anthropic לשנת 2026 — שני כלים שמרחיבים את Cowork לדפדפן ולמובייל.

## נושאים לכיסוי מלא:

### Claude in Chrome:
- מהי הרחבת Chrome של Anthropic?
- מה היא עושה: מחברת Claude לדפדפן לביצוע פעולות
- קישור ל-Chrome Web Store — מה מספר ההתקנות?
- תאריך השקה: מתי?
- קשר ל-Cowork: האם זה חלק ממנה או כלי נפרד?

**יכולות:**
- DOM interaction בשפה טבעית
- קריאת תוכן דפים
- מילוי טפסים אוטומטי
- navigation
- data extraction

**הגדרות ואבטחה:**
- אילו permissions מבקשת: tabs, storage, activeTab?
- מה Claude רואה ומה לא
- data privacy — מה נשלח לשרתי Anthropic?
- enterprise controls

### Dispatch:
- מה זה Dispatch? (הושק 17 מרץ 2026)
- האינטגרציה עם Cowork: שליחת הוראות מהטלפון
- mobile app או web interface?
- iOS / Android support
- כיצד עובד: phone → Cowork desktop → execution

**Use Cases:**
- שליחת משימה מהטלפון בזמן נסיעה
- תזמון Tasks ל-Cowork
- notifications על השלמת משימות

### שילוב בין כלים:
- Claude in Chrome + Cowork + Dispatch = workflow מלא
- integration patterns
- limitations של כל כלי

### השוואה:
- vs. Arc Browser AI
- vs. Perplexity browser extension
- vs. Sider AI

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "claude-agent-sdk",
    filename: "claude-agent-sdk.md",
    ecosystem: "Anthropic",
    title: "Claude Agent SDK — מדריך מלא לבניית Agents ו-Multi-Agent Workflows",
    prompt: `בצע מחקר עמוק ומקיף על Claude Agent SDK של Anthropic לשנת 2026 — כיצד לבנות agents, orchestrators ו-multi-agent systems.

## נושאים לכיסוי מלא:

### מהו Claude Agent SDK?
- ההבדל בין API רגיל ל-SDK לagents
- Agent loop — הסבר טכני מלא
- Tool orchestration
- State management

### Agent Patterns:
**Orchestrator Pattern:**
- orchestrator agent → subagents
- task decomposition
- result aggregation
- error handling בין agents

**Parallel Agents:**
- spawning multiple agents בו-זמנית
- synchronization barriers
- merge results

**Sequential Pipeline:**
- chain of agents
- context passing
- early termination

### Tool Use בContext Agent:
- computer_use — שליטה במחשב
- bash_tool — הרצת פקודות
- text_editor_tool — עריכת קבצים
- custom tools — הגדרה ושימוש

### Memory וState:
- In-context memory (conversation history)
- External memory (vector DB)
- Persistent state (files, DB)
- Memory compaction

### System Prompt Engineering לAgents:
- CLAUDE.md patterns לagents
- Role definition best practices
- Boundaries ו-guardrails
- Output format specification

### Production Considerations:
- Cost management ב-multi-agent
- Timeout handling
- Human-in-the-loop checkpoints
- Monitoring ו-observability

### דוגמאות מלאות:
- Research agent (Perplexity + Claude)
- Code review agent
- Customer support agent
- Data analysis pipeline

עמוד על כל 6 פרקי התבנית עם דוגמאות קוד Python ו-TypeScript מלאות.`
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
  const targetId = args[0]; // optional: run single topic

  const topics = targetId
    ? RESEARCH_TOPICS.filter(t => t.id === targetId)
    : RESEARCH_TOPICS;

  console.log(`\n🔬 מריץ ${topics.length} מחקרים על Anthropic Tree\n`);

  for (const topic of topics) {
    console.log(`\n⏳ [${topic.id}] מתחיל מחקר...`);
    const start = Date.now();
    try {
      const result = await callPerplexity(topic);
      const filePath = saveWiki(topic, result);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`✅ [${topic.id}] נשמר: ${filePath}`);
      console.log(`   📊 ${result.content.length} תווים | ${result.citations.length} מקורות | $${result.cost} | ${elapsed}s`);

      // Delay between calls to avoid rate limiting
      if (topics.indexOf(topic) < topics.length - 1) {
        console.log("   ⏸️  ממתין 3 שניות...");
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch(err) {
      console.error(`❌ [${topic.id}] שגיאה: ${err.message}`);
    }
  }

  console.log("\n✅ סיום כל המחקרים!\n");
}

main().catch(console.error);
