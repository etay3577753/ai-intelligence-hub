# AI Orchestrator Protocol — חזון מוצר מלא
> מסמך קבוע. מעודכן מהאפיון המקורי (40 עמוד). לקרוא לפני כל שלב פיתוח.

---

## 0. מה בנינו עד כה (מצב נוכחי — אפריל 2026)

```
frontend/          → Next.js 15, port 3000
backend/           → FastAPI + uvicorn, port 8000
backend/data/wiki/ → 40+ קבצי מחקר על כלי AI (Perplexity sonar-pro)
```

**פיצ'רים פעילים:**
- Dashboard ראשי עם ניווט
- Wiki לצפייה במחקרים
- השוואת מודלים
- צ'אט AI עם 2 מצבים: יועץ פרויקטים + שאל על AI (Gemini 2.5 Flash)
- שמירת שיחות ב-localStorage

**מה עדיין חסר מהחזון:** הרשימה ארוכה — ראה סעיף 21 (Roadmap).

---

## 1. מהות המוצר (Product Definition)

**שם:** AI Orchestrator Protocol
**מהות:** שכבת שליטה (Control Plane) לעבודה עם בינות מלאכותיות.

**לא:** עוד צ'אט / עוד מאגד מודלים / עוד ממשק API אחיד.
**כן:** מערכת שמבינה מה המשתמש רוצה, מה זמין לו, מה זול ובטוח, ואיך להמשיך לאורך זמן.

### מה המערכת עושה בפועל (10 שלבים):
1. מקבלת מטרה/רעיון/בקשה/פרויקט
2. מבינה כוונה ראשונית
3. שואלת שאלות הבהרה מינימליות
4. ממפה סוג משימה (Task Classification)
5. בודקת אילו מסלולי AI זמינים (Entitlements)
6. מפעילה שכבת מדיניות (Policy Layer)
7. ממליצה על מסלול עבודה (Recommended Route)
8. מסבירה בעברית
9. מנסחת Prompt ביצוע מדויק באנגלית
10. לפי בחירת משתמש: מחזירה Prompt **או** מריצה בפנים

### צורת המוצר:
- **Desktop App** = חוויית ליבה אמיתית (Local-first)
- **Web App** = גישה קלה / הדגמה / שליטה חלקית ← **מה שיש לנו עכשיו**

---

## 2. הבעיה שנפתרת

המשתמש לא מתקשה "למצוא AI". הוא מתקשה:
- להבין **במה** להשתמש עכשיו
- לדעת **מה כבר יש לו**
- להימנע מ**כפילויות תשלום**
- לשמור **הקשר** לאורך פרויקט
- להבין מה **בטוח** לעשות מקומית vs. ענן
- להמשיך לעבוד בצורה **עקבית**

### כאבי המשתמש:
- Choice Overload (פרדוקס בחירה)
- Duplicate Spend (כפילות חיובים)
- Lack of Decision Transparency (חוסר שקיפות)
- Quality vs. Cost Tradeoff
- Context Overflow (אובדן הקשר)
- Market Freshness Gap (חוסר עדכניות)
- Knowledge Gap (פערי ידע)
- Sensitive Workflows Gap (חוסר שליטה בפרויקטים רגישים)

---

## 3. עקרונות יסוד

### 3.1 Route-first, not Model-first
המשתמש לא בוחר **מודל** — הוא מקבל **מסלול עבודה**.

| מסלול | משמעות |
|-------|---------|
| Already-Paid Route | מה שכבר שולם |
| Cheapest Route | הזול ביותר |
| Quality-first Route | האיכותי ביותר |
| Local-only Route | מקומי בלבד |
| Hybrid Route | שילוב |
| Compare Route | השוואה כפולה |

### 3.2 Entitlement-aware
לפני כל המלצה, לבדוק: מנוי ווב? API key? גישת ארגון? זכאות סטודנט? Runtime מקומי? מגבלות ענן/פרטיות?

### 3.3 Policy-aware
לא "הכי טוב" אלא "הכי נכון תחת אילוצים": פרטיות / רגישות / תקציב / מהירות / עברית / רמת ידע / סיכון תפעולי.

### 3.4 Research-fed
עדכון ממנוע מחקר שוק רציף — לא קטלוג סטטי. ← **וויקי שלנו הוא הבסיס לזה**

### 3.5 Local-capable by Design
תמיכה אמיתית בעבודה מקומית + offline knowledge packs. ← **Gemma 4 / Ollama**

---

## 4. ארבעת משטחי המוצר

