"""
Fix VTT parsing — re-parse already-downloaded .vtt files and update wiki files.
No network access needed — everything is already in yt_temp/.
"""

import re
import json
from pathlib import Path

BASE_DIR = Path(__file__).parent
DATA_DIR = BASE_DIR / "data"
WIKI_DIR = DATA_DIR / "wiki" / "youtube"
TEMP_DIR = DATA_DIR / "yt_temp"


def parse_vtt_clean(vtt_path: Path) -> str:
    """Parse VTT properly: strip timestamps, dedup, return clean Hebrew text."""
    raw = vtt_path.read_text(encoding="utf-8", errors="replace")

    # Remove inline timestamp tags like <00:00:01.360><c> and </c>
    raw = re.sub(r"<\d+:\d+:\d+\.\d+>", "", raw)
    raw = re.sub(r"</?c>", "", raw)

    lines = raw.splitlines()
    seen = set()
    text_lines = []

    for line in lines:
        line = line.strip()
        # Skip: empty, WEBVTT header, Kind/Language meta, timestamp lines, numeric cue IDs
        if not line:
            continue
        if line.startswith("WEBVTT") or line.startswith("Kind:") or line.startswith("Language:"):
            continue
        if re.match(r"^\d{2}:\d{2}:\d{2}", line):  # timestamp line
            continue
        if re.match(r"^\d+$", line):  # cue number
            continue
        # Deduplicate (VTT rolls over accumulated text)
        if line not in seen:
            seen.add(line)
            text_lines.append(line)

    # Join with space, collapse multiple spaces
    text = " ".join(text_lines)
    text = re.sub(r" {2,}", " ", text).strip()
    return text


def update_wiki_transcript(wiki_path: Path, clean_text: str, vtt_name: str):
    content = wiki_path.read_text(encoding="utf-8")

    # Replace everything from "## תמליל" section onwards with clean text
    if "## תמליל" in content:
        before = content[:content.index("## תמליל")]
        # Find next section after transcript (if any)
        after_match = re.search(r"\n## ", content[content.index("## תמליל") + 10:])
        after = ""
        if after_match:
            after = "\n" + content[content.index("## תמליל") + 10 + after_match.start():]

        new_content = (
            before
            + f"## תמליל / כתוביות\n\n{clean_text}\n"
            + after
        )
    else:
        new_content = content + f"\n## תמליל / כתוביות\n\n{clean_text}\n"

    wiki_path.write_text(new_content, encoding="utf-8")


# ── Main ───────────────────────────────────────────────────────────────────
fixed = 0
skipped = 0

for vtt_file in TEMP_DIR.glob("*.vtt"):
    video_id = vtt_file.stem.split(".")[0]
    wiki_path = WIKI_DIR / f"{video_id}.md"

    if not wiki_path.exists():
        skipped += 1
        continue

    clean_text = parse_vtt_clean(vtt_file)
    if not clean_text:
        skipped += 1
        continue

    update_wiki_transcript(wiki_path, clean_text, vtt_file.name)
    fixed += 1

print(f"Fixed: {fixed} | Skipped: {skipped}")

# Show sample
sample_vtt = next(TEMP_DIR.glob("*.vtt"), None)
if sample_vtt:
    vid = sample_vtt.stem.split(".")[0]
    print(f"\nSample ({vid}):")
    print(parse_vtt_clean(sample_vtt)[:400])
