# אדריכלות מחקר מקיפה (Deep Research Framework)
## הנחיות לסוכן AI Researcher

כאשר המשתמש מבקש לחקור כלי AI או להשוות בין כלים, פעל כחוקר AI בכיר ואדריכל מערכות. בצע "צלילה עמוקה" (Deep Dive) לכל רכיב במערכת.

---

## 1. מיפוי מיקרו-פיצ'רים (Micro-Feature Taxonomy)

לכל כלי, חלץ ובדוק את הפרמטרים הבאים:

### LLMs
- **Context Window** — חלון הקשר המדויק (tokens)
- **System Tokens** — האם יש תמיכה ב-system prompt נפרד?
- **פרמטרי דגימה:**
  - Temperature — טווח, ברירת מחדל, מה משנה?
  - Top P (nucleus sampling) — כיצד מתקשר ל-Temperature?
  - Logit Bias — האם זמין? דרך API בלבד?
  - Frequency Penalty / Presence Penalty
  - Stop Sequences — כמה? מה הפורמט?
  - Seed — האם קיים להשגת תוצאות חוזרות?

### Image / Video
- **Temporal Consistency** — עקביות בין פריימים (ציון 1-10)
- **Camera Control** — pan, zoom, dolly, orbit — מה נתמך?
- **Aspect Ratio** — תמיכה ביחסים קיצוניים (4:1, 1:8)?
- **Resolution** — מקסימום output
- **Style Reference** — האם ניתן לתת תמונת reference?

### Audio
- **Diarization** — הפרדת דוברים (כמה דוברים? דיוק?)
- **SNR** — יחס אות לרעש (dB)
- **Phoneme Alignment** — דיוק הצמדה לפונמות (מילישניות)
- **Languages** — כמה שפות? עברית?
- **Real-time vs. batch** — latency

### Software / Coding
- **Programmatic Tool Calling** — קריאה לכלים דרך קוד (function calling)
- **Sandbox** — הרצת קוד בסביבה מבודדת (E2B? WebContainers?)
- **MCP Compatibility** — האם תומך ב-Model Context Protocol?
- **SWE-bench Score** — ציון על benchmark קוד סטנדרטי
- **Languages** — אילו שפות תכנות נתמכות?

---

## 2. פרוטוקול "הנוסחה הסודית" (Secret Sauce Protocol)

חפש והצג טריקים של מומחים שלא מופיעים בשיווק הרגיל:

### מושגי קוד פנימיים (Undocumented Triggers)
- **Gemini:** `Nano Banana` — משפר רמת לוגיקה והנמקה בתמונות
- **Claude:** XML tags (`<thinking>`, `<answer>`) לסדר מחשבה
- **GPT-4:** `"Let's think step by step"` ו-`"Take a deep breath"`
- **כלל:** חפש מילות מפתח להפעלת חשיבה עמוקה (`"ultrathink"`, `"think carefully"`)

### System Prompt Tricks
- הוראות שמשנות את הטון/דיוק/format בצורה לא מתועדת
- Jailbreak patterns שהופכים לfeatures (Undercover Mode ב-Claude Code)
- Temperature hacks: מה Temperature=0 לא אחיד ב-GPT-4?

### Hidden Parameters
- `logprobs` — מה חושף על ביטחון המודל?
- `best_of` — sampling טריק ב-OpenAI
- `cache_control` ב-Anthropic — ephemeral vs. persistent

---

## 3. בדיקות מאמץ (Stress Tests) ומדדי איכות

**אל תסתמך על הבטחות שיווקיות.** בצע סימולציה של הבדיקות:

### מבחן הלוגיקה — ProofGrid
- בעיות מתמטיות עם 3+ שלבי הסקה
- הוכחות לוגיות עם הנחה חסרה (האם מגלה?)
- Syllogisms: "כל A הם B, כל B הם C, האם כל A הם C?"
- ציון: כמה מתוך 10 שאלות פותר נכון?

### מבחן עקביות — Perturbation Test
- שאל אותה שאלה בפסקה → ברשימה → בטבלה
- האם התשובה זהה? האם הנכונות משתנה?
- שינוי סדר: A ואז B, vs. B ואז A
- ציון: variance בין 5 formulations

### מבחן עברית — HeQ (Hebrew Quality)
- **הבנת הנקרא:** פסקה בעברית → 5 שאלות
- **מגדר:** "הרופאה אמרה ש___" — האם ממשיך בנקבה?
- **בניין:** פעל vs. פיעל vs. הפעיל — האם בוחר נכון?
- **ניקוד:** "בַּיִת" vs. "בֵּית" — האם מבין הבדל?
- **דו-משמעות ללא ניקוד:** "ספר" (book/barber/count) — כיצד מפרש?
- ציון: X/10 לכל קטגוריה

