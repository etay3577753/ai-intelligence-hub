/**
 * Writing/Content AI Tools Research Runner
 * Super-Category: ChatGPT, Perplexity, Jasper, Copy.ai, etc.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = "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";
const WIKI_DIR = path.join(__dirname, "..", "data", "wiki");

const SYSTEM_PROMPT = `אתה מחקרן בכיר ב"מרכז הידע לבינה מלאכותית". אתה כותב דוחות מחקר עמוקים בעברית.
## תבנית חובה — 6 פרקים: תקציר טכני | ממשק | כלכלה | מבחני מאמץ | ישראל | מסקנות
## כללים: מינימום 6000 מילים, מחירים מדויקים, עברית + (English)`;

const RESEARCH_TOPICS = [
  {
    id: "chatgpt-full",
    filename: "chatgpt-full.md",
    ecosystem: "Writing/Content",
    title: "ChatGPT — המנהיג הסחרירי של AI Assistants: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על ChatGPT של OpenAI לשנת 2026 — הכלי הנפוץ ביותר בעולם עם 400M+ users.

## נושאים לכיסוי מלא:

### ChatGPT 2026 — מה השתנה:
- GPT-4o (omni) — text, voice, vision
- o3 / o4-mini — reasoning models
- GPT-4.1 / GPT-5 — האם יצא?
- Canvas — collaborative writing
- Memory — persistent user context
- Custom Instructions
- Projects — organized conversations

### GPT-4o vs. o3 vs. o4-mini:
- מתי לבחור כל מודל?
- latency comparison
- cost comparison (API)
- reasoning capabilities

### ChatGPT Products:
- chatgpt.com — web interface
- ChatGPT Plus ($20/mo)
- ChatGPT Pro ($200/mo) — מה מיוחד?
- ChatGPT Team ($30/user/mo)
- ChatGPT Enterprise
- ChatGPT Edu (universities)

### Advanced Features:
- Code Interpreter / Data Analysis
- DALL-E 3 image generation
- Web browsing (Bing)
- File uploads (PDF, Excel, etc.)
- GPTs (custom chatbots)
- GPT Store — כמה GPTs?
- Voice Mode (Advanced Voice)

### Operator / Computer Use:
- OpenAI Operator — אוטומציה בדפדפן
- Tasks — scheduled reminders
- vs. Claude Cowork

### Pricing API (2026):
- gpt-4o: $2.50/1M input, $10/1M output
- o3: $10/1M input, $40/1M output
- o4-mini: $1.10/1M input, $4.40/1M output
- gpt-4.1: מחיר?

### Hebrew:
- עברית quality
- RTL interface
- Israeli users count

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "perplexity-ai",
    filename: "perplexity-ai.md",
    ecosystem: "Writing/Content",
    title: "Perplexity AI — מנוע החיפוש עם AI: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Perplexity AI לשנת 2026 — מנוע החיפוש המבוסס AI שמאיים על Google.

## נושאים לכיסוי מלא:

### מה זה Perplexity?
- "answer engine" vs. search engine
- מייסדים: Aravind Srinivas + שאר
- גיוסים: $500M+, הערכה $9B+
- כמה MAU? כמה queries/day?
- growth vs. Google

### מוצרים:
- Perplexity.ai web
- Mobile app (iOS/Android)
- Perplexity Pages (ארטיקלים)
- Perplexity Pro Search
- Perplexity API (sonar models)
- Enterprise Pro

### Search Modes:
- Quick Search (fast)
- Pro Search (deeper, more sources)
- Focus modes: Academic, YouTube, Reddit, News, Social

### Sonar API:
- sonar-pro: המחיר ($3/1M input, $15/1M output)
- sonar: cheaper version
- sonar-reasoning (chain-of-thought)
- return_citations: true
- search_recency_filter

### Perplexity Pages:
- article generation from query
- structured long-form content
- export options
- monetization for creators?

### Pricing:
- Free: limited Pro searches/day
- Pro ($20/mo): unlimited Pro searches
- Enterprise Pro
- API pricing

### vs. Google vs. ChatGPT with search:
- accuracy comparison
- hallucination rate
- citation quality
- use case matrix

### Hebrew:
- עברית search quality
- Hebrew sources indexed?
- RTL interface

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "google-gemini-full",
    filename: "google-gemini-full.md",
    ecosystem: "Writing/Content",
    title: "Google Gemini — חבילת ה-AI של Google: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Google Gemini לשנת 2026 — מוצרי ה-AI של Google: Gemini.google.com, Gemini API, ו-NotebookLM.

## נושאים לכיסוי מלא:

### Gemini Models Family:
- Gemini 2.0 Flash: מחיר, specs
- Gemini 2.0 Pro: מחיר, specs
- Gemini 2.5 Flash / Pro (הגרסה החדשה ביותר?)
- Gemini Ultra vs. Pro vs. Flash vs. Nano
- context window: 2M tokens?

### Gemini.google.com:
- Gems: custom AI assistants
- Gemini Advanced (Google One AI Premium)
- Gemini in Google Workspace
- Deep Research feature
- Canvas / Artifacts (כמו Claude)

### Google AI Studio:
- free API playground
- prompt engineering tools
- fine-tuning capabilities
- Grounding with Google Search

### Gemini API:
- pricing: Flash ($0.10-0.40/1M), Pro ($1.25-5/1M)
- long context pricing
- safety settings
- structured output (JSON mode)

### NotebookLM:
- document Q&A
- Audio Overview (podcast generation!)
- כמה documents? max size?
- Google Drive integration
- NotebookLM Plus pricing

### Gemini in Workspace:
- Gmail: draft, summarize
- Docs: writing assistance
- Sheets: formula generation, data analysis
- Slides: presentation creation
- Meet: real-time notes

### Google Search AI Overviews:
- SGE → AI Overviews → ?
- impact on web traffic
- publishers' complaints

### Hebrew/RTL:
- עברית quality
- Workspace Hebrew support
- Israel availability

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "jasper-copyai",
    filename: "jasper-copyai.md",
    ecosystem: "Writing/Content",
    title: "Jasper + Copy.ai — כלי כתיבת התוכן העסקי: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Jasper ו-Copy.ai לשנת 2026 — שתי הפלטפורמות המובילות לכתיבת תוכן שיווקי עם AI.

## נושאים לכיסוי מלא:

### Jasper:
**חברה:**
- גיוסים: $125M, הערכה $1.5B
- מצב נוכחי: כמה users? הכנסות?
- layoffs? restructuring?

**מוצר:**
- Brand Voice: איך Jasper "לומד" את הטון שלך?
- Templates: כמה? אילו?
- Campaigns: end-to-end content
- Jasper Art (image generation)
- Jasper Chat
- SEO mode integration

**Pricing:**
- Creator ($39/mo)
- Pro ($59/mo)
- Business (custom)

### Copy.ai:
**מוצר:**
- GTM AI Platform (שינוי מיצוב)
- Workflows: automated content pipelines
- Sales sequences
- Blog content
- Social media

**Pricing:**
- Free: 2000 words/mo
- Pro ($49/mo)
- Team ($249/mo)
- Enterprise

### Jasper vs. Copy.ai vs. ChatGPT:
- when to use each
- quality comparison for Hebrew
- ROI for marketing teams
- integrations comparison

### Marketing Use Cases:
- blog posts at scale
- email sequences
- ad copy
- social media calendar
- product descriptions

### Hebrew Content:
- עברית quality
- marketing tone in Hebrew
- brand voice in Hebrew

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "microsoft-copilot",
    filename: "microsoft-copilot.md",
    ecosystem: "Writing/Content",
    title: "Microsoft Copilot — AI בתוך Office 365: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Microsoft Copilot (כולל Microsoft 365 Copilot) לשנת 2026 — AI מובנה בכל מוצרי Microsoft.

## נושאים לכיסוי מלא:

### Microsoft Copilot Universe:
- Copilot (bing.com/chat) — free web AI
- Microsoft 365 Copilot — Office AI
- Copilot Studio — custom copilots
- Copilot for Security
- Copilot for GitHub (ראה קטגוריה Dev)
- Azure OpenAI Service

### Microsoft 365 Copilot:
- Word: writing, summarizing, rewriting
- Excel: formula generation, data analysis, Copilot in Python
- PowerPoint: presentation from document
- Outlook: email drafting, summarizing threads
- Teams: meeting recap, action items
- OneNote: notes organization
- SharePoint: document search Q&A

### Copilot Studio:
- custom copilots (no-code)
- plugin development
- Teams integration
- Power Platform connection

### Pricing:
- Free Copilot (web): unlimited
- Microsoft 365 Personal ($6.99/mo)
- Microsoft 365 Copilot ($30/user/mo) — ENTERPRISE ONLY?
- Copilot Pro ($20/mo) — personal users

### Models:
- GPT-4o (default)
- o3 / o4 for reasoning
- DALL-E 3 for images
- Phi-3 for mobile?

### Enterprise Features:
- Microsoft Graph integration
- data protection
- admin controls
- audit logs
- compliance

### Hebrew:
- ממשק בעברית
- RTL support ב-Office
- עברית quality
- Israeli enterprise adoption

עמוד על כל 6 פרקי התבנית.`
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

  console.log(`\n✍️  מריץ ${topics.length} מחקרים — Writing/Content AI Tools\n`);

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

  console.log("\n🏁 סיום Writing/Content!\n");
}

main();
