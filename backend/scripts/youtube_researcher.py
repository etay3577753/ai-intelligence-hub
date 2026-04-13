"""
youtube_researcher.py — YouTube Channel Intelligence Ingester
=============================================================
מושך סרטונים מערוץ של אלירן גיני → מחלץ תמלילים → מסכם עם AI
→ שומר כקבצי wiki ב-backend/data/wiki/youtube/

שימוש:
    python youtube_researcher.py                       # RSS (15 אחרונים)
    python youtube_researcher.py --source shorts       # כל ה-Shorts (308)
    python youtube_researcher.py --source all          # RSS + Shorts
    python youtube_researcher.py --limit 20            # מקסימום
    python youtube_researcher.py --video VIDEO_ID      # סרטון בודד
    python youtube_researcher.py --dry-run             # ללא AI
    python youtube_researcher.py --force               # חוקר מחדש קיימים
    python youtube_researcher.py --offset 50 --limit 50  # batch 50-100

דרישות:
    pip install youtube-transcript-api yt-dlp python-dotenv
"""

import argparse
import json
import os
import sys
import time
import xml.etree.ElementTree as ET
from datetime import datetime
from pathlib import Path

# Fix Windows console encoding (Hebrew + emoji support)
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ── Load .env ─────────────────────────────────────────────────────────────────
try:
    from dotenv import load_dotenv
    load_dotenv(dotenv_path=Path(__file__).resolve().parents[2] / ".env")
except ImportError:
    pass

# ── Paths & Config ────────────────────────────────────────────────────────────
ROOT         = Path(__file__).resolve().parents[2]
WIKI_DIR     = ROOT / "backend" / "data" / "wiki" / "youtube"
LOG_PATH     = ROOT / "backend" / "data" / "youtube_research_log.json"
SHORTS_LIST  = ROOT / "backend" / "data" / "shorts_list.json"

WIKI_DIR.mkdir(parents=True, exist_ok=True)

CHANNEL_ID   = "UCOdE5_ctQ2FOTf93f7AGBEQ"
CHANNEL_NAME = "אלירן גיני"
RSS_URL      = f"https://www.youtube.com/feeds/videos.xml?channel_id={CHANNEL_ID}"

ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
GEMINI_KEY    = os.getenv("GEMINI_API_KEY", "")

# Delays — longer for bulk Shorts to avoid YouTube IP blocks
RSS_DELAY    = 2.0   # seconds between videos (small batches)
SHORTS_DELAY = 6.0   # seconds between videos (bulk — reduces IP blocks)

# Transcript retry settings
TRANSCRIPT_RETRIES    = 2    # retries per video when IP-blocked
TRANSCRIPT_RETRY_WAIT = 5.0  # seconds between retries on IP block
IP_BLOCK_THRESHOLD    = 3    # after N consecutive IP blocks → skip transcripts for run

