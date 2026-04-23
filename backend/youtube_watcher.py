"""
Content Watcher — polls Eliran Giny's channels for new videos.
Run manually or via scheduled task.
Checks: YouTube, Facebook, Instagram (via yt-dlp).
Posts notification to backend API when new content found.
"""

import json
import subprocess
import sys
import requests
from datetime import datetime
from pathlib import Path

BASE_DIR   = Path(__file__).parent
DATA_DIR   = BASE_DIR / "data"
STATE_FILE = DATA_DIR / "watcher_state.json"
API_BASE   = "http://localhost:8000/api"

# ── Sources to watch ───────────────────────────────────────────────────────
SOURCES = [
    {
        "name": "אלירן גיני — YouTube",
        "source": "youtube",
        "url": "https://www.youtube.com/@EliranGiny/shorts",
        "id_field": "id",
    },
    {
        "name": "אלירן גיני — Facebook",
        "source": "facebook",
        "url": "https://www.facebook.com/eliran.giny",
        "id_field": "id",
    },
    {
        "name": "אלירן גיני — Instagram",
        "source": "instagram",
        "url": "https://www.instagram.com/eliran.giny/",
        "id_field": "id",
    },
]


def load_state() -> dict:
    if not STATE_FILE.exists():
        return {"seen_ids": []}
    with open(STATE_FILE, encoding="utf-8") as f:
        return json.load(f)


def save_state(state: dict):
    with open(STATE_FILE, "w", encoding="utf-8") as f:
        json.dump(state, f, ensure_ascii=False, indent=2)


def fetch_latest(url: str, max_entries: int = 10) -> list[dict]:
    """Use yt-dlp to get latest N video entries from a channel."""
    cmd = [
        "yt-dlp",
        "--flat-playlist",
        "--playlist-end", str(max_entries),
        "--print", "%(id)s\t%(title)s\t%(url)s\t%(description)s",
        "--no-warnings", "--quiet",
        url,
    ]
    try:
        result = subprocess.run(cmd, capture_output=True, text=True,
                                timeout=60, encoding="utf-8", errors="replace")
        entries = []
        for line in result.stdout.strip().splitlines():
            parts = line.split("\t", 3)
            if len(parts) >= 2:
                entries.append({
                    "id": parts[0],
                    "title": parts[1],
                    "url": parts[2] if len(parts) > 2 else "",
                    "description": parts[3][:200] if len(parts) > 3 else "",
                })
        return entries
    except Exception as e:
        print(f"  [watcher] fetch error for {url}: {e}", flush=True)
        return []


def post_notification(source: str, title: str, description: str,
                      video_id: str, url: str):
    payload = {
        "type": "new_video",
        "source": source,
        "title": f"סרטון חדש: {title}",
        "description": description[:200] if description else f"סרטון חדש על Rails מ-{source}",
        "video_id": video_id,
        "url": url,
    }
    try:
        r = requests.post(f"{API_BASE}/notifications", json=payload, timeout=5)
        if r.status_code == 200:
            print(f"  [watcher] notification posted: {title[:50]}", flush=True)
        else:
            print(f"  [watcher] notification failed: {r.status_code}", flush=True)
    except Exception as e:
        # Backend might not be running — save locally as fallback
        print(f"  [watcher] API unavailable, saving locally: {e}", flush=True)
        _save_local_notification(payload)


def _save_local_notification(payload: dict):
    notifs_file = DATA_DIR / "notifications.json"
    try:
        with open(notifs_file, encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        data = {"notifications": []}
    notif = {
        "id": f"notif_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        **payload,
        "created_at": datetime.now().isoformat(),
        "read": False,
    }
    data["notifications"].insert(0, notif)
    with open(notifs_file, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


# ── Main ───────────────────────────────────────────────────────────────────
state = load_state()
seen_ids = set(state.get("seen_ids", []))
new_found = 0

print(f"[watcher] Starting — {len(seen_ids)} known IDs", flush=True)

for source_cfg in SOURCES:
    print(f"[watcher] Checking {source_cfg['name']}...", flush=True)
    entries = fetch_latest(source_cfg["url"])

    for entry in entries:
        vid_id = entry["id"]
        if vid_id in seen_ids:
            continue

        # New content!
        seen_ids.add(vid_id)
        new_found += 1
        print(f"  [NEW] {entry['title'][:60]}", flush=True)

        post_notification(
            source=source_cfg["source"],
            title=entry["title"],
            description=entry.get("description", ""),
            video_id=vid_id,
            url=entry.get("url", ""),
        )

state["seen_ids"] = list(seen_ids)
state["last_run"] = datetime.now().isoformat()
save_state(state)

print(f"[watcher] Done — {new_found} new items found", flush=True)
