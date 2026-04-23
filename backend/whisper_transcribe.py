"""
Whisper Phase — local transcription for videos without YouTube captions.
Requires: pip install openai-whisper torch
GPU: GTX 1070 Ti — uses CUDA, model large-v3
"""

import json
import subprocess
import sys
import time
from pathlib import Path

BASE_DIR  = Path(__file__).parent
DATA_DIR  = BASE_DIR / "data"
WIKI_DIR  = DATA_DIR / "wiki" / "youtube"
TEMP_DIR  = DATA_DIR / "yt_temp"
STATUS_FILE = DATA_DIR / "youtube_pipeline_status.json"

TEMP_DIR.mkdir(exist_ok=True)

# ── Load whisper queue from pipeline status ────────────────────────────────
if not STATUS_FILE.exists():
    print("[whisper] No status file found. Run youtube_pipeline.py first.", flush=True)
    sys.exit(1)

with open(STATUS_FILE, encoding="utf-8") as f:
    status = json.load(f)

queue = status.get("whisper_queue", [])
print(f"[whisper] {len(queue)} videos need transcription", flush=True)

if not queue:
    print("[whisper] Nothing to do!", flush=True)
    sys.exit(0)

# ── Load whisper model once ────────────────────────────────────────────────
try:
    import whisper
    import torch
    device = "cuda" if torch.cuda.is_available() else "cpu"
    print(f"[whisper] Loading large-v3 on {device}...", flush=True)
    model = whisper.load_model("large-v3", device=device)
    print(f"[whisper] Model loaded.", flush=True)
except ImportError:
    print("[whisper] ERROR: openai-whisper not installed.", flush=True)
    print("  Run: pip install openai-whisper torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu118", flush=True)
    sys.exit(1)


def download_audio(video_id: str) -> Path | None:
    """Download audio-only with yt-dlp."""
    audio_path = TEMP_DIR / f"{video_id}.mp3"
    if audio_path.exists():
        return audio_path

    url = f"https://www.youtube.com/shorts/{video_id}"
    cmd = [
        "yt-dlp",
        "-x", "--audio-format", "mp3",
        "--audio-quality", "5",   # 128kbps — enough for speech
        "--no-playlist", "--quiet",
        "-o", str(TEMP_DIR / f"{video_id}.%(ext)s"),
        url,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
        if audio_path.exists():
            return audio_path
    except Exception as e:
        print(f"  [!] Download failed {video_id}: {e}", flush=True)
    return None


def transcribe(audio_path: Path) -> str:
    """Run Whisper transcription, return Hebrew text."""
    result = model.transcribe(
        str(audio_path),
        language="he",
        task="transcribe",
        fp16=True,
        verbose=False,
    )
    return result["text"].strip()


def update_wiki(video_id: str, transcript: str):
    """Patch the existing wiki file with Whisper transcript."""
    wiki_path = WIKI_DIR / f"{video_id}.md"
    if not wiki_path.exists():
        wiki_path.write_text(
            f"# {video_id}\n\n## תמליל (Whisper)\n\n{transcript}\n",
            encoding="utf-8"
        )
        return

    content = wiki_path.read_text(encoding="utf-8")

    # Replace "ממתין ל-Whisper" section with actual transcript
    if "## תמליל" in content:
        lines = content.splitlines()
        new_lines = []
        skip = False
        for line in lines:
            if line.startswith("## תמליל"):
                new_lines.append("## תמליל (Whisper large-v3)")
                new_lines.append("")
                new_lines.append(transcript)
                new_lines.append("")
                skip = True
            elif skip and line.startswith("##"):
                skip = False
                new_lines.append(line)
            elif not skip:
                new_lines.append(line)
        content = "\n".join(new_lines)
    else:
        content += f"\n## תמליל (Whisper large-v3)\n\n{transcript}\n"

    # Update source label
    content = content.replace("מקור תמליל**: ממתין ל-Whisper", "מקור תמליל**: Whisper large-v3 (GPU)")

    wiki_path.write_text(content, encoding="utf-8")


# ── Main loop ──────────────────────────────────────────────────────────────
done = 0
errors = 0

for i, video_id in enumerate(queue):
    print(f"  [{i+1}/{len(queue)}] {video_id} — downloading...", flush=True)

    audio = download_audio(video_id)
    if not audio:
        errors += 1
        continue

    try:
        print(f"  [{i+1}/{len(queue)}] {video_id} — transcribing...", flush=True)
        transcript = transcribe(audio)
        update_wiki(video_id, transcript)
        done += 1

        # Clean up audio to save disk space
        audio.unlink(missing_ok=True)

        print(f"  [{i+1}/{len(queue)}] {video_id} — done ({len(transcript)} chars)", flush=True)
    except Exception as e:
        errors += 1
        print(f"  [!] {video_id}: {e}", flush=True)

print(f"\n[whisper] Complete! done={done} errors={errors}", flush=True)
