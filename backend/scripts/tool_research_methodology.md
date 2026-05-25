# מתדולוגיית מחקר עומק — כלי AI יחיד
## גרסה 2.0 | AI Intelligence Hub
---
> **כלי מחקר:** Perplexity Sonar Pro בלבד
> **חוק ברזל:** כל טענה עובדתית = מקור ממוספר [1][2][3]
> **אם אין מקור:** כותבים "לא אומת" — לא ממציאים
> **שפה:** הכל עברית חוץ מ: שמות כפתורים, קוד, פרומפטים, מונחים טכניים

---

## הוראת הפעלה — Prompt לשליחה ל-Sonar Pro

```
You are a deep technical researcher writing an exhaustive Wiki article.
Subject: [TOOL_NAME] | Ecosystem: [ECOSYSTEM] | URL: [URL]

RULES:
1. Every factual claim → numbered citation [1][2][3]
2. No verified source → write "לא אומת" (not verified)
3. Official sources first: changelog, docs, pricing page, official blog
4. For Israel-specific: only verified Israeli user reports or official statements
5. Language: Hebrew, except button names / code / prompts / technical terms
6. Minimum 15 citations. Minimum 12,000 characters.

Follow EXACTLY the 15-chapter structure provided below.
```

---

# 15 פרקי המחקר — שאלות מלאות לכל פרק

---

## פרק 1 — זיהוי וסיווג הכלי

**מה אנחנו רוצים לדעת:**

```
שאלות לPerplexity:
- מה השם הרשמי המלא של הכלי?
- מי פיתח אותו? (חברה, קהילת open source, יחיד?)
- מה תאריך ההשקה הרשמי?
- מה הגרסה הנוכחית נכון לתאריך המחקר?

סיווג ייעוד (בחר את כל המתאימים):
□ LLM / Chatbot          □ Coding Assistant         □ IDE / Code Editor
□ Image Generation        □ Video Generation         □ Audio / Music / TTS
□ Automation / Workflow   □ No-Code App Builder      □ Research / Search
□ Agent Framework         □ Productivity / Docs       □ Data Analysis
□ API / Backend           □ Browser Automation        □ Local / On-Premise
□ Presentation            □ Marketing / Copywriting   □ Avatar / Video Presenter
□ DevOps / CI-CD          □ RAG / Knowledge Base      □ Multi-modal

קהל יעד ראשי: מפתחים / מעצבים / משווקים / עסקים / אנשים פרטיים / חוקרים
```

**פלט נדרש:**
```
### זהות הכלי

| פרמטר | פרטים | מקור |
|--------|--------|------|
| שם רשמי | | |
| יצרן | | [X] |
| תאריך השקה | | [X] |
| גרסה נוכחית | | [X] |
| סיווג | [קטגוריות] | [X] |
| קהל יעד | | [X] |
| URL ראשי | | |
| GitHub (אם קיים) | | [X] |
```

---

## פרק 2 — Open Source וקהילה

**מה אנחנו רוצים לדעת:**

```
שאלות:
- האם הכלי open source? (לחלוטין / חלקית / סגור לחלוטין)
- אם open source:
  - רישיון: MIT / Apache 2.0 / GPL / AGPL / BSL / Commercial / אחר?
  - קישור לrepo הרשמי ב-GitHub?
  - כמה Stars ב-GitHub? (מדד פופולריות)
  - כמה Contributors פעילים?
  - תדירות commits: פעיל מאוד / פעיל / מתוחזק / נטוש?
- האם ניתן לself-host? מה הדרישות?
- האם יש fork פופולרי שמוסיף יכולות?
- האם יש Discord / Slack / Forum קהילתי?
- האם יש חנות extensions / plugins / marketplace? (ראה פרק 6)
```

**פלט נדרש:**
```
### סטטוס Open Source

| | פרטים | מקור |
|--|--------|------|
| סטטוס | Open / Partial / Closed | [X] |
| רישיון | | [X] |
| GitHub | [URL] ⭐X stars | [X] |
| Self-host | כן/לא + דרישות | [X] |
| קהילה פעילה | Discord/Forum [URL] | [X] |
| תדירות עדכונים | | [X] |
```

---

## פרק 3 — יכולות מלאות (Capability Matrix)

**מה אנחנו רוצים לדעת:**