### 4.1 Control Center (מרכז שליטה)
מסך ראשי — תמונת מצב מיידית:
- מצב זכאויות וגישה
- שימושים ועלויות
- התראות מחקר
- פרויקטים פעילים
- מצב זיכרון
- המלצות מסלול מהירות
- כפתור: "בחר עבורי את המסלול הנכון עכשיו"

### 4.2 Task Router (מנתב משימות) ← **הלב של המערכת**
המשתמש כותב במילים פשוטות → המערכת מבינה ושואלת → ממליצה על מסלול.

**שלבי הפעולה:** Intake → Clarification → Understanding Summary → Route Recommendation → Decision Receipt → Action Choice

**פלט:** 1-3 מסלולים + לכל: למה, עלות, ודאות, privacy note + כפתורי "העתק Prompt" / "הרץ כאן" / "השווה חלופות"

### 4.3 AI Intelligence Chat (חלון מודיעין) ← **מה שיש לנו ב-/chat**
חלון **מחקרי** (לא ביצוע): שאלות על מודלים, כלים, הבדלים, מה חדש.
תשובות מבוססות: research snapshots, benchmark summaries, capability verification.

### 4.4 Workspace (סביבת עבודה)
מקום שבו העבודה עצמה קורית: שיחה + פרויקט + artifacts + compare + connectors + next-step + memory panel + context health.

---

## 5. רמות ידע משתמש (Knowledge Level)

| רמה | התנהגות המערכת |
|-----|----------------|
| **Beginner** | הסברים פשוטים, שפה נגישה, פחות ז'רגון, "כמו לילד בן 13" |
| **Intermediate** | איזון בהירות-יעילות, מושגים מקצועיים עם הסבר קצר |
| **Advanced** | תשובות תמציתיות, יותר שליטה, fine-grained controls |
| **Expert** (עתידי) | בוני מערכות |

**עקרון UX:** אותו מנוע החלטה — שכבת ההסבר (Adaptive Explanation Layer) משתנה לפי רמת הידע.

---

## 6. מנגנון קלט והבהרה (Task Intake & Clarification Engine)

**עקרון:** מינימום שאלות שמייצר מקסימום ודאות.

**שאלות הבהרה:**
- מה התוצאה הרצויה?
- מחקר / כתיבה / קוד / בניית מערכת / עיצוב / אוטומציה?
- האם יש רגישות למידע?
- חסוך כסף או איכות?
- רוצה Prompt בלבד או שהמערכת תריץ?
- פלט בעברית?

**עצירה:** אם בטוח מספיק — לא לשאול עוד. מקסימום 2-4 שאלות.

**תוצרים:** Understanding Summary, Task Type, Output Requirements, Constraints, Confidence Level.

---

## 7. מנוע המלצה והכרעה (Decision & Recommendation Engine)

**קלטים:** Task Type, Knowledge Level, Language Requirement, Privacy Requirement, Available Entitlements, Budget Preference, Speed Preference, Sensitive Project Flag, Local Capability Availability, Connected APIs/Accounts.

**פלטים:**
- Primary Route (מומלץ)
- Secondary Route (חלופי)
- Rationale (נימוק)
- Confidence Score
- Risk Note
- Estimated Cost
- Estimated Runtime
- Prompt מוצע
- Next-Step Suggestion

### Decision Receipt (קבלת החלטה) — חובה לכל המלצה:
מה הובן, מה נשקל, למה נבחר, אילו מסלולים נפסלו, אילו אילוצים השפיעו, עלות משוערת, מגבלת פרטיות, רמת ביטחון.

---

## 8. מודיעין זכאויות וגישה (Entitlement & Access Intelligence)

**מה מזוהה:** מנויי Chat, API keys, גישות ארגוניות, זכאויות סטודנטיאליות, local runtimes, endpoints פנימיים, restrictions, quota/rate limits, preferred/blocked providers.

**מסך "מפת גישה אישית":** לכל מקור — שם, סוג, פעיל?, capabilities, cloud/local/hybrid, quota, privacy, cost class, recommended scenarios.

---

## 9. מנוע חיסכון (Value Recovery Engine)

**מה מזהה:**
- כפילות בין מנוי ווב ל-API
- Route יקר למשימה פשוטה
- אפשרות להריץ local במקום בתשלום
- שימוש מיותר בספק חיצוני כשיש גישה קיימת

**הצגה:** "אפשר לבצע את זה דרך ערוץ שכבר שילמת עליו" / "כאן עדיף local" / "המסלול הזה יקר יותר ב-X%"

---

## 10. שכבת אינטגרציות וסוכנים (Connectors, Tooling & Agent Runtime)

