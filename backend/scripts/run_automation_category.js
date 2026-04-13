/**
 * Automation/Knowledge AI Tools Research Runner
 * Super-Category: n8n, Zapier AI, Notion AI, Make, Gumloop, etc.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = "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";
const WIKI_DIR = path.join(__dirname, "..", "data", "wiki");

const SYSTEM_PROMPT = `אתה מחקרן בכיר ב"מרכז הידע לבינה מלאכותית". אתה כותב דוחות מחקר עמוקים בעברית.

## תבנית חובה — 6 פרקים לכל דוח:

### פרק 1: תקציר טכני (Technical Summary)
### פרק 2: סקירת ממשק והגדרות מלאה (UI & Settings Audit)
### פרק 3: ניתוח כלכלי ומגבלות (Economics & Quotas)
### פרק 4: מבחני מאמץ (5 Stress Tests)
### פרק 5: לוקליזציה לישראל (Israeli Localization)
### פרק 6: מסקנות והמלצות (Final Recommendations)

## כללים קריטיים:
- מינימום 6000 מילים
- כל פרק: לפחות 3 תת-פרקים
- מונחים טכניים: עברית + (English)
- ציין תאריכים, גרסאות, מחירים מדויקים`;

const RESEARCH_TOPICS = [
  {
    id: "zapier-ai-agents",
    filename: "zapier-ai-agents.md",
    ecosystem: "Automation",
    title: "Zapier AI Agents + MCP — אוטומציה עם 8000+ אפליקציות: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Zapier AI Agents ו-Zapier MCP לשנת 2026 — פלטפורמת האוטומציה המובילה עם AI agents ו-8000+ integrations.

## נושאים לכיסוי מלא:

### Zapier AI Agents:
- מה הם Zapier Agents? (שונה מ-Zaps רגילים)
- ארכיטקטורה: trigger → agent thinking → multi-step actions
- אילו AI models: GPT-4o? Claude? Gemini?
- Memory ב-Agents
- Human-in-the-loop checkpoints
- Error handling

### Zapier MCP Server:
- מה זה Zapier MCP? (שוחרר 2025)
- connect Claude/Cursor/Windsurf ל-8000+ apps
- setup: מה צריך?
- authentication flows
- available tools/actions

### 8000+ App Integrations:
- כמה triggers vs. actions זמינים?
- ישראלי: Wix, Payoneer, חיבורים ישראליים
- CRM: Salesforce, HubSpot, Pipedrive
- Communication: Slack, Gmail, WhatsApp Business
- Payment: Stripe, PayPal
- Dev: GitHub, Jira, Linear

### Zaps vs. Agents vs. Tables vs. Interfaces:
- מה ההבדל בין המוצרים?
- Tables: Zapier's database
- Interfaces: no-code UI builder
- Canvas: visual workflow builder

### Pricing (2026):
- Free: 100 tasks/mo
- Starter ($20/mo): 750 tasks
- Professional ($50/mo): 2000 tasks
- Team ($70/mo): unlimited users
- Enterprise: custom
- Agents pricing — נפרד?

### Use Cases ישראליים:
- CRM automation עם שירותים ישראליים
- e-commerce: Shopify + Israeli payment
- HR automation: מה שמשרד העבודה מחייב?
- חיבור ל-Monday.com ו-Breezy HR

### Security:
- SOC 2 Type II
- data encryption
- GDPR compliance
- Israeli data residency?

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "n8n-automation",
    filename: "n8n-automation.md",
    ecosystem: "Automation",
    title: "n8n — אוטומציה קוד-פתוח עם AI Agents: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על n8n לשנת 2026 — פלטפורמת האוטומציה קוד-פתוח עם AI agent capabilities שמאיימת על Zapier.

## נושאים לכיסוי מלא:

### מה זה n8n?
- fair-code license (Sustainable Use License)
- self-hosted vs. n8n Cloud
- GitHub: כמה כוכבים? contributors?
- מי משתמש: startups? enterprises?
- Jan Oberhauser: מייסד

### n8n AI Nodes:
- AI Agent node — ארכיטקטורה
- LangChain integration
- OpenAI, Anthropic, Gemini, Ollama nodes
- Vector Store nodes (Pinecone, Qdrant, Weaviate)
- Memory nodes
- Tool nodes

### Self-Hosting:
- Docker setup
- kubernetes deployment
- system requirements
- database: SQLite vs. PostgreSQL
- scaling considerations

### n8n Cloud:
- pricing vs. self-hosted
- Starter ($24/mo), Pro ($60/mo), Enterprise
- what's different from self-hosted?

### 400+ Integrations:
- comparison to Zapier's 8000+
- quality vs. quantity
- custom node development
- community nodes

### AI Workflows:
- RAG pipeline in n8n
- web scraping + AI
- customer support automation
- code generation workflows

### vs. Zapier vs. Make:
- pricing comparison
- ease of use
- scalability
- open source advantage

### ישראל:
- Israeli community
- Hebrew documentation?
- local services integration

עמוד על כל 6 פרקי התבנית עם workflow examples.`
  },
  {
    id: "notion-ai",
    filename: "notion-ai.md",
    ecosystem: "Automation",
    title: "Notion AI — בינה מלאכותית בתוך Workspace: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Notion AI לשנת 2026 — שילוב AI בתוך פלטפורמת ה-all-in-one workspace הפופולרית.

## נושאים לכיסוי מלא:

### Notion AI — מה כולל:
- AI Writer — כתיבה, עריכה, סיכום
- AI Q&A — שאלות על ה-workspace שלך
- AI Autofill — מילוי properties אוטומטי
- AI connectors — חיבור ל-Slack, Google Drive
- Notion AI for Databases

### Notion AI vs. ChatGPT:
- היתרון: context של כל ה-workspace
- הגבלה: לא יכול לחפש ברשת
- knowledge cutoff של Notion AI
- מה המודל שמריץ? GPT-4o? Claude?

### Database AI:
- AI Autofill: מה אפשרי?
- Summarize, Categorize, Generate
- Custom AI prompts על database
- performance: כמה rows מהר?

### Notion AI Connectors:
- Slack: read messages → summarize
- Google Drive: read docs
- GitHub: read issues/PRs
- כמה connectors זמינים?

### Pricing:
- Notion Plus ($12/user/mo) — AI included?
- AI Add-on ($8/user/mo)
- Business ($18/user/mo)
- Enterprise

### Use Cases:
- meeting notes → action items
- project documentation
- knowledge base Q&A
- content creation

### Hebrew/RTL:
- Notion RTL support
- Hebrew AI generation quality
- right-to-left database

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "make-automation",
    filename: "make-automation.md",
    ecosystem: "Automation",
    title: "Make (Integromat) — Visual Automation Platform: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Make (לשעבר Integromat) לשנת 2026 — פלטפורמת האוטומציה הוויזואלית המתחרה עם Zapier ו-n8n.

## נושאים לכיסוי מלא:

### Make vs. Zapier vs. n8n:
- positioning: "more powerful than Zapier, easier than n8n"
- מי המשתמשים הטיפוסיים?
- ecosystem: כמה integrations?
- pricing comparison

### Make AI Features:
- AI modules: OpenAI, Anthropic, Google AI
- text generation, classification, extraction
- image generation
- AI Router — routing logic

### Visual Builder:
- scenario builder UX
- modules vs. apps
- error handling visual
- data mapping
- iterations, aggregators, routers

### Pricing:
- Free: 1000 ops/mo
- Core ($10.59/mo): 10K ops
- Pro ($18.82/mo): 40K ops
- Teams ($34.12/mo)
- Enterprise
- Operations pricing model

### Key Features:
- webhooks
- data stores (Make's database)
- custom apps
- API calls
- scheduling

### Use Cases ישראליים:
- e-commerce automation
- CRM integration
- marketing automation

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "gumloop-ai",
    filename: "gumloop-ai.md",
    ecosystem: "Automation",
    title: "Gumloop — No-Code AI Workflows: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Gumloop לשנת 2026 — פלטפורמת no-code לבניית AI workflows ואוטומציה חכמה.

## נושאים לכיסוי מלא:

### מה זה Gumloop?
- הגדרה: "Zapier meets AI-native workflow builder"
- מייסדים, גיוסים, מצב
- comparison to Zapier, n8n, Relevance AI

### AI-Native Workflows:
- nodes: LLM, Search, Extract, Summarize
- web scraping built-in
- document processing (PDF, Word)
- email automation
- multi-step AI chains

### Key Differentiators:
- מה Gumloop עושה שאחרים לא?
- pricing model
- ease of use vs. power

### Pricing:
- Free tier
- Growth
- Enterprise

### Use Cases:
- research automation
- content generation at scale
- lead enrichment
- competitive intelligence

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

  console.log(`\n⚙️  מריץ ${topics.length} מחקרים — Automation/Knowledge\n`);

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

  console.log("\n🏁 סיום Automation!\n");
}

main();