```
עבור כל יכולה — ציין:
א) האם קיימת? (כן / לא / חלקית)
ב) תחת איזה tier? (Free / Pro / API / כולם)
ג) האם עובד בישראל? (כן / לא / לא ידוע)
ד) מקור

יכולות לבדוק:
--- טקסט ---
□ כתיבת תוכן (מאמרים, פרסומים)
□ סיכום מסמכים
□ תרגום (ואיכותו לעברית-אנגלית)
□ ניתוח טקסט
□ Q&A על מסמכים

--- קוד ---
□ כתיבת קוד (שפות נתמכות — רשימה)
□ debug ותיקון קוד
□ הסבר קוד קיים
□ refactoring
□ כתיבת tests
□ תמיכה ב-terminal / bash

--- ויזואל ---
□ ניתוח תמונות (Vision)
□ יצירת תמונות
□ עריכת תמונות
□ ניתוח PDF עם תמונות
□ ניתוח screenshots

--- קבצים ---
□ העלאת PDF
□ העלאת Word / Excel / PPT
□ העלאת קוד / ZIP
□ פורמטים נוספים נתמכים

--- מתקדם ---
□ Web search בזמן אמת
□ Code execution (הרצת קוד בפועל)
□ Multi-turn memory (זיכרון בין שיחות)
□ Agents / Agentic mode
□ API access
□ Streaming responses
□ Batch processing
□ Voice input / output
```

**פלט נדרש:**
```
### Capability Matrix

| יכולת | זמין | Tier | ישראל | מקור |
|--------|------|------|-------|------|
| כתיבת קוד — Python | ✅ | כולם | ✅ | [X] |
| Vision — ניתוח תמונות | ✅ | Pro+ | ✅ | [X] |
| Web Search | ✅ | Pro | ⚠️ | [X] |
| ... | | | | |
```

---

## פרק 4 — Connectors ואינטגרציות

**מה אנחנו רוצים לדעת:**

```
חלק א — אינטגרציות מובנות (Native Integrations):
שאלות:
- אילו כלים חיצוניים מחוברים ישירות לכלי (out of the box)?
- לכל אינטגרציה: מה ניתן לעשות? (קרא / כתוב / שניהם)

קטגוריות לבדוק:
□ Google Workspace (Docs, Sheets, Gmail, Drive, Calendar)
□ Microsoft 365 (Word, Excel, Teams, Outlook, SharePoint)
□ GitHub / GitLab / Bitbucket
□ Slack / Teams / Discord / Zoom
□ Notion / Confluence / Jira / Linear
□ Figma / Adobe / Canva
□ Zapier / Make / n8n (בתור מקור או יעד)
□ Salesforce / HubSpot / CRM
□ AWS / GCP / Azure
□ Docker / Kubernetes
□ Databases (PostgreSQL, MongoDB, etc.)
□ Web browsers (Chrome extension / Safari)
□ VS Code / JetBrains / Vim extensions
□ אחר (ציין)

חלק ב — MCP Servers:
שאלות:
- האם הכלי תומך ב-MCP (Model Context Protocol)?
  כלומר: האם ניתן להתחבר אליו כ-MCP Client או לחשוף אותו כ-MCP Server?
- אם כן — אילו MCP servers פופולריים זמינים לכלי הזה?
- מקורות: hub.modelcontextprotocol.io / github.com/modelcontextprotocol/servers

חלק ג — API ו-Webhooks:
שאלות:
- האם יש REST API פומבי?
- האם יש Webhooks (לקבל התראות)?
- האם יש SDK (Python / JS / אחר)?
- Rate limits של ה-API
```

**פלט נדרש:**
```
### Native Integrations

| כלי / Platform | סוג חיבור | מה ניתן לעשות | מקור |
|----------------|-----------|--------------|------|
| GitHub | OAuth | קרא/כתוב repo | [X] |
| Google Drive | OAuth | קרא קבצים | [X] |
| ... | | | |

### MCP Support
- MCP Client (יכול להתחבר לservers): ✅/❌ | [X]
- MCP Server (ניתן לחבר אליו): ✅/❌ | [X]
- MCP servers מומלצים: [רשימה + לינקים] | [X]

### API
- REST API: ✅/❌ | [X]
- SDK: Python ✅/❌ | JavaScript ✅/❌ | [X]
- Webhooks: ✅/❌ | [X]
- Rate limits: X req/min, X req/day | [X]
```

---

## פרק 5 — Extensions, Plugins ו-Marketplaces

**מה אנחנו רוצים לדעת:**