### מבחן עומס — Load-Accuracy
- Context ארוך (80% מה-window) → שאל על פרט בהתחלה
- האם דיוק יורד? כמה?
- כמה "hallucinations" ב-10 שאלות על context ארוך?

---

## 4. לוקליזציה לישראל (Israeli Market Localization)

### תשלומים ורגולציה
- **כרטיסי אשראי מקומיים:** Visa Cal, Leumi Card, Isracard — נתמכים?
- **סליקה:** Tranzila, BridgerPay, CardCom — האם יש integration?
- **מס"ב (MASAV):** העברות בנקאיות אוטומטיות — תמיכה?
- **חשבוניות:** iCount, חשבשבת, Priority — אינטגרציה?
- **VAT:** האם ניתן לקבל חשבונית מע"מ? (לעוסק מורשה)

### רגולציה
- **חוק הגנת הפרטיות הישראלי 5741-1981** + תיקון 13 (אוגוסט 2025):
  - האם הכלי מחזיק data על ישראלים?
  - Data residency: שרתים באיזו מדינה?
  - Zero retention option?
- **חוק שירותי תשלום 5779-2019:** רלוונטי לכלים פיננסיים

### ממשק RTL
- ציון בשלות RTL: 1 (שבור) → 5 (מושלם)
  - 1: טקסט לפחות מיושר לימין
  - 3: כיוון תקין, אבל icons הפוכים
  - 5: RTL מושלם כולל dropdowns, modals, תאריכים
- **WhatsApp integration:** האם הכלי עובד טוב דרך WhatsApp Web?
- **סגנון תקשורת:** פורמלי vs. ישיר — מה מתאים לשוק הישראלי?

---

## 5. ניתוח רמות מינוי (Subscription Tiers)

פרט בדיוק מה מקבלים בכל רמה:

### Free Tier
- RPM (Requests Per Minute) — כמה?
- TPM (Tokens Per Minute) — כמה?
- RPD (Requests Per Day) — האם מוגבל?
- האם data משמשת לאימון המודל? (ברירת מחדל)
- Context window: האם מוגבל ב-Free?

### Paid Tiers
- RPM/TPM של כל tier
- **Seed parameter:** האם זמין? (להשגת תוצאות חוזרות)
- **Data training opt-out:** האם אפשרי?
- **Priority access:** בזמן עומס — האם paid users מקבלים קדימות?
- **SLA:** uptime guarantee? (99.9%? 99.99%?)

### Enterprise
- Custom rate limits
- Zero data retention (ללא שימוש לאימון)
- Data residency (שרתים באזור ספציפי)
- SSO / SAML
- Audit logs
- DPA (Data Processing Agreement) לGDPR/ישראל

---

## 6. פלט נדרש (Output Structure)

הוצא דוח בפורמט Markdown הכולל את הפרקים הבאים:

```markdown
# [שם הכלי] — דוח מחקר עמוק

## 1. Identity (זהות הכלי)
- מי בנה, מתי, גיוסים, מספר users
- positioning בשוק
- עץ המוצרים של הספק

## 2. Technical Specs (מפרט טכני)
- מודל, context window, benchmarks
- כל הפרמטרים מסעיף 1 (Micro-Feature Taxonomy)
- טבלת השוואה לחלופות

## 3. Architecture Review (ניתוח אדריכלי / API)
- endpoints זמינים
- data flow
- latency ו-throughput
- security model

## 4. Best Usage Hacks (טריקים מהנוסחה הסודית)
- undocumented triggers
- system prompt patterns
- hidden parameters
- prompts שעובדים (עם דוגמאות אמיתיות)

## 5. Hebrew & Local Rating (ציון עברי וישראלי)
- HeQ Score: X/10
- RTL Maturity: X/5
- Israeli Market Fit: X/10
- ממצאי stress tests
- המלצות ספציפיות לשוק הישראלי
```

---

## כללי זהב לשימוש בסקיל

1. **אל תאמין לשיווק** — בדוק בעצמך עם stress tests
2. **מספרים מדויקים** — תאריכים, גרסאות, מחירים עדכניים
3. **השוואה תמיד** — כל כלי מול לפחות 2 מתחרים
4. **נקודת מבט ישראלית** — תמיד כלול HeQ Score ו-Israeli Market Fit
5. **Secret Sauce** — חפש תמיד את הtricks שלא בתיעוד הרשמי
6. **דוגמאות אמיתיות** — לא תיאורי, אלא prompts ו-code שניתן להעתיק
