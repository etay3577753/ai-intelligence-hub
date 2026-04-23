"""
Facebook Description Import — Eliran Giny Rails Shorts
=======================================================
Fetches post descriptions from Eliran Giny's Facebook page and merges them
into the existing YouTube wiki files.

Usage:
  # Step 1: fetch Facebook posts to JSON
  python facebook_import.py fetch --page PAGE_URL [--cookies cookies.txt]

  # Step 2: match & patch wiki files
  python facebook_import.py import --data fb_posts.json [--dry-run]

  # One-shot: fetch + import
  python facebook_import.py all --page PAGE_URL [--cookies cookies.txt]

Notes:
  - Facebook requires login cookies. Export with "cookies.txt" browser extension (Netscape format).
  - yt-dlp is used for fetching; it must be installed and in PATH.
  - Titles are matched with exact → normalized → fuzzy matching.
"""

import argparse
import difflib
import json
import re
import subprocess
import sys
import unicodedata
from pathlib import Path

BASE_DIR   = Path(__file__).parent
WIKI_DIR   = BASE_DIR / "data" / "wiki" / "youtube"
OUT_FILE   = BASE_DIR / "data" / "fb_posts.json"


# ─────────────────────────────────────────────────────────────────────────────
# Fetch helpers
# ─────────────────────────────────────────────────────────────────────────────

def _add_cookie_args(cmd: list[str], cookies_file: str | None, browser: str | None):
    """Append cookie arguments to yt-dlp command."""
    if browser:
        cmd += ["--cookies-from-browser", browser]
    elif cookies_file and Path(cookies_file).exists():
        cmd += ["--cookies", cookies_file]


def fetch_facebook_posts(
    page_url: str,
    cookies_file: str | None = None,
    browser: str | None = None,
) -> list[dict]:
    """
    Use yt-dlp to fetch all video posts from a Facebook page.
    Returns a list of {title, description, url} dicts.
    """
    cmd = [
        "yt-dlp",
        "--flat-playlist",
        "--print", "%(id)s\t%(title)s\t%(description)s\t%(webpage_url)s",
        "--no-warnings",
        "--ignore-errors",
    ]

    _add_cookie_args(cmd, cookies_file, browser)
    cmd.append(page_url)

    print(f"[fb] Running yt-dlp on: {page_url}", flush=True)
    print(f"[fb] Command: {' '.join(cmd[:6])} ...", flush=True)

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=300,
        )
        if result.returncode != 0 and not result.stdout.strip():
            print(f"[fb] yt-dlp error:\n{result.stderr[:500]}", flush=True)
            return []
    except subprocess.TimeoutExpired:
        print("[fb] Timeout after 5 minutes.", flush=True)
        return []
    except FileNotFoundError:
        print("[fb] yt-dlp not found. Install with: pip install yt-dlp", flush=True)
        sys.exit(1)

    posts: list[dict] = []
    for line in result.stdout.splitlines():
        parts = line.split("\t", 3)
        if len(parts) < 2:
            continue
        vid_id, title = parts[0], parts[1]
        description  = parts[2].strip() if len(parts) > 2 else ""
        url          = parts[3].strip() if len(parts) > 3 else ""

        # Some posts print "NA" for missing fields
        if description in ("NA", "None", ""):
            description = ""
        if url in ("NA", "None", ""):
            url = ""

        posts.append({
            "fb_id":       vid_id,
            "title":       title,
            "description": description,
            "url":         url,
        })

    print(f"[fb] Fetched {len(posts)} posts from Facebook", flush=True)
    return posts


def fetch_facebook_detailed(
    page_url: str,
    cookies_file: str | None = None,
    browser: str | None = None,
) -> list[dict]:
    """
    Alternative: use yt-dlp --dump-json to get full metadata per video.
    Slower but gives richer description data.
    """
    cmd = [
        "yt-dlp",
        "--dump-json",
        "--no-warnings",
        "--ignore-errors",
        "--flat-playlist",
    ]
    _add_cookie_args(cmd, cookies_file, browser)
    cmd.append(page_url)

    print(f"[fb] Fetching detailed metadata (this may take a while)...", flush=True)
    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            encoding="utf-8",
            timeout=600,
        )
    except subprocess.TimeoutExpired:
        print("[fb] Timeout.", flush=True)
        return []

    posts = []
    for line in result.stdout.splitlines():
        if not line.strip():
            continue
        try:
            d = json.loads(line)
            posts.append({
                "fb_id":       d.get("id", ""),
                "title":       d.get("title", ""),
                "description": (d.get("description") or "").strip(),
                "url":         d.get("webpage_url", ""),
            })
        except json.JSONDecodeError:
            pass

    print(f"[fb] Fetched {len(posts)} posts (detailed)", flush=True)
    return posts


