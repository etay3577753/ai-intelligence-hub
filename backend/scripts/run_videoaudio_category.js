/**
 * Video/Audio AI Tools Research Runner
 * Super-Category: HeyGen, ElevenLabs, Runway, Suno, Pika, D-ID, Veo, etc.
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = "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";
const WIKI_DIR = path.join(__dirname, "..", "data", "wiki");

const SYSTEM_PROMPT = `אתה מחקרן בכיר ב"מרכז הידע לבינה מלאכותית". אתה כותב דוחות מחקר עמוקים בעברית.

## תבנית חובה — 6 פרקים לכל דוח:
### פרק 1: תקציר טכני | ### פרק 2: סקירת ממשק | ### פרק 3: ניתוח כלכלי
### פרק 4: מבחני מאמץ (5 Stress Tests) | ### פרק 5: לוקליזציה לישראל | ### פרק 6: מסקנות
## כללים: מינימום 6000 מילים, מחירים מדויקים, עברית + (English)`;

const RESEARCH_TOPICS = [
  {
    id: "heygen-avatars",
    filename: "heygen-avatars.md",
    ecosystem: "Video/Audio",
    title: "HeyGen — וידאו AI עם אווטארים: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על HeyGen לשנת 2026 — הפלטפורמה המובילה ליצירת סרטוני וידאו AI עם avatars ו-video translation.

## נושאים לכיסוי מלא:

### מה זה HeyGen?
- מייסדים, גיוסים ($60M?), הערכה
- מוצר ליבה: text → talking avatar video
- כמה users? כמה videos generated?
- מתחרים: D-ID, Synthesia, Tavus

### Avatar Types:
- Stock avatars: כמה? diversity?
- Custom avatar: כיצד יוצרים?
- Instant avatar (selfie → avatar)
- Photo avatar
- Interactive avatar (real-time)
- Streaming avatar (API)

### Video Translation:
- Video Translate: upload video → translate to 175+ languages
- lip sync quality
- voice cloning during translation
- Hebrew support!

### Streaming Avatar API:
- latency: כמה ms לתגובה?
- use cases: customer service, tutoring
- SDK: JavaScript, Python
- pricing per minute

### HeyGen 2.0 Features:
- Video workflows
- Template library
- Brand kit
- Team collaboration

### Pricing:
- Free: 1 credit/mo
- Creator ($24/mo): 15 credits
- Business ($72/mo): 30 credits
- Enterprise: custom
- מה זה credit? כמה דקות?

### Quality Assessment:
- video resolution: 1080p? 4K?
- lip sync accuracy
- emotion range
- common artifacts

### Hebrew/RTL:
- עברית ב-text-to-speech
- avatar speaking Hebrew
- lip sync בעברית
- RTL text in video

### D-ID (ישראלי!) vs. HeyGen:
- D-ID מבית ישראל: מה היתרון?
- pricing comparison
- quality comparison
- enterprise features

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "elevenlabs-voice",
    filename: "elevenlabs-voice.md",
    ecosystem: "Video/Audio",
    title: "ElevenLabs — Text-to-Speech ו-Voice Cloning: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על ElevenLabs לשנת 2026 — הפלטפורמה המובילה ל-text-to-speech, voice cloning ו-audio AI.

## נושאים לכיסוי מלא:

### מה זה ElevenLabs?
- מייסדים: Mati Staniszewski + Piotr Dabkowski
- גיוסים: $180M Series B (2024), הערכה $3B+
- מוצרים: TTS, Voice Cloning, Dubbing, Sound Effects, Music
- כמה voices? כמה languages?

### Text-to-Speech:
- מודלים: eleven_multilingual_v2, eleven_turbo_v2.5, eleven_flash_v2.5
- latency: turbo vs. standard
- emotions ו-prosody control
- SSML support
- streaming audio

### Voice Cloning:
- Instant Clone: כמה שניות שמע צריך?
- Professional Clone: כמה שעות שמע?
- Voice Design (ללא שמע מקור)
- voice settings: stability, similarity, style

### ElevenLabs Studio:
- long-form audio production
- chapter navigation
- pronunciation dictionary
- AI dubbing

### Dubbing:
- Video Dubbing: upload → translate → dub
- lip sync
- speaker detection
- Hebrew dubbing quality

### Sound Effects:
- text → sound effect
- use cases: games, podcasts, films
- pricing

### API:
- endpoints: /text-to-speech, /voice-clone, /dubbing
- WebSocket streaming
- SDK: Python, JavaScript
- rate limits per tier

### Pricing:
- Free: 10K chars/mo
- Starter ($5/mo): 30K chars
- Creator ($22/mo): 100K chars
- Pro ($99/mo): 500K chars
- Scale ($330/mo): 2M chars
- Business ($1320/mo): 10M chars

### עברית:
- עברית TTS quality
- Hebrew voice cloning
- Israeli accent support
- RTL text input

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "runway-video",
    filename: "runway-video.md",
    ecosystem: "Video/Audio",
    title: "Runway — Video Generation AI: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Runway לשנת 2026 — הפלטפורמה המובילה לגנרציית וידאו AI לאמנים וסטודיות.

## נושאים לכיסוי מלא:

### Runway מוצרים:
- Gen-3 Alpha: text/image → video
- Gen-3 Alpha Turbo: מהיר יותר, זול יותר
- Image-to-Video
- Video-to-Video (style transfer)
- Inpainting / Outpainting
- Act-One (character animation)
- Motion Brush

### Gen-3 Alpha vs. Gen-2:
- quality improvements
- length: כמה שניות?
- resolution: 1080p? 4K?
- motion quality
- consistency

### Creative Controls:
- Motion Brush: כוון תנועה ספציפית
- Camera controls: pan, zoom, dolly
- Style reference images
- Director Mode

### Pricing:
- Free: 125 credits
- Standard ($15/mo): 625 credits/mo
- Pro ($35/mo): 2250 credits/mo
- Unlimited ($95/mo): unlimited
- Enterprise: custom
- מה זה credit? כמה שניות?

### Competitors:
- vs. Sora (OpenAI)
- vs. Veo 3.1 (Google)
- vs. Kling AI
- vs. Pika Labs

### Use Cases:
- film / TV production
- advertising
- social media content
- game cinematic

### API:
- endpoints
- pricing per generation
- SDK availability

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "suno-music",
    filename: "suno-music.md",
    ecosystem: "Video/Audio",
    title: "Suno — יצירת מוזיקה מ-prompt: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על Suno לשנת 2026 — הפלטפורמה המובילה ליצירת שירים מלאים מ-text prompts.

## נושאים לכיסוי מלא:

### מה זה Suno?
- text prompt → complete song (vocals + instruments)
- גרסה נוכחית: v4? v4.5?
- כמה songs generated?
- lawsuit status: RIAA lawsuit

### יכולות:
- Custom lyrics vs. AI lyrics
- Genre/style control
- Instrumental mode (ללא שירה)
- Covers / remixes
- Song extension (continue song)
- Personas (AI artists)

### v4 Improvements:
- audio quality: 192kHz? 320kbps?
- song length: כמה דקות?
- voice quality
- instrument separation

### Pricing:
- Free: 50 credits/day
- Pro ($8/mo): 2500 credits/mo
- Premier ($24/mo): 10000 credits/mo
- מה זה credit? כמה שירים?
- Commercial rights

### Hebrew Music:
- עברית שירה
- mizrahi music style
- Israeli music genres
- quality comparison

### Competitors:
- vs. Udio
- vs. Stable Audio
- vs. MusicGen (Meta, open source)

### Legal:
- RIAA lawsuit status
- Copyright of generated music
- Commercial use rights
- Training data controversy

עמוד על כל 6 פרקי התבנית.`
  },
  {
    id: "did-israeli",
    filename: "did-israeli.md",
    ecosystem: "Video/Audio",
    title: "D-ID — פלטפורמת ה-AI Video הישראלית: מחקר מקיף",
    prompt: `בצע מחקר עמוק ומקיף על D-ID לשנת 2026 — חברת AI video ישראלית (תל אביב) עם photo animation ו-talking avatars.

## נושאים לכיסוי מלא:

### D-ID כחברה ישראלית:
- מייסדים ישראלים: מי?
- משרדים: תל אביב + ניו יורק
- גיוסים: כמה? ממי?
- הערכה
- clients: מי משתמש?

### מוצרים:
**Creative Reality Studio:**
- photo → talking video
- text script → avatar speaks
- voice: ElevenLabs integration?
- background removal/replacement

**D-ID Agents:**
- interactive AI avatar agents
- real-time conversation
- customer service avatars
- HR interviewing avatars
- sales avatars

**Video Translate:**
- translate video to other languages
- lip sync
- vs. HeyGen Video Translate

### Hebrew Advantage:
- עברית ראשונה / מקומית
- תמיכה מובנית בעברית
- lip sync עברי
- RTL support
- ישראלי dialect

### API:
- /talks endpoint
- /clips endpoint (agents)
- streaming support
- pricing per minute

### Pricing:
- Free: 20 credits
- Lite ($6/mo): 10 videos
- Pro ($36/mo): 100 videos
- Advanced ($96/mo): 300 videos
- Enterprise

### Competitive Position:
- D-ID vs. HeyGen — מי מוביל?
- unique Israeli angle
- B2B vs. B2C focus

עמוד על כל 6 פרקי התבנית עם דגש מיוחד על ישראל.`
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

  console.log(`\n🎬 מריץ ${topics.length} מחקרים — Video/Audio AI Tools\n`);

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

  console.log("\n🏁 סיום Video/Audio!\n");
}

main();