# ── Source: RSS Feed ──────────────────────────────────────────────────────────
def fetch_rss_videos() -> list[dict]:
    """Fetch last 15 videos from channel RSS feed."""
    import urllib.request

    print(f"📡 RSS feed: {CHANNEL_NAME}...")
    req = urllib.request.Request(RSS_URL, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as resp:
        xml_data = resp.read()

    ns = {
        "atom":  "http://www.w3.org/2005/Atom",
        "yt":    "http://www.youtube.com/xml/schemas/2015",
        "media": "http://search.yahoo.com/mrss/",
    }
    root = ET.fromstring(xml_data)
    videos = []
    for entry in root.findall("atom:entry", ns):
        video_id  = entry.findtext("yt:videoId", namespaces=ns)
        title     = entry.findtext("atom:title", namespaces=ns)
        link_el   = entry.find("atom:link", ns)
        url       = link_el.attrib.get("href", "") if link_el is not None else ""
        published = (entry.findtext("atom:published", namespaces=ns, default="") or "")[:10]
        if video_id:
            videos.append({
                "video_id":  video_id,
                "title":     title or video_id,
                "url":       url or f"https://www.youtube.com/watch?v={video_id}",
                "published": published,
                "source":    "rss",
            })

    print(f"   נמצאו {len(videos)} סרטונים ב-RSS")
    return videos


# ── Source: Shorts List (pre-fetched by yt-dlp) ───────────────────────────────
def fetch_shorts_videos() -> list[dict]:
    """Load pre-fetched Shorts list from shorts_list.json."""
    if not SHORTS_LIST.exists():
        print("⚠️  shorts_list.json לא נמצא — מריץ yt-dlp...")
        refresh_shorts_list()

    data = json.loads(SHORTS_LIST.read_text(encoding="utf-8"))
    videos = []
    for v in data:
        video_id = v.get("video_id", "")
        if not video_id:
            continue
        videos.append({
            "video_id":  video_id,
            "title":     v.get("title", video_id),
            "url":       f"https://www.youtube.com/shorts/{video_id}",
            "published": v.get("published", ""),
            "source":    "shorts",
        })

    print(f"📦 נטענו {len(videos)} Shorts מ-shorts_list.json")
    return videos


def refresh_shorts_list() -> None:
    """Re-run yt-dlp to refresh the Shorts list."""
    import subprocess
    print("📡 מרענן רשימת Shorts עם yt-dlp (זה עשוי לקחת דקה)...")
    result = subprocess.run(
        ["python", "-m", "yt_dlp", "--flat-playlist",
         "--print", "%(id)s|||%(title)s|||%(upload_date)s",
         f"https://www.youtube.com/channel/{CHANNEL_ID}/shorts"],
        capture_output=True, encoding="utf-8", errors="replace",
    )
    lines = [l.strip() for l in result.stdout.splitlines() if "|||" in l]
    entries = []
    for l in lines:
        parts = l.split("|||")
        vid_id    = parts[0].strip()
        title     = parts[1].strip() if len(parts) > 1 else vid_id
        published = parts[2].strip()[:10] if len(parts) > 2 and parts[2].strip() else ""
        if vid_id:
            entries.append({"video_id": vid_id, "title": title, "published": published})

    SHORTS_LIST.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"✅ נשמרו {len(entries)} Shorts ל-{SHORTS_LIST.name}")


# ── Global IP block state ─────────────────────────────────────────────────────
_consecutive_ip_blocks = 0
_ip_blocked_globally   = False