# ─────────────────────────────────────────────────────────────────────────────
# Matching helpers
# ─────────────────────────────────────────────────────────────────────────────

def normalize_title(t: str) -> str:
    """Lowercase + strip diacritics + collapse spaces + keep alnum/Hebrew."""
    t = unicodedata.normalize("NFKD", t)
    t = t.lower().strip()
    t = re.sub(r"[\s\-_—–]+", " ", t)          # normalize whitespace
    t = re.sub(r"[^\w\s\u0590-\u05FF]", "", t)  # keep word chars + Hebrew
    return t.strip()


def build_title_index(wiki_dir: Path) -> dict[str, Path]:
    """Build {normalized_title: wiki_path} from all YouTube wiki files."""
    index: dict[str, Path] = {}
    for md in wiki_dir.glob("*.md"):
        raw = md.read_text(encoding="utf-8", errors="replace")
        m = re.search(r"^#\s+(.+)$", raw, re.MULTILINE)
        if m:
            title = m.group(1).strip()
            norm  = normalize_title(title)
            index[norm] = md
    return index


def word_set(title: str) -> set[str]:
    """Extract meaningful words (3+ chars) from a title for intersection scoring."""
    norm = normalize_title(title)
    return {w for w in norm.split() if len(w) >= 3}


def find_best_match(fb_title: str, index: dict[str, Path], cutoff: float = 0.65) -> Path | None:
    """
    Find the best wiki file for a given Facebook title.
    Strategy (in order):
      1. Exact normalized match
      2. One title is prefix of the other
      3. Fuzzy ratio match (difflib)
      4. Word-intersection score — useful when YT title is Hebrew + English series name
         and FB title is English only (e.g. "Race Conditions Part 13")
    """
    norm_fb = normalize_title(fb_title)
    words_fb = word_set(fb_title)

    # 1. exact match
    if norm_fb in index:
        return index[norm_fb]

    # 2. prefix match
    for norm_wiki, path in index.items():
        if norm_fb.startswith(norm_wiki) or norm_wiki.startswith(norm_fb):
            return path

    # 3. fuzzy ratio
    keys = list(index.keys())
    matches = difflib.get_close_matches(norm_fb, keys, n=1, cutoff=cutoff)
    if matches:
        return index[matches[0]]

    # 4. word-intersection — handles mixed-language titles
    if len(words_fb) >= 2:
        best_path: Path | None = None
        best_score = 0.0
        for norm_wiki, path in index.items():
            words_wiki = word_set(norm_wiki)
            if not words_wiki:
                continue
            common = words_fb & words_wiki
            # Jaccard-like but weighted by FB word coverage
            score = len(common) / len(words_fb)
            if score > best_score:
                best_score = score
                best_path = path
        # Only accept if at least half the FB words match
        if best_score >= 0.5:
            return best_path

    return None


# ─────────────────────────────────────────────────────────────────────────────
# Patch wiki file
# ─────────────────────────────────────────────────────────────────────────────

SECTION_HEADER = "## תיאור הסרטון (מפייסבוק)"
TRANSCRIPT_HEADER = "## תמליל"


def patch_wiki(wiki_path: Path, description: str, fb_url: str = "", dry_run: bool = False) -> bool:
    """
    Inserts/replaces Facebook description section in a wiki file.
    Returns True if file was modified.
    """
    raw = wiki_path.read_text(encoding="utf-8", errors="replace")

    # Build description block
    desc_lines = [
        SECTION_HEADER,
        "",
        description.strip(),
    ]
    if fb_url:
        desc_lines += ["", f"> **מקור**: [פוסט פייסבוק]({fb_url})"]
    desc_lines.append("")

    desc_block = "\n".join(desc_lines)

    # Check if section already exists
    if SECTION_HEADER in raw:
        # Replace existing section up to next ##
        pattern = re.compile(
            r"## תיאור הסרטון \(מפייסבוק\).*?(?=^##|\Z)",
            re.DOTALL | re.MULTILINE,
        )
        new_raw = pattern.sub(desc_block + "\n", raw)
    else:
        # Insert before transcript header (or at end)
        transcript_match = re.search(r"^## תמליל", raw, re.MULTILINE)
        if transcript_match:
            pos = transcript_match.start()
            new_raw = raw[:pos] + desc_block + "\n" + raw[pos:]
        else:
            new_raw = raw.rstrip() + "\n\n" + desc_block

    if new_raw == raw:
        return False

    if not dry_run:
        wiki_path.write_text(new_raw, encoding="utf-8")

    return True