### רמות אינטגרציה:
1. **Prompt Handoff** — מנסחת ומחזירה Prompt בלבד
2. **Tool-aware Execution** — מתחברת לכלים, APIs, connectors
3. **Agentic Execution** — מפעילה agents בפועל (terminal, browser, workflows)

### Connector Hub:
MCP Servers, Function Calling Tools, File System Connectors, Git/GitHub/GitLab, Cloud Storage, Docs/Sheets/Slides, Email/Calendar, Databases, Local Services, Browser/Chrome Connectors, Search/Research Sources.

### סוכנים:
- **Terminal Agent** — פקודות shell, קבצים, Git, lint/build/test
- **Browser/Computer Use Agent** — מסך, לחיצות, ניווט, Chrome/Desktop UI
- **Research Agents** — fetch, parse, deduplicate, validate, rank, package deltas
- **Orchestration Agents** — בחירת route, next-step, החלפת מסלול, ניתוב cloud/local

---

## 11. מודל הרשאות ובטיחות

### סוגי הרשאות: Read-only, Read-write, Execute, Network Access, Browser Access, Local File Access, External Action.

### מצבי אישור:
- Always Ask
- Ask Once Per Session
- Ask Once Per Project
- Auto-approve Safe Tools Only
- Never Auto-run in Sensitive Mode

### גבולות בטיחות: Sandbox, Whitelist, Blacklist, Logging, Audit Trail, Human Override, Kill Switch, Undo/Rollback.

### Sensitive Project Mode:
- local-only by default
- אין cloud execution בלי אישור
- אין שיתוף זיכרון בין פרויקטים
- אין browser control בלי opt-in ברור
- כל יציאה החוצה נרשמת

---

## 12. Prompt Handoff vs. In-Platform Execution

| מצב א׳ (Handoff) | מצב ב׳ (In-Platform) |
|------------------|----------------------|
| ממליצה + מסבירה | ממליצה על 1 מ-3 מסלולים |
| כותבת Prompt מדויק | שולחת Prompt בעצמה |
| נותנת instructions | מנהלת ריצה |
| נשארת companion | קוראת תוצאה + מציעה שלב הבא |

### Flow מומלץ:
1. משתמש כותב צורך פשוט
2. מערכת מחדדת
3. מערכת מציגה 3 routes
4. משתמש בוחר: "תן לי Prompt" / "הרץ אצלי במערכת"
5. מערכת ממשיכה בהתאם

---

## 13. זיכרון, פרויקטים והקשר

### שכבות זיכרון:
- Conversation Memory
- Project Memory
- User Preference Memory
- Organization Memory
- Research Memory
- Temporary Session Memory

### חלוקה לפי פרטיות: Personal, Project, Org, Local-only, Synced, Never-upload.

### מה נשמר: Prompts, Routes שנבחרו, Decision Receipts, Outputs, Errors, Follow-up decisions, Tool results, User style preferences, Preferred languages, Common failure patterns.

### Context Health: estimation של token usage, context utilization, warning thresholds, המלצה מתי לסכם/לפצל/לארכב.

---

## 14. שקיפות תפעולית

- **Usage & Spend Dashboard** — שימוש לפי ספק/מודל/פרויקט/שיחה + עלות + savings opportunities
- **Token Budget & Context Monitor** — input/output tokens estimate, context fullness, אזהרות
- **Research Delta Feed** — מה חדש אתמול, אילו מודלים נוספו, מחירים השתנו, השפעה על המלצות

---

## 15. שכבת מחקר ועדכונים (Research & Delta Sync)

**Local Knowledge Packs:** בעת התקנה/עדכון — snapshots, model summaries, pricing, benchmarks, entitlement heuristics, route baselines.

**Delta Sync:** רק מה שהשתנה, בצורה חסכונית, עם freshness badge ברור.

**חובה:** כל פריט מחקרי נושא: Source, Last Verified, Confidence, Stale Warning.

← **וויקי שלנו (40+ קבצי .md) = Local Knowledge Pack הראשוני**

---

## 16. מסכי המערכת (Screen-by-Screen)

| מסך | תיאור | סטטוס |
|-----|--------|--------|
| Control Center (Home) | מרכז שליטה עם זכאויות, עלויות, מחקר, פרויקטים | **חלקי (Dashboard הנוכחי)** |
| Personal Access Map | מפת גישה אישית — מה פתוח, דרך מה, באילו מגבלות | **חסר** |
| Task Router | לב החוויה — קבלת צורך + שאלות + המלצת מסלול | **חסר** |
| AI Intelligence Chat | חלון מחקרי + שאלות על כלים | **קיים ב-/chat (מצב research)** |
| Workspace | סביבת עבודה עם artifacts, compare, memory | **חסר** |
| Sensitive Project Workspace | סביבה מופרדת לפרויקטים רגישים | **חסר** |
| Usage, Tokens & Cost | דשבורד שימוש ועלויות | **חלקי מאוד** |
| User Settings | הגדרות משתמש, רמת ידע, פרטיות, גישות | **חלקי** |