```
חלק א — חנויות ומאגרים:
שאלות:
- האם יש Marketplace / Extension Store רשמי לכלי?
  (כמו ChatGPT Plugins, VS Code Marketplace, Chrome Web Store)
- כמה extensions/plugins זמינים?
- אילו הם הפופולריים ביותר? (Top 5)
- האם ניתן לפתח extension/plugin בעצמך?
  אם כן — מה ה-framework? יש תיעוד?

חלק ב — GitHub Extensions ספציפיות:
שאלות:
- האם יש GitHub Actions רשמיות לכלי?
- האם יש repos פופולריים ב-GitHub עם prompts / configurations / templates?
  (חפש: "awesome-[toolname]" repos)
- האם יש community-made tools שמרחיבים את הכלי?

חלק ג — Agent Frameworks:
שאלות:
- האם הכלי ניתן לשימוש כ-LLM Provider בframeworks כמו:
  □ LangChain
  □ LlamaIndex  
  □ AutoGen
  □ CrewAI
  □ AgentGPT / AutoGPT
  □ Flowise / Langflow
  □ n8n AI nodes
  □ Dify.ai
  □ אחר
- לכל framework — איך מחברים? יש תיעוד?

חלק ד — Prompt Libraries:
שאלות:
- האם יש מאגר prompts רשמי לכלי?
- מאגרי prompts קהילתיים מומלצים (PromptBase, FlowGPT, וכו')
- האם הכלי תומך ב-Prompt Templates מובנים?
```

**פלט נדרש:**
```
### Marketplace / Extension Store
- קיים: ✅/❌ | URL: | מספר extensions: | [X]
- Top 5 extensions: [רשימה + מה עושים] | [X]
- פיתוח עצמי: ✅/❌ | framework: | [X]

### GitHub Resources
| Resource | URL | Stars | מה זה | מקור |
|----------|-----|-------|--------|------|
| awesome-[tool] | | ⭐X | | [X] |
| [tool]-prompts | | ⭐X | | [X] |

### תמיכה ב-Agent Frameworks
| Framework | תמיכה | גרסה | תיעוד | מקור |
|-----------|--------|------|--------|------|
| LangChain | ✅/❌ | | [URL] | [X] |
| LlamaIndex | ✅/❌ | | [URL] | [X] |
| CrewAI | ✅/❌ | | [URL] | [X] |
| n8n | ✅/❌ | | [URL] | [X] |
| Flowise | ✅/❌ | | [URL] | [X] |
```

---

## פרק 6 — זמינות ונגישות

```
שאלות:
- URL ראשי + URLs נוספים (אפליקציה / API / docs)
- פלטפורמות: Web / iOS / Android / Desktop (Win/Mac/Linux) / VS Code Extension / Chrome Extension
- האם זמין בישראל? ✅/❌/⚠️
- צורך VPN? אילו מדינות חסומות?
- אימות ישראלי (+972): עובד/לא עובד
- ממשק עברית: מלא / חלקי / לא קיים
```

---

## פרק 7 — תוכניות, תמחור ומגבלות

```
לכל Tier (Free / Pro / Team / Enterprise / API):
שאלות:
- מחיר מדויק ($/חודש, $/שנה, חיסכון שנתי %)
- מה כלול בדיוק
- HARD LIMITS (לא ניתן לעבור):
  □ הודעות/יום
  □ Tokens/request (input + output)
  □ Tokens/יום / חודש
  □ RPM (requests per minute)
  □ RPD (requests per day)
  □ גודל קובץ מקסימלי
  □ מספר קבצים בו-זמנית
  □ Context window
- SOFT LIMITS (האטה / אזהרה):
  □ מה קורה כשמגיעים?
  □ מקבלים אזהרה? מתי?
  □ מתי מתאפס? (יומי / חודשי / rolling 30 יום)
- תשלום ישראלי:
  □ כרטיס ישראלי עובד?
  □ PayPal / Apple Pay / Google Pay?
  □ תשלום בשקלים?
  □ חשבונית VAT ישראלי?
```

---

## פרק 8 — מפת הממשק המלאה

```
שאלות — חובה למצוא בתיעוד רשמי / YouTube tutorials / changelogs:
עבור כל אלמנט UI:
- שם אנגלי מדויק
- שם עברי (אם קיים)
- מה הוא פותח / עושה
- Keyboard shortcut (אם קיים)
- זמין ב-tier?
- מוסתר? (לא נראה בברירת מחדל)

קטגוריות UI לסקור:
□ Main Navigation (sidebar / top menu)
□ Chat interface controls
□ Settings → General
□ Settings → Privacy / Data
□ Settings → Appearance / Theme
□ Settings → Integrations
□ Model selector (אם יש)
□ File upload controls
□ Export / Share options
□ כפתורי עריכה בתוך שיחה
□ Memory / History controls
□ Keyboard shortcuts (רשימה מלאה)

הגדרות שמשפרות עבודה:
□ Custom Instructions / System Prompt — איפה? מגבלת תווים?
□ Memory — איך מפעילים / מנהלים / מוחקים?
□ Response format preferences
□ Code highlighting settings
□ Temperature / Advanced settings (אם זמין בUI)
```