# ─────────────────────────────────────────────────────────────────────────────
# Main commands
# ─────────────────────────────────────────────────────────────────────────────

def cmd_fetch(args):
    cookies = getattr(args, "cookies", None)
    browser = getattr(args, "browser", None)
    posts = fetch_facebook_posts(args.page, cookies, browser)
    if not posts:
        print("[fb] Retrying with detailed mode...", flush=True)
        posts = fetch_facebook_detailed(args.page, cookies, browser)
    if not posts:
        print("[fb] No posts found. Check page URL and cookies.", flush=True)
        sys.exit(1)

    out = getattr(args, "data", None) or str(OUT_FILE)
    Path(out).write_text(json.dumps(posts, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"[fb] Saved {len(posts)} posts → {out}", flush=True)


def cmd_import(args):
    data_file = Path(getattr(args, "data", None) or OUT_FILE)
    if not data_file.exists():
        print(f"[fb] Data file not found: {data_file}", flush=True)
        sys.exit(1)

    posts: list[dict] = json.loads(data_file.read_text(encoding="utf-8"))
    dry_run: bool = getattr(args, "dry_run", False)

    print(f"[fb] Loading {len(posts)} Facebook posts", flush=True)
    print(f"[fb] Scanning wiki files...", flush=True)

    index = build_title_index(WIKI_DIR)
    print(f"[fb] Index has {len(index)} wiki files", flush=True)

    matched = 0
    skipped = 0
    no_desc = 0
    no_match = 0
    unmatched_titles: list[str] = []

    for post in posts:
        title = post.get("title", "").strip()
        description = post.get("description", "").strip()
        fb_url = post.get("url", "")

        if not description:
            no_desc += 1
            continue

        wiki_path = find_best_match(title, index)
        if wiki_path is None:
            no_match += 1
            unmatched_titles.append(title)
            continue

        changed = patch_wiki(wiki_path, description, fb_url, dry_run=dry_run)
        if changed:
            action = "[DRY RUN]" if dry_run else "✓"
            print(f"  {action} {wiki_path.name} ← \"{title[:50]}\"", flush=True)
            matched += 1
        else:
            skipped += 1

    print(f"\n[fb] Done!", flush=True)
    print(f"  Matched & updated : {matched}", flush=True)
    print(f"  Already up-to-date: {skipped}", flush=True)
    print(f"  No description    : {no_desc}", flush=True)
    print(f"  No wiki match     : {no_match}", flush=True)

    if unmatched_titles:
        unmatched_file = BASE_DIR / "data" / "fb_unmatched.json"
        unmatched_file.write_text(
            json.dumps(unmatched_titles, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        print(f"\n  Unmatched titles saved → {unmatched_file.name}", flush=True)
        if len(unmatched_titles) <= 10:
            for t in unmatched_titles:
                print(f"    - {t}", flush=True)


def cmd_all(args):
    cmd_fetch(args)
    args.data = str(OUT_FILE)
    cmd_import(args)


# ─────────────────────────────────────────────────────────────────────────────
# CLI
# ─────────────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Import Facebook descriptions into YouTube wiki files"
    )
    sub = parser.add_subparsers(dest="command", required=True)

    # fetch
    p_fetch = sub.add_parser("fetch", help="Fetch posts from Facebook page")
    p_fetch.add_argument("--page",    required=True, help="Facebook page URL (videos tab)")
    p_fetch.add_argument("--cookies", default=None,  help="Path to cookies.txt (Netscape format)")
    p_fetch.add_argument("--browser", default=None,  help="Extract cookies from browser: chrome|firefox|edge")
    p_fetch.add_argument("--data",    default=str(OUT_FILE), help="Output JSON file")

    # import
    p_import = sub.add_parser("import", help="Match posts to wiki files and patch them")
    p_import.add_argument("--data",    default=str(OUT_FILE), help="Input JSON file")
    p_import.add_argument("--dry-run", action="store_true",   help="Preview changes, don't write")

    # all
    p_all = sub.add_parser("all", help="Fetch + import in one step")
    p_all.add_argument("--page",    required=True, help="Facebook page URL (videos tab)")
    p_all.add_argument("--cookies", default=None,  help="Path to cookies.txt")
    p_all.add_argument("--browser", default=None,  help="Extract cookies from browser: chrome|firefox|edge")
    p_all.add_argument("--dry-run", action="store_true")

    args = parser.parse_args()

    if args.command == "fetch":
        cmd_fetch(args)
    elif args.command == "import":
        cmd_import(args)
    elif args.command == "all":
        cmd_all(args)


if __name__ == "__main__":
    main()
