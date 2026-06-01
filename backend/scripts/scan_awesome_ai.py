"""
scan_awesome_ai.py
Downloads awesome-generative-ai list and finds tools not yet in tools_master.json.

Usage: python scripts/scan_awesome_ai.py
"""

import json
import re
import urllib.request
from pathlib import Path

ROOT       = Path(__file__).parent.parent
TOOLS_FILE = ROOT / "data" / "tools_master.json"

AWESOME_URL = "https://raw.githubusercontent.com/steven2358/awesome-generative-ai/master/README.md"

# Skip non-tool links (articles, papers, blog posts, social media)
SKIP_DOMAINS = {
    "nytimes.com","wsj.com","wired.com","techcrunch.com","theguardian.com",
    "arxiv.org","papers.ssrn.com","cdn.openai.com","twitter.com","x.com",
    "youtube.com","youtu.be","linkedin.com","medium.com","substack.com",
    "sequoiacap.com","hai.stanford.edu","huggingface.co/papers","reddit.com",
    "blogs.microsoft.com","deepmind.google/blog","ai.meta.com/blog",
    "openai.com/blog","openai.com/research","stability.ai/news",
    "github.blog","anthropic.com/news","towardsdatascience.com",
}

def is_article(url: str) -> bool:
    for d in SKIP_DOMAINS:
        if d in url:
            return True
    # Blog/news URL patterns
    if re.search(r'/(blog|news|research|paper|article|press|post|whitepaper)/', url):
        return True
    return False


def extract_tools(markdown: str) -> list[dict]:
    """Parse bullet-list entries: - [Name](URL) - description"""
    entries = re.findall(
        r'^\s*[-*]\s+\[([^\]]{2,60})\]\((https?://[^\)]+)\)(?:\s*[-—:]\s*(.+))?',
        markdown, re.MULTILINE
    )
    tools = []
    for name, url, desc in entries:
        url = url.strip().rstrip(")")
        if is_article(url):
            continue
        if len(name) < 2 or "awesome" in name.lower():
            continue
        tools.append({"name": name.strip(), "url": url, "desc": (desc or "").strip()})
    return tools


def normalize_domain(url: str) -> str:
    """Extract base domain for fuzzy matching."""
    m = re.search(r'https?://(?:www\.)?([^/]+)', url)
    return m.group(1).lower() if m else ""


def main():
    print("Downloading awesome-generative-ai...")
    with urllib.request.urlopen(AWESOME_URL, timeout=15) as r:
        md = r.read().decode("utf-8")
    print(f"File: {len(md):,} chars")

    awesome_tools = extract_tools(md)
    print(f"Tool entries parsed: {len(awesome_tools)}")

    # Load our tools
    data = json.loads(TOOLS_FILE.read_text(encoding="utf-8"))
    our_tools = data["tools"]

    # Build sets for comparison
    our_names   = {t["name"].lower() for t in our_tools}
    our_domains = {normalize_domain(t.get("link","")) for t in our_tools if t.get("link")}

    new_tools = []
    for t in awesome_tools:
        name_lower = t["name"].lower()
        domain     = normalize_domain(t["url"])

        # Skip if we already have it (by name or domain)
        if name_lower in our_names:
            continue
        if domain and domain in our_domains:
            continue
        # Fuzzy: check if our tool name is a substring (e.g. "GPT-4" vs "GPT-4o")
        if any(name_lower in n or n in name_lower for n in our_names if len(n) > 3):
            continue

        new_tools.append(t)

    print(f"\nTools in awesome list : {len(awesome_tools)}")
    print(f"Already in our DB     : {len(awesome_tools) - len(new_tools)}")
    print(f"NEW tools found       : {len(new_tools)}")
    print()

    if new_tools:
        print("New tools not in our database:")
        for i, t in enumerate(new_tools, 1):
            print(f"  {i:3}. {t['name']:<30}  {t['url']}")

    # Save new tools list to JSON for later import
    out = ROOT / "data" / "awesome_new_tools.json"
    out.write_text(json.dumps(new_tools, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\nSaved to: {out}")


if __name__ == "__main__":
    main()