# ── Transcript Extraction ─────────────────────────────────────────────────────
def fetch_transcript(video_id: str) -> tuple[str, str]:
    """
    Fetch Hebrew transcript (manual → auto-generated), then English fallback.
    Tracks consecutive IP blocks — after IP_BLOCK_THRESHOLD blocks, skips all
    further transcript attempts for this run (title-only mode).
    Returns (transcript_text, language_label).
    """
    global _consecutive_ip_blocks, _ip_blocked_globally

    if _ip_blocked_globally:
        return "", "IP חסום (כותרת בלבד)"

    try:
        from youtube_transcript_api import YouTubeTranscriptApi
        from youtube_transcript_api._errors import NoTranscriptFound, TranscriptsDisabled
    except ImportError:
        sys.exit("❌ youtube-transcript-api לא מותקן.\n   pip install youtube-transcript-api")

    api = YouTubeTranscriptApi()

    for attempt in range(1, TRANSCRIPT_RETRIES + 1):
        try:
            transcript_list = api.list(video_id)

            # Priority: manual Hebrew → auto Hebrew → manual English → auto English
            for lang_codes, label in [
                (["he", "iw"], "עברית"),
                (["en"],       "אנגלית"),
            ]:
                try:
                    t = transcript_list.find_manually_created_transcript(lang_codes)
                    text = " ".join(s.text for s in t.fetch())
                    _consecutive_ip_blocks = 0   # reset on success
                    return text, label
                except Exception:
                    pass
                try:
                    t = transcript_list.find_generated_transcript(lang_codes)
                    text = " ".join(s.text for s in t.fetch())
                    _consecutive_ip_blocks = 0
                    return text, f"{label} (אוטומטי)"
                except Exception:
                    pass

            # Absolute fallback
            for t in transcript_list:
                text = " ".join(s.text for s in t.fetch())
                _consecutive_ip_blocks = 0
                return text, getattr(t, "language_code", "לא ידוע")

        except TranscriptsDisabled:
            _consecutive_ip_blocks = 0
            return "", "אין כתוביות"
        except NoTranscriptFound:
            _consecutive_ip_blocks = 0
            return "", "לא נמצא תמליל"
        except Exception as e:
            err_msg = str(e)
            is_ip_block = any(k in err_msg for k in
                              ("blocking", "IP", "429", "Too Many", "blocked", "RequestBlocked"))
            if is_ip_block:
                _consecutive_ip_blocks += 1
                if _consecutive_ip_blocks >= IP_BLOCK_THRESHOLD:
                    _ip_blocked_globally = True
                    print(f"   🚫 {IP_BLOCK_THRESHOLD} חסימות רצופות — מדלג על תמלילים לשאר הריצה")
                    return "", "IP חסום (כותרת בלבד)"
                wait = TRANSCRIPT_RETRY_WAIT * attempt
                print(f"   ⏳ YouTube חסם IP — ממתין {wait:.0f}s (ניסיון {attempt}/{TRANSCRIPT_RETRIES})...")
                time.sleep(wait)
                continue
            _consecutive_ip_blocks = 0
            return "", f"שגיאה: {e}"

    _consecutive_ip_blocks += 1
    if _consecutive_ip_blocks >= IP_BLOCK_THRESHOLD:
        _ip_blocked_globally = True
        print(f"   🚫 עובר למצב כותרת-בלבד לשאר הריצה")
    return "", "נחסם על ידי YouTube"


# ── AI Summarization ──────────────────────────────────────────────────────────
SYSTEM_PROMPT = """אתה מנתח תוכן AI מומחה לערוץ של אלירן גיני — יוצר תוכן עברי שמתמחה ב-Claude AI, Vibe Coding ו-Claude Code.

המשימה: לסכם כל סרטון לפי תבנית קבועה שתשמש כבסיס ידע למנוע ההמלצות.

כללים:
- ענה בעברית בלבד (מונחים טכניים — השאר באנגלית)
- התמקד בכלים, טכניקות ותובנות שניתן לפעול לפיהן
- אם אין תמליל — ענה לפי הכותרת בלבד
- לסרטון Short (< 60 שניות) — עצור אחרי 3 תובנות"""


def build_summary_prompt(title: str, transcript: str, lang: str, url: str) -> str:
    has_transcript = bool(transcript.strip())
    transcript_section = (
        f"## תמליל ({lang}):\n{transcript[:6000]}\n{'...[נקצר]' if len(transcript) > 6000 else ''}"
        if has_transcript
        else "## תמליל: אין תמליל זמין — סכם לפי הכותרת בלבד"
    )
    return f"""סכם את הסרטון הבא לפי התבנית:

## פרטי הסרטון:
- **כותרת**: {title}
- **קישור**: {url}
- **שפת תמליל**: {lang}

{transcript_section}

## תבנית פלט (Markdown):

### תקציר מנהלים
[2-3 משפטים קצרים]

### כלים שהוזכרו
[רשימת כלים עם הקשר — אם אין: "לא הוזכרו כלים ספציפיים"]

### טכניקות ותובנות מפתח
[עד 5 bullets עם תובנות קונקרטיות]

### Prompts ודוגמאות
[prompts ספציפיים מהסרטון — אם אין: "לא הוצגו prompts ספציפיים"]

### רלוונטיות למנוע ההמלצות
[כיצד הידע יכול לשפר המלצות כלים — 1-2 משפטים]

### רמת מורכבות
[מתחיל / בינוני / מתקדם]

### סוג תוכן
[Short / סרטון מלא / מדריך / ביקורת כלי / אחר]"""