---

## 17. טקסונומיית מסלולים (Route Taxonomy)

**מסלולים בסיסיים:**
Already-Paid, Local, Cheapest, Highest-Quality, Fastest, Compare, Sensitive, Org-approved, Student-eligible.

**מסלולים מורכבים:**
- Local Draft + Cloud Final
- Research in Cloud + Execution in Local
- Compare Two + Human Approval
- Cheap Exploration + Premium Finalization
- Router-only + Prompt Handoff
- Full In-Platform Orchestration

**כל מסלול מוגדר ע"י:** name, description, allowed environments, allowed providers, cost class, privacy class, speed class, suitability by task, confidence.

---

## 18. מודל נתונים — ישויות ליבה

```
User             → user_id, knowledge_level, privacy_preferences, default_route_preference
Organization     → org_id, approved_providers, blocked_providers, org_policies
Access Source    → source_type (subscription/api/org/local/student), quota_info, cost_mode
Route            → route_type, cost_class, speed_class, privacy_class, compatible_task_types
Task Intake      → raw_prompt, clarified_prompt, task_type, sensitivity_level, understanding_summary
Recommendation   → primary_route_id, confidence_score, rationale, decision_receipt, estimated_cost
Project          → privacy_mode, active_route, memory_policy, status
Conversation     → current_route, execution_mode, context_health, last_model_used
Artifact         → artifact_type, title, file_path/uri, summary, tags
Execution Run    → route_id, provider, model, token_estimate_in/out, cost_estimate
Research Snapshot→ source_name, topic, summary, verified_at, freshness_score, impact_tags
Policy           → scope (user/org/project/route), condition, action, severity
Connector        → connector_type, status, permission_scope, auth_type
Agent Capability → agent_type, actions_supported, required_permissions, safe_mode_supported
```

---

## 19. זרימות עבודה מרכזיות

### 19.1 Beginner Guided Flow:
כתב צורך פשוט → הבנה חלקית → 1-3 שאלות → תקציר פשוט → 3 מסלולים → בחירה → ביצוע/Prompt → צעד הבא.

### 19.2 Connected User Flow:
יש APIs/subscriptions/local runtime → מערכת לוקחת בחשבון Entitlement Graph → recommendation engine לפי מדרג → בחירה מ-3 routes → Prompt נשלח אוטומטית → שמירה + Decision Receipt → Next-Step.

### 19.3 Sensitive Project Flow:
מסומן/מזוהה רגיש → Sensitive Mode → local-only default → connectors מוגבלים → browser control חסום → כל ענן מחייב אישור → memory partitioning → audit trail.

### 19.4 Nightly Research Flow:
scheduler → research agents → fetch/parse/validate/rank → research snapshots → delta updates → update package → Control Center מציג שינויים בבוקר.

---

## 20. רמות מוצר ומודל עסקי

| רמה | מה כלול | מטרה |
|-----|---------|-------|
| **Free/Basic** | Task Router בסיסי, AI Intelligence, Prompt Handoff, Knowledge level adaptation | להראות ערך גם ללא תשלום |
| **Connected** | חיבור APIs/local runtimes, Decision receipts מלאים, Project memory, Usage dashboard | לנצל מה שכבר יש |
| **Premium/Managed** | In-platform execution, Advanced policy, Cloud sync, Team/org workspace, Larger research packs | שכבת orchestration פרימיום |

---

## 21. Roadmap

### MVP (מה שבנינו + מה שחסר לBeta):
✅ Web shell (Next.js 15 + FastAPI)
✅ AI Intelligence Chat (advisor + research)
✅ Research snapshots (40+ wiki files)
✅ Basic dashboard
❌ Task Router מלא עם Decision Receipts
❌ Entitlement settings + Access Map
❌ Project memory (מעבר ל-localStorage)
❌ Usage/cost tracking
❌ Knowledge level adaptive responses
**אומדן:** ₪120K-₪320K

### V1 (מסחרי ראשוני):
✅ + Runtime execution in-platform, Connector hub בסיסי, Terminal Agent בסיסי, Policy modes, Research delta feed, Token/context monitor.
**אומדן:** ₪250K-₪600K

