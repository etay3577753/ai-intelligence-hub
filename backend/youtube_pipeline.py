"""
YouTube Pipeline — Eliran Jeini Rails Shorts
Phase 1: Fetch metadata + descriptions + auto-captions via yt-dlp (free, no audio download)
Phase 2: Whisper local transcription for videos without captions
"""

import json
import os
import subprocess
import sys
import time
from pathlib import Path

# ── Paths ──────────────────────────────────────────────────────────────────
BASE_DIR   = Path(__file__).parent
DATA_DIR   = BASE_DIR / "data"
WIKI_DIR   = DATA_DIR / "wiki" / "youtube"
TEMP_DIR   = DATA_DIR / "yt_temp"
SHORTS_JSON = DATA_DIR / "shorts_list.json"

WIKI_DIR.mkdir(parents=True, exist_ok=True)
TEMP_DIR.mkdir(parents=True, exist_ok=True)

# ── Load video IDs ─────────────────────────────────────────────────────────
with open(SHORTS_JSON, encoding="utf-8") as f:
    shorts = json.load(f)

video_ids = [v["video_id"] for v in shorts]
print(f"[pipeline] Loaded {len(video_ids)} video IDs", flush=True)


def fetch_metadata(video_id: str) -> dict | None:
    """Use yt-dlp to fetch title, description, duration, captions — no download."""
    url = f"https://www.youtube.com/shorts/{video_id}"
    out_template = str(TEMP_DIR / f"{video_id}.%(ext)s")

    cmd = [
        "yt-dlp",
        "--write-info-json",        # save metadata JSON
        "--write-auto-subs",        # auto-generated captions
        "--sub-lang", "he,iw",      # Hebrew captions
        "--sub-format", "vtt",
        "--skip-download",          # no audio/video
        "--no-playlist",
        "--quiet",
        "-o", out_template,
        url,
    ]

    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
        info_file = TEMP_DIR / f"{video_id}.info.json"
        if info_file.exists():
            with open(info_file, encoding="utf-8") as f:
                return json.load(f)
    except (subprocess.TimeoutExpired, Exception) as e:
        print(f"  [!] {video_id}: {e}", flush=True)

    return None


def find_caption_file(video_id: str) -> Path | None:
    """Find .vtt caption file for a video if it exists."""
    for ext in [".he.vtt", ".iw.vtt", ".he-orig.vtt"]:
        p = TEMP_DIR / f"{video_id}{ext}"
        if p.exists():
            return p
    # try any .vtt
    for p in TEMP_DIR.glob(f"{video_id}*.vtt"):
        return p
    return None


def parse_vtt(vtt_path: Path) -> str:
    """Extract plain text from VTT caption file."""
    lines = vtt_path.read_text(encoding="utf-8", errors="replace").splitlines()
    seen = set()
    text_lines = []
    for line in lines:
        line = line.strip()
        if not line or line.startswith("WEBVTT") or "-->" in line or line.isdigit():
            continue
        if line not in seen:
            seen.add(line)
            text_lines.append(line)
    return " ".join(text_lines)


def save_wiki(video_id: str, meta: dict, caption_text: str, source: str):
    """Save enriched wiki file."""
    title       = meta.get("title", video_id)
    description = (meta.get("description") or "").strip()
    duration    = meta.get("duration", 0)
    upload_date = meta.get("upload_date", "")
    view_count  = meta.get("view_count", 0)
    like_count  = meta.get("like_count", 0)
    channel     = meta.get("channel", "אלירן גיני")
    url         = meta.get("webpage_url", f"https://www.youtube.com/shorts/{video_id}")
    tags        = meta.get("tags") or []

    dur_str = f"{duration//60}:{duration%60:02d}" if duration else "NA"
    date_str = f"{upload_date[:4]}-{upload_date[4:6]}-{upload_date[6:]}" if len(upload_date) == 8 else upload_date

    lines = [
        f"# {title}",
        f"",
        f"> **ערוץ**: {channel}  ",
        f"> **תאריך**: {date_str}  ",
        f"> **משך**: {dur_str}  ",
        f"> **צפיות**: {view_count:,}  " if view_count else f"> **צפיות**: N/A  ",
        f"> **לייקים**: {like_count:,}  " if like_count else f"> **לייקים**: N/A  ",
        f"> **מקור תמליל**: {source}  ",
        f"> **קישור**: {url}",
        f"",
    ]

    if tags:
        lines += [f"**תגיות**: {', '.join(tags[:10])}", ""]

    if description:
        lines += ["## תיאור הסרטון", "", description, ""]

    if caption_text:
        lines += ["## תמליל / כתוביות", "", caption_text, ""]
    else:
        lines += ["## תמליל", "", "_כתוביות לא נמצאו — ממתין ל-Whisper_", ""]

    wiki_path = WIKI_DIR / f"{video_id}.md"
    wiki_path.write_text("\n".join(lines), encoding="utf-8")


# ── Main loop ──────────────────────────────────────────────────────────────
processed = 0
with_captions = 0
no_captions = 0
errors = 0

BATCH_SIZE = 10  # progress print every N videos

for i, video_id in enumerate(video_ids):
    wiki_path = WIKI_DIR / f"{video_id}.md"

    # Skip if already processed (non-dry-run)
    if wiki_path.exists():
        content = wiki_path.read_text(encoding="utf-8")
        if "[DRY RUN" not in content and "מקור תמליל" in content:
            processed += 1
            continue

    meta = fetch_metadata(video_id)

    if meta is None:
        errors += 1
        # save minimal placeholder
        wiki_path.write_text(
            f"# {video_id}\n\n> **מקור תמליל**: שגיאה בגישה  \n\n_לא ניתן לגשת לסרטון_\n",
            encoding="utf-8"
        )
        if i % BATCH_SIZE == 0:
            print(f"  [{i+1}/{len(video_ids)}] {video_id} — ERROR", flush=True)
        continue

    caption_file = find_caption_file(video_id)
    if caption_file:
        caption_text = parse_vtt(caption_file)
        source = f"כתוביות אוטומטיות YouTube ({caption_file.name})"
        with_captions += 1
    else:
        caption_text = ""
        source = "ממתין ל-Whisper"
        no_captions += 1

    save_wiki(video_id, meta, caption_text, source)
    processed += 1

    if (i + 1) % BATCH_SIZE == 0 or i == len(video_ids) - 1:
        print(
            f"  [{i+1}/{len(video_ids)}] done={processed} captions={with_captions} "
            f"need_whisper={no_captions} errors={errors}",
            flush=True
        )

    time.sleep(0.3)  # polite delay

print(f"\n[pipeline] Complete!", flush=True)
print(f"  Processed : {processed}", flush=True)
print(f"  With captions: {with_captions}", flush=True)
print(f"  Need Whisper : {no_captions}", flush=True)
print(f"  Errors       : {errors}", flush=True)
print(f"\nNext step: run whisper_transcribe.py for the {no_captions} remaining videos", flush=True)

# Save status for next phase
status = {
    "total": len(video_ids),
    "processed": processed,
    "with_captions": with_captions,
    "need_whisper": no_captions,
    "errors": errors,
    "whisper_queue": [
        v for v in video_ids
        if (WIKI_DIR / f"{v}.md").exists()
        and "ממתין ל-Whisper" in (WIKI_DIR / f"{v}.md").read_text(encoding="utf-8")
    ]
}
with open(DATA_DIR / "youtube_pipeline_status.json", "w", encoding="utf-8") as f:
    json.dump(status, f, ensure_ascii=False, indent=2)
print(f"[pipeline] Status saved to youtube_pipeline_status.json", flush=True)