**פלט נדרש:**
```
### מפת כפתורים מלאה

#### Navigation / Sidebar
| כפתור (EN) | כפתור (HE) | פעולה | Shortcut | Tier | מקור |
|------------|------------|-------|----------|------|------|
| New Chat | שיחה חדשה | פותח שיחה ריקה | Ctrl+N | כולם | [X] |

#### Settings
| הגדרה | ערכים | ברירת מחדל | משפיע על | Tier | מקור |
|--------|-------|------------|----------|------|------|

#### Keyboard Shortcuts — רשימה מלאה
| פעולה | Windows/Linux | macOS | מקור |
|--------|--------------|-------|------|
```

---

## פרק 9 — שפות ועברית

```
שאלות:
א) ממשק הכלי:
- האם ממשק הכלי מתורגם לעברית?
- אם כן — שלמות התרגום (מלא / חלקי / בסיסי)
- כיצד מחליפים שפת ממשק?

ב) הבנת עברית:
- רמה: מלאה / גבוהה / בינונית / בסיסית / לא תומך
- האם יכול לענות לשאלה בעברית?
- האם מבין הקשר תרבותי ישראלי?
- מונחים טכניים בעברית — מכיר?

ג) כתיבת עברית:
- RTL — מציג נכון? בעיות ידועות?
- ניקוד — יכול לכתוב עם ניקוד?
- מגדר — זכר/נקבה — עובד נכון?
- עברית מדוברת vs. ספרותית
- עברית טכנית (קוד + עברית)

ד) שפת הפרומפט:
- שפת הפרומפט האופטימלית לכלי הזה:
  □ אנגלית בלבד
  □ עברית מלאה
  □ Prompt באנגלית + "ענה בעברית" בסוף
  □ לא משנה — אותה איכות
- האם יש ירידת איכות כשכותבים בעברית? כמה?
- מחקרים / השוואות מאומתות?
```

---

## פרק 10 — ניהול Tokens וחיסכון

```
שאלות:
- האם יש מונה tokens בממשק? (real-time / post-message / לא קיים)
- עלות tokens ממוצעת לפעולות:
  □ שאלה קצרה (50 מילים prompt)
  □ שאלה ארוכה (500 מילים)
  □ PDF — 10 עמודים
  □ תמונה אחת
  □ שיחה של 20 הודעות
- Context Window:
  □ גודל מדויק (tokens / מילים / דפי A4)
  □ מה קורה כשמתמלא
  □ האם יש auto-compression?
  □ Caching — קיים? איך מפעילים? כמה חוסך?
- טיפים מאומתים לחיסכון:
  □ אילו פיצ'רים "שורפים" tokens בלי צורך?
  □ מתי לפתוח שיחה חדשה?
  □ האם "Clear context" עוזר?
  □ פורמט prompt שחוסך tokens
```

---

## פרק 11 — אמנות הפרומפט לכלי הזה

```
זהו הפרק הכי ייחודי — כל כלי מגיב אחרת.

א) Role Prompting — "אתה מומחה":
- האם הקדמה "You are an expert in X" משפרת תוצאות?
- אם כן — איזה ניסוח עובד הכי טוב?
  □ "You are an expert in..."
  □ "Act as a senior..."
  □ "As a professional..."
  □ לא עוזר / מזיק
- מחקרים / השוואות מאומתות?

ב) מבנה פרומפט אופטימלי:
- הסדר שעובד הכי טוב:
  [Role] → [Task] → [Context] → [Format] → [Constraints]
  או סדר אחר?
- Delimiters שהכלי מגיב טוב אליהם:
  □ """ triple quotes
  □ ### headers
  □ <xml tags>
  □ - bullet lists
  □ מספרים 1. 2. 3.
- Chain of Thought — "חשוב צעד אחר צעד":
  □ עוזר מאוד / מעט / לא עוזר / מזיק
- Few-shot examples:
  □ כדאי לכלול דוגמאות? כמה?

ג) אורך פרומפט:
- מה עובד טוב יותר:
  □ קצר ומדויק (1-3 משפטים)
  □ בינוני (1 פסקה)
  □ מפורט מאוד (1+ עמוד)
- מתי ארוך מזיק?

ד) PDF vs. טקסט ישיר:
- מתי עדיף להעלות PDF?
  □ סף גודל שמכריע
  □ סוג תוכן שמכריע
- פורמטים: PDF / TXT / MD / DOCX — מה הכלי מבין הכי טוב?
- מגבלות העלאה: גודל מקסימלי / מספר קבצים / פורמטים

ה) "Magic Prompts" — קודים וטריקים:
- האם יש tokens / פקודות מיוחדות?
  לדוגמה: /think, TLDR:, Format: JSON, Be concise, Step by step:
- System Prompt מומלץ לשימוש קבוע
- Negative prompting — מה לאמר שלא לעשות
```