### V2:
Nightly research pipeline אוטומטי, Delta sync מלא, Local knowledge packs, Sensitive Project Mode מלא, Computer Use/Browser Control מוגבל.
**אומדן:** ₪450K-₪1M+

### V3 / מוצר בשל:
Desktop app מלוטש (Windows/macOS), Org deployment, Advanced governance, Multi-device sync.
**אומדן:** ₪800K-₪2M+

---

## 22. המלצות טכנולוגיות

```
Desktop:     Electron / Tauri / hybrid desktop
Web:         React / Next.js ← מה שיש עכשיו
Local DB:    SQLite / local Postgres / embedded DB
Vectors:     Local vector store
Secrets:     Encrypted secrets storage
Local AI:    Ollama + Gemma 4 (GTX 1070 Ti 8GB)
Connectors:  MCP ecosystem, connector standards
Cloud:       Research ingestion, optional sync
```

**עיקרון:** לא להמציא הכל מאפס — לבנות **שכבת החלטה, policy, זכאויות, מחקר ושקיפות** מעל יסודות קיימים.

---

## 23. עלויות תפעול חודשיות (אומדן)

| סוג משתמש | עלות חודשית משוערת |
|-----------|-------------------|
| אישי קל (רוב מקומי) | $20-$150 |
| אישי מתקדם (compare, research, execution) | $80-$400 |
| מוצר מסחרי קטן | $300-$2,500 |

---

## 24. החלטות מחייבות שנקבעו

1. המוצר יהיה **Desktop-first** עם Web support בסיסי
2. **Route-first**, לא Model-first
3. **Entitlement-aware** recommendation
4. **Adaptive Explanation** לפי Knowledge Level
5. **Clarification Engine** עם מספר שאלות מינימלי
6. תמיכה בשני מצבים: **Prompt Handoff** + **In-Platform Execution**
7. שכבת **Connector & Agent Runtime**
8. **Terminal Agent**
9. **Decision Receipts** כחלק מליבת ה-UX
10. **Usage / Token / Cost Visibility**
11. **Research Delta Feed**
12. **Sensitive Project Mode**
13. **Memory Partitioning**
14. MVP יישאר ממוקד אך ימחיש את הבידול

---

## 25. נקודות פתוחות (שעדיין דורשות הכרעה)

1. Web version — public demo בלבד, או גם סביבת עבודה חלקית?
2. Browser control — V1 או V2?
3. Managed APIs — כן/לא?
4. Onboarding — Simple Mode לכולם כברירת מחדל?
5. Research packs — לכולם או רק פרימיום?
6. Team/org features — מוקדם או מאוחר?
7. Capability verifier — live או snapshot-based?
8. Compare runs — על דרישה או גם אוטומטי?
9. Connectors ב-MVP — read-only בלבד?
10. Pricing model — subscription / credits / freemium / hybrid?

---

## 26. זהות המוצר (Product Identity)

> המערכת **אינה** "עוד מקום לדבר עם AI", "עוד gateway", "עוד דסקטופ של הרבה מודלים".
>
> היא **מערכת לניהול החלטות AI, זכאויות, מדיניות, זיכרון, חידושי שוק וזרימות עבודה** שמסוגלת:
> - להבין משתמש פשוט
> - להסביר לו בפשטות
> - לבחור עבורו את המסלול הנכון
> - לנצל את מה שכבר יש לו
> - לבצע בעצמה כאשר צריך
> - לשמור רצף עבודה **חכם, בטוח, שקוף ומתקדם**

---

## 27. מפת פערים — מה שיש vs. מה שצריך (עדיפות)

| עדיפות | פיצ'ר | מצב |
|--------|--------|------|
| 🔴 גבוהה | Task Router עם Clarification + Decision Receipt | חסר |
| 🔴 גבוהה | Knowledge Level בהגדרות + השפעה על תגובות | חסר |
| 🔴 גבוהה | Project Memory (מעבר ל-localStorage) | חסר |
| 🟡 בינונית | Personal Access Map (מפת זכאויות) | חסר |
| 🟡 בינונית | Usage & Cost tracking אמיתי | חסר |
| 🟡 בינונית | Route Taxonomy — הצגת מסלולים לא מודלים | חסר |
| 🟢 נמוכה | Terminal Agent | חסר |
| 🟢 נמוכה | Nightly Research Pipeline | חסר |
| 🟢 נמוכה | Sensitive Project Mode | חסר |
| 🟢 נמוכה | Connector Hub (MCP) | חסר |

---

*מסמך זה מייצג את החזון המלא. הפיתוח מתקדם בשלבים — לפי roadmap בסעיף 21.*
*עדכון אחרון: אפריל 2026*
