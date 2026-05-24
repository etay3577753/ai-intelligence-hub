"""
Base44 Push Sync — אפשרות 3: Local API → Base44 API
====================================================
שולח את כל הנתונים מה-Wiki המקומי ישירות ל-Base44 דאטאבייס.

הגדרה:
  1. ב-Base44: Settings → API → צור API Key
  2. ב-Base44: צור Entity בשם "KnowledgeBaseItem" עם השדות:
       name, type, ecosystem, date, url, description, transcript, tags
  3. הרץ: python base44_push.py --api-key YOUR_BASE44_KEY --app-id YOUR_APP_ID

שימוש:
  python base44_push.py --api-key xxx --app-id yyy [--dry-run] [--category youtube]
"""

import argparse
import json
import re
import sys
import time
import urllib.request
import urllib.error
from datetime import datetime
from pathlib import Path

BASE_DIR = Path(__file__).parent
WIKI_DIR = BASE_DIR / "data" / "wiki"
YT_DIR   = WIKI_DIR / "youtube"


# ── Parsers ────────────────────────────────────────────────────────────────────

def parse_wiki_file(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="replace")

    def find(pattern):
        m = re.search(pattern, text, re.MULTILINE | re.DOTALL)
        return m.group(1).strip() if m else ""

    is_yt   = path.parent.name == "youtube"
    title   = find(r"^#\s+(.+)$")
    desc    = find(r"## תיאור.*?\n\n(.*?)(?=\n##|\Z)")[:1000]
    trans   = find(r"## תמליל.*?\n\n(.*?)(?=\n##|\Z)")[:2000]
    eco     = find(r"\*\*אקו-סיסטם\*\*:\s*(.+)") or ("YouTube — אלירן גיני" if is_yt else "")
    date    = find(r"\*\*תאריך(?:\s+מחקר)?\*\*:\s*(.+)")
    url     = find(r"\*\*קישור\*\*:\s*(.+)")
    dur     = find(r"\*\*משך\*\*:\s*(.+)")
    views   = find(r"\*\*צפיות\*\*:\s*(.+)")

    return {
        "name":        title or path.stem,
        "type":        "youtube_video" if is_yt else "research_article",
        "ecosystem":   eco,
        "date":        date,
        "source_id":   path.stem,
        "url":         url,
        "duration":    dur,
        "views":       views,
        "description": desc,
        "transcript":  trans,
        "tags":        ["AI", "Rails", "אלירן גיני"] if is_yt else ["מחקר", eco],
        "has_description": bool(desc),
        "has_transcript":  bool(trans),
    }


# ── Base44 API calls ────────────────────────────────────────────────────────────

def b44_request(method: str, url: str, api_key: str, data: dict | None = None) -> dict:
    body = json.dumps(data).encode("utf-8") if data else None
    req  = urllib.request.Request(
        url, data=body, method=method,
        headers={
            "Content-Type":  "application/json",
            "Authorization": f"Bearer {api_key}",
        }
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as res:
            return json.loads(res.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")[:200]
        raise RuntimeError(f"HTTP {e.code}: {body}")


def push_records(records: list[dict], api_key: str, app_id: str,
                 entity: str, dry_run: bool) -> tuple[int, int]:
    """Upsert records into Base44 entity. Returns (ok, errors)."""
    base = f"https://api.base44.com/v1/apps/{app_id}/entities/{entity}"
    ok = errors = 0

    for i, rec in enumerate(records):
        if dry_run:
            print(f"  [DRY] {rec['name'][:60]}")
            ok += 1
            continue
        try:
            b44_request("POST", f"{base}/upsert", api_key, rec)
            ok += 1
            if (i + 1) % 20 == 0:
                print(f"  [{i+1}/{len(records)}] pushed {ok} ok, {errors} errors", flush=True)
            time.sleep(0.1)   # rate limit
        except Exception as e:
            errors += 1
            print(f"  [!] {rec['name'][:40]}: {e}", flush=True)

    return ok, errors


# ── Main ───────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Push Wiki data to Base44")
    parser.add_argument("--api-key",  required=True, help="Base44 API key")
    parser.add_argument("--app-id",   required=True, help="Base44 App ID")
    parser.add_argument("--entity",   default="KnowledgeBaseItem", help="Entity name in Base44")
    parser.add_argument("--category", default="all", choices=["all", "research", "youtube"])
    parser.add_argument("--dry-run",  action="store_true", help="הצג בלי לשלוח")
    args = parser.parse_args()

    # ── Collect paths ──────────────────────────────────────────
    paths: list[Path] = []
    if args.category in ("all", "research"):
        paths += sorted(WIKI_DIR.glob("*.md"))
    if args.category in ("all", "youtube") and YT_DIR.exists():
        paths += sorted(YT_DIR.glob("*.md"))

    print(f"[b44] {len(paths)} files → Entity '{args.entity}' in app '{args.app_id}'")
    if args.dry_run:
        print("[b44] DRY RUN — לא ישלח נתונים")

    # ── Parse all ──────────────────────────────────────────────
    records = [parse_wiki_file(p) for p in paths]
    print(f"[b44] Parsed {len(records)} records")

    # ── Push ───────────────────────────────────────────────────
    ok, errors = push_records(records, args.api_key, args.app_id, args.entity, args.dry_run)

    print(f"\n[b44] Done — {ok} pushed, {errors} errors")

    # שמור JSON מקומי לגיבוי
    out = BASE_DIR / "data" / "base44_export.json"
    out.write_text(
        json.dumps({"exported_at": datetime.now().isoformat(), "total": len(records), "records": records},
                   ensure_ascii=False, indent=2),
        encoding="utf-8"
    )
    print(f"[b44] Export saved → {out}")


if __name__ == "__main__":
    main()