**פלט נדרש:**
```
### המבנה האופטימלי לפרומפט ב-[TOOL_NAME]

\`\`\`
[ROLE] You are an expert [role]. ← עובד/לא עובד: [מקור]
[TASK] [תיאור המשימה בצורה ברורה]
[CONTEXT] Background: [רקע]
[FORMAT] Respond as: [bullets/JSON/prose/code]
[CONSTRAINTS] Keep it under X words. In Hebrew.
\`\`\`

### מה עובד / לא עובד — מאומת
✅ [עובד] — [מקור]
❌ [לא עובד] — [מקור]

### PDF vs. טקסט:
- עד X עמ' → הדבק טקסט
- X+ עמ' → העלה PDF
- פורמט מועדף: [פורמט]

### System Prompt קבוע מומלץ:
\`\`\`
[פרומפט]
\`\`\`
```

---

## פרק 12 — יכולות מתקדמות ומקסום

```
שאלות:
- 5 פיצ'רים שרוב המשתמשים לא יודעים (מאומת בפורומים)
- Labs / Beta features — איך מפעילים?
- Hidden settings — שינויים ב-URL, localStorage, dev tools
- Keyboard shortcuts — רשימה מלאה
- API tricks — דברים שניתן לעשות רק ב-API
- Integrations שמייצרים יכולות חדשות
```

---

## פרק 13 — ניתוב בתוך האקוסיסטם

```
שאלות:
- אילו כלים נוספים יש בחברה?
- מתי [TOOL_NAME] ומתי הכלי האחי?
- שאלה אחת שמכריעה בין הכלים

פלט: טבלה + שאלת ההחלטה
```

---

## פרק 14 — השוואה עם המתחרה הישיר

```
שאלות:
- מי המתחרה מספר 1?
- 3 מצבים שמנצח, 3 שמפסיד
- מה בוחר המשתמש הממוצע ולמה?

פלט: טבלה head-to-head + המלצה סופית
```

---

## פרק 15 — ישראל: מה עובד, מה לא

```
שאלות:
- זמינות רשמית בישראל
- תשלום: כרטיס ישראלי / PayPal / שקלים / VAT
- פיצ'רים חסומים בישראל ספציפית
- ביצועי עברית — דיווחים מאומתים
- בעיות RTL ידועות + workarounds
- חוק הגנת הפרטיות הישראלי — עמידה?
```

---

## קריטריוני איכות לפני פרסום

```
□ מינימום 15 מקורות ממוספרים
□ מינימום 12,000 תווים
□ פרק 2 (Open Source) — מלא גם אם הכלי סגור
□ פרק 4 (Connectors) — לפחות 5 אינטגרציות בדוקות
□ פרק 5 (Extensions) — Agent frameworks בדוקים
□ פרק 11 (אמנות הפרומפט) — לפחות 3 מאומתות
□ פרק 15 (ישראל) — כתוב גם אם הכל "לא ידוע"
□ שדות ריקים = "לא אומת [X]" — לא ריקים לחלוטין
□ תאריך מחקר + עלות + מודל Perplexity בכותרת
```

---

## סדר עדיפויות — Tier A (מחקר דחוף):

| עדיפות | כלי | סיבה |
|--------|-----|------|
| 1 | `google-ai-studio` | הכי חסר, הכי נחקש |
| 2 | `midjourney` | נמצא בהמלצות, אין wiki בכלל |
| 3 | `notebooklm` | Google tool חסר |
| 4 | `claude-code` | יש wiki אך לא לפי המתדולוגיה החדשה |
| 5 | `canva-ai` | נמצא בהמלצות, אין wiki |

---
*גרסה: 2.0 | ממתינה לאישור*