def call_claude(prompt: str) -> str:
    import urllib.request
    payload = json.dumps({
        "model": "claude-sonnet-4-6",
        "max_tokens": 2048,
        "system": SYSTEM_PROMPT,
        "messages": [{"role": "user", "content": prompt}],
    }).encode()
    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages", data=payload,
        headers={
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        }, method="POST",
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = json.loads(resp.read())
    return data["content"][0]["text"]


def call_gemini(prompt: str) -> str:
    import urllib.request, urllib.error
    url = (
        f"https://generativelanguage.googleapis.com/v1beta/models/"
        f"gemini-2.5-flash:generateContent?key={GEMINI_KEY}"
    )
    payload = json.dumps({
        "system_instruction": {"parts": [{"text": SYSTEM_PROMPT}]},
        "contents": [{"role": "user", "parts": [{"text": prompt}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 2048},
    }).encode()
    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json"}, method="POST"
    )
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = json.loads(resp.read())
    return data["candidates"][0]["content"]["parts"][0]["text"]


def summarize(prompt: str, dry_run: bool = False) -> tuple[str, str]:
    """Returns (summary_text, model_used). Retries on 429 with backoff."""
    if dry_run:
        return "[DRY RUN — סיכום לא נוצר]", "dry-run"

    if ANTHROPIC_KEY:
        try:
            return call_claude(prompt), "claude-sonnet-4-6"
        except Exception as e:
            print(f"   ⚠️  Claude נכשל: {e}")

    if GEMINI_KEY:
        import urllib.error
        for attempt in range(1, 5):   # up to 4 attempts
            try:
                return call_gemini(prompt), "gemini-2.5-flash"
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    wait = 65 * attempt   # 65s / 130s / 195s / 260s
                    print(f"   ⏳ Gemini rate-limit (429) — ממתין {wait}s (ניסיון {attempt}/4)...")
                    time.sleep(wait)
                    continue
                elif e.code in (500, 503):
                    wait = 15 * attempt
                    print(f"   ⏳ Gemini {e.code} — ממתין {wait}s (ניסיון {attempt}/4)...")
                    time.sleep(wait)
                    continue
                raise
            except Exception as e:
                if "429" in str(e) or "quota" in str(e).lower() or "rate" in str(e).lower():
                    wait = 65 * attempt
                    print(f"   ⏳ Gemini quota — ממתין {wait}s (ניסיון {attempt}/4)...")
                    time.sleep(wait)
                    continue
                raise
        raise RuntimeError("Gemini rate limit — כל הניסיונות נכשלו")

    raise RuntimeError("לא הוגדר מפתח API (ANTHROPIC_API_KEY או GEMINI_API_KEY)")


# ── Save Wiki File ─────────────────────────────────────────────────────────────
WIKI_TEMPLATE = """# סרטון: {title}

> **ערוץ**: {channel}
> **קישור**: {url}
> **תאריך פרסום**: {published}
> **תאריך מחקר**: {researched}
> **Video ID**: `{video_id}`
> **שפת תמליל**: {lang}
> **מודל AI לסיכום**: {model}
> **מקור**: {source}

---

{summary}

---

*קובץ זה נוצר אוטומטית על ידי `youtube_researcher.py` — AI Intelligence Hub*
"""


def save_wiki(video: dict, summary: str, lang: str, model: str) -> Path:
    video_id = video["video_id"]
    out_path = WIKI_DIR / f"{video_id}.md"
    content  = WIKI_TEMPLATE.format(
        title      = video["title"],
        channel    = CHANNEL_NAME,
        url        = video["url"],
        published  = video.get("published", ""),
        researched = datetime.now().strftime("%Y-%m-%d %H:%M"),
        video_id   = video_id,
        lang       = lang,
        model      = model,
        source     = video.get("source", ""),
        summary    = summary,
    )
    out_path.write_text(content, encoding="utf-8")
    return out_path


# ── Log ───────────────────────────────────────────────────────────────────────
def load_log() -> dict:
    if LOG_PATH.exists():
        try:
            return json.loads(LOG_PATH.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"processed": {}}


def save_log(log: dict) -> None:
    LOG_PATH.write_text(json.dumps(log, ensure_ascii=False, indent=2), encoding="utf-8")


# ── Process One Video ─────────────────────────────────────────────────────────
def process_video(
    video: dict,
    dry_run: bool = False,
    log: dict | None = None,
    index: int = 0,
    total: int = 0,
) -> dict:
    video_id = video["video_id"]
    title    = video["title"]
    url      = video["url"]
    progress = f"[{index}/{total}]" if total else ""

    print(f"\n{progress} ▶  {title[:60]}")
    print(f"   ID: {video_id}  |  {video.get('source','')}")

    # 1. Transcript
    transcript, lang = fetch_transcript(video_id)
    if transcript:
        word_count = len(transcript.split())
        print(f"   ✅ תמליל: {word_count} מילים ({lang})")
    else:
        print(f"   ⚠️  ללא תמליל: {lang}")

    # 2. AI summarize
    prompt = build_summary_prompt(title, transcript, lang, url)
    try:
        summary, model = summarize(prompt, dry_run=dry_run)
        print(f"   🤖 סוכם: {model} ({len(summary)} תווים)")
    except Exception as e:
        print(f"   ❌ שגיאת AI: {e}")
        entry = {
            "video_id": video_id, "title": title,
            "status": "error", "error": str(e),
            "timestamp": datetime.now().isoformat(),
        }
        if log is not None:
            log["processed"][video_id] = entry
        return entry

    # 3. Save wiki
    out_path = save_wiki(video, summary, lang, model)
    print(f"   💾 {out_path.name}")

    entry = {
        "video_id":  video_id,
        "title":     title,
        "status":    "success",
        "lang":      lang,
        "model":     model,
        "source":    video.get("source", ""),
        "file":      str(out_path),
        "timestamp": datetime.now().isoformat(),
    }
    if log is not None:
        log["processed"][video_id] = entry
    return entry


# ── CLI ───────────────────────────────────────────────────────────────────────
def parse_args():
    p = argparse.ArgumentParser(
        description="YouTube Channel Intelligence Ingester — אלירן גיני",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
מקורות:
  rss     — 15 סרטונים אחרונים מ-RSS feed (ברירת מחדל)
  shorts  — כל ה-Shorts מ-shorts_list.json (308 סרטונים)
  all     — RSS + Shorts

דוגמאות:
  python youtube_researcher.py --source shorts --limit 50
  python youtube_researcher.py --source shorts --offset 50 --limit 50
  python youtube_researcher.py --source all
  python youtube_researcher.py --video VIDEO_ID
  python youtube_researcher.py --source shorts --dry-run --limit 3
  python youtube_researcher.py --source shorts --force --limit 10
  python youtube_researcher.py --refresh-shorts   # עדכן רשימת Shorts מ-yt-dlp
        """,
    )
    p.add_argument("--source",          choices=["rss", "shorts", "all"], default="rss")
    p.add_argument("--video",           type=str,  help="Video ID ספציפי")
    p.add_argument("--limit",           type=int,  help="מקסימום סרטונים")
    p.add_argument("--offset",          type=int,  default=0, help="דלג על N ראשונים")
    p.add_argument("--dry-run",         action="store_true")
    p.add_argument("--force",           action="store_true", help="חוקר מחדש גם קיימים")
    p.add_argument("--refresh-shorts",  action="store_true", help="רענן shorts_list.json עם yt-dlp")
    p.add_argument("--retry-errors",    action="store_true", help="נקה entries כושלים וחוקר מחדש רק אותם")
    p.add_argument("--delay",           type=float, default=None, help="שניות בין בקשות")
    return p.parse_args()


def main():
    args = parse_args()
    log  = load_log()

    # Refresh shorts list if requested
    if args.refresh_shorts:
        refresh_shorts_list()
        if not args.video and not args.source:
            return

    # --retry-errors: clear failed entries so they get re-processed
    if args.retry_errors:
        failed_ids = [vid for vid, entry in log["processed"].items()
                      if entry.get("status") == "error"]
        for vid in failed_ids:
            del log["processed"][vid]
        save_log(log)
        print(f"🔄 נוקו {len(failed_ids)} entries כושלים מהלוג — יחוקרו מחדש")

    # ── Build video list ──
    if args.video:
        videos = [{
            "video_id":  args.video,
            "title":     args.video,
            "url":       f"https://www.youtube.com/watch?v={args.video}",
            "published": "",
            "source":    "manual",
        }]
        delay = args.delay or RSS_DELAY
    elif args.source == "shorts":
        videos = fetch_shorts_videos()
        delay  = args.delay or SHORTS_DELAY
    elif args.source == "all":
        rss    = fetch_rss_videos()
        shorts = fetch_shorts_videos()
        # Merge, deduplicate by video_id (RSS takes priority for metadata)
        seen   = {v["video_id"] for v in rss}
        extra  = [v for v in shorts if v["video_id"] not in seen]
        videos = rss + extra
        delay  = args.delay or SHORTS_DELAY
        print(f"   סה\"כ ייחודיים: {len(videos)}")
    else:
        videos = fetch_rss_videos()
        delay  = args.delay or RSS_DELAY

    # ── Filter already processed ──
    if not args.force:
        before  = len(videos)
        videos  = [v for v in videos if v["video_id"] not in log["processed"]]
        skipped = before - len(videos)
        if skipped:
            print(f"   ⏭  דולג על {skipped} שכבר נחקרו (--force לחזרה)")

    # ── Apply offset + limit ──
    if args.offset:
        videos = videos[args.offset:]
    if args.limit:
        videos = videos[:args.limit]

    if not videos:
        print("\n✅ אין סרטונים חדשים לעיבוד.")
        return

    # ── Validate API keys ──
    if not args.dry_run and not ANTHROPIC_KEY and not GEMINI_KEY:
        print("\n⚠️  לא הוגדרו מפתחות API!")
        print("   הוסף ל-.env: ANTHROPIC_API_KEY=... או GEMINI_API_KEY=...")
        sys.exit(1)

    already_done = len(log["processed"])
    print(f"\n{'='*60}")
    print(f"🎬 YouTube Researcher — {CHANNEL_NAME}")
    print(f"📦 לעיבוד: {len(videos)}  |  כבר נחקרו: {already_done}")
    print(f"⏱  השהיה: {delay}s בין סרטונים")
    print(f"💾 שמירה ב: {WIKI_DIR}")
    if args.dry_run:
        print("🧪 DRY RUN")
    print(f"{'='*60}")

    results   = []
    total     = len(videos)
    for i, video in enumerate(videos, 1):
        entry = process_video(video, dry_run=args.dry_run, log=log, index=i, total=total)
        results.append(entry)
        save_log(log)   # persist after every video — never lose progress

        if i < total and not args.dry_run:
            time.sleep(delay)

    # ── Final summary ──
    success  = sum(1 for r in results if r["status"] == "success")
    errors   = sum(1 for r in results if r["status"] == "error")
    no_sub   = sum(1 for r in results
                   if r.get("lang", "").startswith(("אין", "לא", "נחסם", "שגיאה")))

    print(f"\n{'='*60}")
    print(f"✅ הצלחות: {success}  |  ❌ שגיאות: {errors}  |  ⚠️  ללא כתוביות: {no_sub}")
    print(f"📊 סה\"כ נחקרו עד עכשיו: {len(log['processed'])}")
    print(f"📋 לוג: {LOG_PATH.name}")
    print(f"📁 Wiki: {WIKI_DIR}")
    print(f"{'='*60}\n")


if __name__ == "__main__":
    main()
