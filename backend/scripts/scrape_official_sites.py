"""
scrape_official_sites.py
Scrapes official websites of high-priority tools and saves raw markdown to data/wiki/

Usage:
    python scripts/scrape_official_sites.py
    python scripts/scrape_official_sites.py --tool elevenlabs
"""

import argparse
import re
import sys
import time
from pathlib import Path

import requests
from bs4 import BeautifulSoup, Comment

ROOT     = Path(__file__).parent.parent
WIKI_DIR = ROOT / "data" / "wiki"
WIKI_DIR.mkdir(parents=True, exist_ok=True)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept-Language": "en-US,en;q=0.9",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
}

# High-priority tools: id -> list of URLs to scrape (homepage + features/pricing)
TARGETS: dict[str, dict] = {
    "notebooklm": {
        "name": "NotebookLM",
        "urls": [
            "https://notebooklm.google.com",
            "https://blog.google/technology/ai/notebooklm-google-io-2024/",
        ],
    },
    "google-workspace": {
        "name": "Google Workspace",
        "urls": [
            "https://workspace.google.com/features/",
            "https://workspace.google.com/pricing",
        ],
    },
    "microsoft-copilot": {
        "name": "Microsoft Copilot",
        "urls": [
            "https://copilot.microsoft.com",
            "https://www.microsoft.com/en-us/microsoft-365/microsoft-copilot",
        ],
    },
    "github-copilot": {
        "name": "GitHub Copilot",
        "urls": [
            "https://github.com/features/copilot",
            "https://github.com/features/copilot/plans",
        ],
    },
    "windsurf": {
        "name": "Windsurf",
        "urls": [
            "https://codeium.com/windsurf",
            "https://codeium.com/pricing",
        ],
    },
    "replit": {
        "name": "Replit",
        "urls": [
            "https://replit.com/site/ghostwriter",
            "https://replit.com/pricing",
        ],
    },
    "bolt": {
        "name": "Bolt.new",
        "urls": [
            "https://bolt.new",
            "https://docs.bolt.new",
        ],
    },
    "lovable": {
        "name": "Lovable",
        "urls": [
            "https://lovable.dev",
            "https://lovable.dev/pricing",
        ],
    },
    "v0-vercel": {
        "name": "v0 by Vercel",
        "urls": [
            "https://v0.dev",
        ],
    },
    "perplexity": {
        "name": "Perplexity AI",
        "urls": [
            "https://www.perplexity.ai/hub/about",
            "https://www.perplexity.ai/pro",
        ],
    },
    "elevenlabs": {
        "name": "ElevenLabs",
        "urls": [
            "https://elevenlabs.io",
            "https://elevenlabs.io/pricing",
            "https://elevenlabs.io/voice-cloning",
        ],
    },
    "runway": {
        "name": "Runway ML",
        "urls": [
            "https://runwayml.com",
            "https://runwayml.com/pricing",
            "https://runwayml.com/gen-3",
        ],
    },
    "heygen": {
        "name": "HeyGen",
        "urls": [
            "https://www.heygen.com",
            "https://www.heygen.com/pricing",
        ],
    },
    "suno": {
        "name": "Suno AI",
        "urls": [
            "https://suno.com",
            "https://suno.com/pricing",
        ],
    },
    "kling": {
        "name": "Kling AI",
        "urls": [
            "https://klingai.com",
            "https://klingai.com/pricing",
        ],
    },
}


def clean_html(html: str) -> str:
    """Convert HTML to clean readable text, remove nav/footer/ads."""
    soup = BeautifulSoup(html, "html.parser")

    # Remove unwanted elements
    for tag in soup(["script", "style", "noscript", "iframe", "svg",
                      "nav", "header", "footer", "aside",
                      "form", "button", "input", "select"]):
        tag.decompose()

    # Remove HTML comments
    for comment in soup.find_all(string=lambda t: isinstance(t, Comment)):
        comment.extract()

    # Try to find main content area
    main = (
        soup.find("main") or
        soup.find("article") or
        soup.find(id=re.compile(r"(content|main|app)", re.I)) or
        soup.find(class_=re.compile(r"(content|main|hero|feature|pricing)", re.I)) or
        soup.body or
        soup
    )

    # Extract text with structure
    lines: list[str] = []
    for el in main.find_all(["h1", "h2", "h3", "h4", "p", "li", "td", "th", "dt", "dd"]):
        text = el.get_text(" ", strip=True)
        if not text or len(text) < 3:
            continue
        if len(text) > 1000:            # skip giant blobs (embedded JSON etc.)
            text = text[:1000] + "..."
        tag = el.name
        if tag == "h1":
            lines.append(f"\n# {text}")
        elif tag == "h2":
            lines.append(f"\n## {text}")
        elif tag in ("h3", "h4"):
            lines.append(f"\n### {text}")
        elif tag == "li":
            lines.append(f"- {text}")
        else:
            lines.append(text)

    raw = "\n".join(lines)
    # Collapse 3+ blank lines
    raw = re.sub(r"\n{3,}", "\n\n", raw)
    return raw.strip()


def scrape_url(url: str, timeout: int = 15) -> str | None:
    """Fetch URL and return cleaned markdown text, or None on failure."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=timeout, allow_redirects=True)
        resp.raise_for_status()
        ct = resp.headers.get("content-type", "")
        if "html" not in ct:
            return None
        return clean_html(resp.text)
    except Exception as e:
        print(f"    ERROR {url}: {e}")
        return None


def scrape_tool(tool_id: str, info: dict) -> bool:
    """Scrape all URLs for a tool, combine, save to wiki."""
    name = info["name"]
    urls = info["urls"]
    print(f"\n[{tool_id}] {name}")

    sections: list[str] = [f"# {name}\n\n*Scraped from official sources — raw content*\n"]
    success = 0

    for url in urls:
        print(f"  Fetching: {url}")
        text = scrape_url(url)
        if text and len(text) > 200:
            sections.append(f"\n---\n## Source: {url}\n\n{text}")
            print(f"    OK — {len(text):,} chars")
            success += 1
        else:
            print(f"    SKIP — too short or error")
        time.sleep(1.5)   # polite delay

    if success == 0:
        print(f"  FAILED: no usable content from any URL")
        return False

    # Save
    out_path = WIKI_DIR / f"{tool_id}.md"
    out_path.write_text("\n".join(sections), encoding="utf-8")
    total_chars = sum(len(s) for s in sections)
    print(f"  SAVED: {out_path.name}  ({total_chars:,} chars, {success}/{len(urls)} URLs)")
    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tool", help="Scrape a single tool by id")
    parser.add_argument("--list", action="store_true", help="List all target tools")
    args = parser.parse_args()

    if args.list:
        for tid, info in TARGETS.items():
            existing = (WIKI_DIR / f"{tid}.md").exists()
            status = "EXISTS" if existing else "missing"
            print(f"  {tid:<25} {info['name']:<25} [{status}]")
        return

    targets = TARGETS
    if args.tool:
        if args.tool not in TARGETS:
            print(f"Unknown tool: {args.tool}")
            print("Available:", ", ".join(TARGETS.keys()))
            sys.exit(1)
        targets = {args.tool: TARGETS[args.tool]}

    print(f"Scraping {len(targets)} tools...")
    ok = 0
    fail = 0

    for tool_id, info in targets.items():
        if scrape_tool(tool_id, info):
            ok += 1
        else:
            fail += 1

    print(f"\n=== DONE: {ok} succeeded, {fail} failed ===")
    print(f"Wiki files saved to: {WIKI_DIR}")


if __name__ == "__main__":
    main()
