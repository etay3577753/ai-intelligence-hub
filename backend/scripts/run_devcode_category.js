/**
 * Dev/Code AI Tools Research Runner
 * Super-Category 1: ~50+ AI coding tools
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
- כל פרמטר זמין
- כפתורים, טוגלים, מצבים נסתרים
- UX ספציפי: streaming, latency, feedback

### פרק 3: ניתוח כלכלי ומגבלות (Economics & Quotas)
- טבלה: גרסה חינמית vs. תשלום
- חישוב עלות שיחה טיפוסית
- תמחור Enterprise vs. API

### פרק 4: מבחני מאמץ (5 Stress Tests)
1. Perturbation Test
2. Hebrew Morphology
3. ProofGrid
4. Phonemic Ambiguity
5. Load-Accuracy

### פרק 5: לוקליזציה לישראל (Israeli Localization)
- תאימות RTL
- חוק הגנת הפרטיות הישראלי
- התאמה תרבותית

### פרק 6: מסקנות והמלצות (Final Recommendations)
- האם להטמיע? מתי? לאיזה שימוש?
- השוואה לחלופות

## כללים קריטיים:
- מינימום 6000 מילים
- כל פרק: לפחות 3 תת-פרקים
- מונחים טכניים: עברית + (English)
- ציין תאריכים, גרסאות, מחירים מדויקים`;

const RESEARCH_TOPICS = [
  {
    id: "cursor-ide",
    filename: "cursor-ide.md",
    ecosystem: "Dev/Code",
    title: "Cursor IDE — עורך הקוד המבוסס AI המוביל: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Cursor IDE לשנת 2026 — עורך הקוד המוביל המבוסס AI שעקף את GitHub Copilot בפופולריות.

## נושאים לכיסוי מלא:

### מה זה Cursor?
- fork של VS Code + AI-first architecture
- צוות: Anysphere Inc., הגיוסים, מיקום
- מספר משתמשים: כמה developers?
- גרסה נוכחית: 0.x.x — changelog עיקרי

### מודלים זמינים:
- claude-3-7-sonnet (default), claude-opus, GPT-4o, Gemini
- cursor-small — מה זה? מתי כדאי?
- MAX mode — double tokens, double cost?
- model switching mid-conversation

### מצבי עבודה:
**Chat (ctrl+L):**
- @ references: @file, @folder, @codebase, @web, @docs, @git
- Apply to file
- multi-file context

**Composer (ctrl+I):**
- multi-file edits
- כיצד מחליט מה לשנות?

**Inline Edit (ctrl+K):**
- instant code generation
- diff view

**Agent Mode:**
- autonomous task execution
- terminal integration
- YOLO mode
- Background Agents (Beta)

### .cursor/rules (החלפה ל-.cursorrules):
- project-specific instructions
- global rules
- language-specific rules
- best practices

### Pricing:
- Free: כמה requests/month?
- Pro ($20/mo): Fast requests, Slow requests
- Business ($40/user/mo)
- Enterprise: custom
- מה ההבדל Fast vs. Slow?

### Performance Benchmarks:
- SWE-bench scores של הכלי
- code completion latency
- indexing speed
- vs. GitHub Copilot, Windsurf

### Integrations:
- Git / GitHub / GitLab
- Terminal
- Extensions מ-VS Code
- MCP support

### אבטחה:
- Privacy Mode — מה כולל?
- SOC 2 Type II
- Enterprise data isolation
- code not used for training (in privacy mode)

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "windsurf-ide",
    filename: "windsurf-ide.md",
    ecosystem: "Dev/Code",
    title: "Windsurf (Codeium) — IDE עם Cascade Flow: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Windsurf IDE (מבית Codeium) לשנת 2026 — המתחרה הישיר של Cursor עם Cascade agentic flow.

## נושאים לכיסוי מלא:

### מה זה Windsurf?
- Codeium → Windsurf: מה השינוי?
- צוות: Exafunction / Codeium, גיוסים
- מספר משתמשים
- גרסה נוכחית

### Cascade — המנוע הייחודי:
- מה מבדיל Cascade מ-Cursor Composer?
- Flows — רצף פעולות אוטומטי
- context awareness ברמת codebase
- "Forethought" — planning לפני execution
- כיצד מנהל token budget?

### מצבי עבודה:
- Chat mode
- Cascade (agentic)
- Inline autocomplete
- Terminal integration

### Supercomplete:
- מה זה? איך שונה מ-Copilot?
- multi-line completion
- context from whole repo

### Pricing:
- Free tier: כמה flows/day?
- Pro ($15/mo vs. Cursor $20/mo)
- Teams
- Enterprise

### Performance:
- SWE-bench vs. Cursor vs. Claude Code
- speed benchmarks
- code quality comparisons
- user satisfaction scores

### המוצר Codeium Extensions:
- VS Code extension
- JetBrains
- Vim/Neovim
- Emacs

### נקודות חוזק וחולשה:
- מה Windsurf עושה טוב יותר מ-Cursor?
- מה Cursor עושה טוב יותר?
- use case matrix

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "github-copilot",
    filename: "github-copilot.md",
    ecosystem: "Dev/Code",
    title: "GitHub Copilot — כלי ה-AI הרשמי של Microsoft/GitHub: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על GitHub Copilot לשנת 2026 — כלי ה-AI הרשמי של Microsoft/GitHub עם מיליוני משתמשים.

## נושאים לכיסוי מלא:

### GitHub Copilot — מפת המוצרים המלאה:
- Copilot Code Completion (IDE extension)
- Copilot Chat (VS Code, JetBrains, GitHub.com)
- Copilot CLI (terminal)
- Copilot Workspace (issue → PR)
- Copilot Enterprise (ארגוני)
- Copilot Extensions (ecosystem)
- Copilot in GitHub Mobile
- Copilot for Docs

### מודלים:
- GPT-4o (default)
- claude-3-7-sonnet (זמין דרך Copilot?)
- Gemini integration
- כיצד Microsoft/GitHub בוחרים מודל?

### GitHub Copilot Workspace:
- Issue → Branch → Code → PR אוטומטי
- כמה issues כבר נסגרו כך?
- success rate
- integration עם GitHub Actions

### Copilot Extensions:
- מה זה Extension ecosystem?
- extensions זמינים: Sentry, Datadog, MongoDB
- כיצד לבנות extension משלך?

### Pricing (2026):
- Free: 2000 completions/mo, 50 chat messages/mo
- Pro ($10/mo): unlimited
- Business ($19/user/mo)
- Enterprise ($39/user/mo)
- מה ההבדל Business vs. Enterprise?

### Enterprise Features:
- Custom model fine-tuning
- Private codebase indexing
- Security features
- Admin controls
- audit logs
- SAML SSO

### Benchmarks:
- code completion accuracy
- developer productivity gains (Microsoft studies)
- SWE-bench vs. Cursor vs. Windsurf
- latency

### Privacy:
- האם GitHub משתמש בקוד שלך לאימון?
- Enterprise data isolation
- IP indemnification
- license detection

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "lovable-dev",
    filename: "lovable-dev.md",
    ecosystem: "Dev/Code",
    title: "Lovable — בניית אפליקציות full-stack מ-prompt: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Lovable (lovable.dev) לשנת 2026 — פלטפורמה לבניית אפליקציות web full-stack מ-prompt טקסטואלי.

## נושאים לכיסוי מלא:

### מה זה Lovable?
- GPT-Engineer → Lovable: ההיסטוריה
- טכנולוגיית ליבה: React, Supabase, Tailwind
- מספר users, apps built
- השוואה ל-Bolt.new, Base44, V0

### יכולות:
- prompt → full React app
- database design (Supabase)
- authentication flows
- deployment (Vercel, Netlify)
- כמה שורות קוד יכול לייצר?
- multi-page apps

### Workflow:
1. תאר את האפליקציה
2. Lovable מייצרת קוד + preview
3. Chat לשינויים
4. Deploy

### Integrations:
- Supabase (database + auth)
- Stripe (payments)
- GitHub (export code)
- Custom APIs

### Pricing:
- Free tier
- Starter ($20/mo)
- Launch ($50/mo)
- Scale ($100/mo)
- מה מגבלות כל tier?

### Quality של הקוד:
- האם הקוד production-ready?
- test coverage
- security issues נפוצות
- scalability considerations

### Use Cases:
- MVPs מהירים
- internal tools
- landing pages
- SaaS prototypes
- דוגמאות אמיתיות שנבנו ב-Lovable

### Alternatives Comparison:
- vs. Bolt.new
- vs. Base44 (ישראלי!)
- vs. V0 (Vercel)
- vs. Replit Agent

עמוד על כל 6 פרקי התבנית עם דוגמאות prompts מפורטות.`
  },
  {
    id: "base44-israeli",
    filename: "base44-israeli.md",
    ecosystem: "Dev/Code",
    title: "Base44 — כלי ה-Vibe Coding הישראלי: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Base44 לשנת 2026 — כלי ה-vibe coding הישראלי שנרכש על ידי Wix.

## נושאים לכיסוי מלא:

### מה זה Base44?
- מייסדים: מי הם? רקע?
- רכישה על ידי Wix: מתי? כמה? תנאים?
- המוצר: prompt → full web app
- מיקוד ישראלי: RTL, עברית, שוק ישראלי

### טכנולוגיה:
- Stack: React? Vue? Next.js?
- backend: Node.js? Python?
- hosting: Wix servers?
- database integration
- מה מגיע out-of-the-box?

### יכולות ייחודיות vs. Lovable/Bolt:
- דגש על ישראלי: עברית מלאה, RTL
- integrations עם שירותים ישראליים
- תמיכה בשקלים, MASAV
- payment gateways ישראליים (Tranzila, Cardcom)

### שילוב עם Wix:
- איך Base44 משתלב בפלטפורמת Wix?
- Wix Studio + Base44
- migration paths
- Wix App Market

### Pricing (לאחר רכישה):
- מה השתנה לאחר הרכישה ע"י Wix?
- תמחור נוכחי
- Wix Premium plans

### ביצועי Developer Community:
- כמה apps נבנו?
- case studies ישראליים
- GitHub stars / community size

### עתיד המוצר:
- roadmap לאחר הרכישה
- integrations מתוכננות עם Wix
- AI features מתוכננות

עמוד על כל 6 פרקי התבנית עם דגש מיוחד על שוק ישראל.`
  },
  {
    id: "bolt-new",
    filename: "bolt-new.md",
    ecosystem: "Dev/Code",
    title: "Bolt.new — Full-Stack Dev בדפדפן מ-StackBlitz: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Bolt.new (מבית StackBlitz) לשנת 2026 — פלטפורמה לבניית full-stack apps ישירות בדפדפן.

## נושאים לכיסוי מלא:

### מה זה Bolt.new?
- StackBlitz → Bolt: ההיסטוריה
- WebContainers technology — הסבר מלא
- ה"מהפכה": Node.js בדפדפן ללא server
- מספר users, apps built
- כמה GitHub stars?

### WebContainers — הטכנולוגיה:
- WASM-based Node.js in browser
- npm packages ישירות בדפדפן
- filesystem virtualization
- terminal in browser
- latency vs. server-based

### יכולות:
- prompt → full-stack app (React + Node/Express)
- real-time preview
- deploy ישירות מהדפדפן
- multi-file editing
- npm install בזמן אמת

### מודלים:
- Claude Sonnet (default?)
- GPT-4o
- Gemini
- מה ההבדל בין המודלים בתוך Bolt?

### Pricing:
- Free tier: כמה tokens/day?
- Pro ($20/mo)
- Team
- Enterprise
- token pricing — מה יקר?

### Bolt vs. Lovable vs. Base44:
- מה ייחודי ב-Bolt: WebContainers
- כאב: token limits
- כאב: complex apps נשברים
- מה עדיף לאיזה use case?

### Community:
- bolt.new open source (offen.dev fork?)
- community templates
- showcase projects

### Production Readiness:
- האם ניתן לבנות production apps?
- scaling limitations
- when to graduate to "real" setup

עמוד על כל 6 פרקי התבנית עם דוגמאות prompts.`
  },
  {
    id: "devin-ai",
    filename: "devin-ai.md",
    ecosystem: "Dev/Code",
    title: "Devin AI — הסוכן המתכנת האוטונומי הראשון: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Devin AI (מבית Cognition AI) לשנת 2026 — הסוכן המתכנת האוטונומי הראשון שעבד בצוותים.

## נושאים לכיסוי מלא:

### מה זה Devin?
- Cognition AI: מייסדים, גיוסים ($175M), הערכה
- "העולם הראשון של AI software engineer"
- SWE-bench Verified score: כמה? (ל-2026)
- מה הוא יכול לעשות שאחרים לא?

### יכולות Devin:
**Autonomous Coding:**
- קבלת task → מחקר → כתיבת קוד → בדיקה → PR
- כמה שעות/ימים לבצע task?
- כמה tasks מצליח בלי התערבות אנושית?

**Environment:**
- sandbox מחשב מלא (browser, terminal, IDE)
- גישה לאינטרנט במהלך עבודה
- Git integration
- running tests

**Collaboration:**
- Slack integration — שיחה עם Devin
- GitHub integration
- Human oversight mode
- pause/resume/redirect

### מה Devin אינו יכול לעשות:
- failures המתועדים
- when humans must intervene
- complexity ceiling

### Pricing (2026):
- $500/month (ACU-based pricing)
- מה זה ACU? Autonomous Computing Unit
- עלות per task
- Enterprise pricing

### Real-World Results:
- companies using Devin
- productivity gains measured
- cost per task vs. junior developer
- where Devin saved money

### Benchmarks:
- SWE-bench Verified scores over time
- comparison to Claude Code, Cursor Agent
- internal Cognition benchmarks

### Devin 2.0 / Latest Updates:
- מה השתפר מ-2024?
- new capabilities 2025-2026
- roadmap

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "replit-agent",
    filename: "replit-agent.md",
    ecosystem: "Dev/Code",
    title: "Replit Agent — סביבת פיתוח ענן עם AI: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Replit Agent לשנת 2026 — פלטפורמת הפיתוח בענן עם AI agent מובנה.

## נושאים לכיסוי מלא:

### Replit + AI Evolution:
- Replit כ-IDE בענן: ההיסטוריה
- Replit AI → Replit Agent: מה השינוי?
- Ghostwriter → Agent mode
- שיתוף פעולה עם Anthropic (Claude?)

### Replit Agent — יכולות:
- describe app → full deployment
- automatic setup של stack
- debugging אוטומטי
- deployment ל-Replit hosting
- database setup

### Replit Core Features:
- Multiplayer coding
- 50+ languages
- Built-in database (ReplDB)
- Hosting (Replit Deployments)
- secrets management
- always-on Repls

### AI Features 2026:
- AI autocomplete
- AI chat ב-IDE
- AI debugging
- Generate from image (wireframe → code)

### Pricing:
- Free tier
- Core ($20/mo)
- Teams for Education
- Teams for Business ($35/user/mo)
- what's included in each

### Target Audience:
- students, beginners
- vs. Cursor (professional devs)
- education market
- hackathons

### Deployment:
- Replit Deployments
- Custom domains
- static, autoscale, reserved VM
- pricing of deployments

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "v0-vercel",
    filename: "v0-vercel.md",
    ecosystem: "Dev/Code",
    title: "V0 (Vercel) — UI Component Generator: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על V0 של Vercel לשנת 2026 — כלי לייצור React components ו-UI מ-prompts טקסטואליים.

## נושאים לכיסוי מלא:

### מה זה V0?
- Vercel → V0: הקשר
- פוקוס: UI generation (לא full-stack)
- shadcn/ui + Tailwind CSS as default
- Next.js integration
- כמה users? כמה components generated?

### יכולות:
- text prompt → React component
- image → component (wireframe to code)
- iteration via chat
- multi-component layouts
- dark mode support
- accessibility (a11y)
- responsive design

### Stack שמייצר:
- React (default)
- Next.js App Router
- shadcn/ui
- Tailwind CSS
- TypeScript
- framer-motion animations

### V0 2.0 Features (2025-2026):
- full-page generation
- project context
- multi-file apps
- database integration?

### Integration עם Vercel Ecosystem:
- Deploy directly to Vercel
- Next.js optimizations
- Edge Runtime
- Analytics integration

### Pricing:
- Free: כמה prompts/day?
- Premium ($20/mo)
- Enterprise
- API access?

### Quality Assessment:
- production-ready code?
- accessibility compliance
- performance of generated code
- common issues

### Competitors:
- vs. Lovable
- vs. Bolt.new
- vs. Locofy.ai
- vs. Anima (Figma → code)

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "aider-cline",
    filename: "aider-cline.md",
    ecosystem: "Dev/Code",
    title: "Aider + Cline — כלי ה-Coding בטרמינל ו-VS Code קוד-פתוח: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Aider ו-Cline לשנת 2026 — שני כלי coding AI קוד-פתוח המובילים, אחד לטרמינל ואחד ל-VS Code.

## נושאים לכיסוי מלא:

### Aider:
**מה זה Aider?**
- Paul Gauthier: מייסד, רקע
- terminal-first coding assistant
- GitHub stars: כמה?
- ArchitectMode, CodeMode, AskMode, HelpMode

**יכולות:**
- /add files → AI edits them
- git integration אוטומטי
- whole repo context
- shell commands
- linting integration

**Aider Leaderboard:**
- SWE-bench scores
- כמה מודלים נבדקו?
- Claude Opus vs. GPT-4o vs. Gemini ב-Aider
- אילו מודלים הכי עובדים עם Aider?

**Pricing:**
- קוד פתוח — חינם
- משלמים רק ל-API (Claude/OpenAI)
- עלות טיפוסית per coding session

### Cline (Claude Dev):
**מה זה Cline?**
- VS Code extension
- GitHub stars
- Roo-Cline fork — מה ההבדל?
- claude-dev → cline: rebranding?

**יכולות:**
- autonomous task execution ב-VS Code
- terminal access
- browser control (Playwright)
- file operations
- MCP integration
- "checkpoints" — undo support

**Cline Modes:**
- Code mode
- Architect mode
- Ask mode
- Auto-approve settings

**Model Support:**
- Claude (primary)
- OpenAI
- Gemini
- Ollama (local models!)
- custom API endpoint

### Aider vs. Cline vs. Cursor vs. Claude Code:
- feature matrix
- when to use each
- cost comparison
- developer preference

עמוד על כל 6 פרקי התבנית עם דוגמאות שימוש מפורטות.`
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

  console.log(`\n💻 מריץ ${topics.length} מחקרים — Dev/Code AI Tools\n`);

  for (const topic of topics) {
    console.log(`\n⏳ [${topic.id}] מתחיל מחקר...`);
    const start = Date.now();
    try {
      const result = await callPerplexity(topic);
      const filePath = saveWiki(topic, result);
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(`✅ [${topic.id}] נשמר: ${path.basename(filePath)}`);
      console.log(`   📊 ${result.content.length} תווים | ${result.citations.length} מקורות | $${result.cost} | ${elapsed}s`);

      if (topics.indexOf(topic) < topics.length - 1) {
        console.log("   ⏸️  ממתין 3 שניות...");
        await new Promise(r => setTimeout(r, 3000));
      }
    } catch(err) {
      console.error(`❌ [${topic.id}] שגיאה:`, err.message);
    }
  }

  console.log("\n🏁 סיום Dev/Code!\n");
}

main();
