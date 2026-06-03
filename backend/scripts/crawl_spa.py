"""
crawl_spa.py
Uses Playwright (headless Chromium) to crawl JavaScript-heavy SPAs.
Saves raw text to backend/data/wiki/{tool_id}.md

Usage:
    python scripts/crawl_spa.py                  # bolt + kling (defaults)
    python scripts/crawl_spa.py --url https://...  --out my_tool
"""

import argparse
import asyncio
import re
import sys
from pathlib import Path

ROOT     = Path(__file__).parent.parent
WIKI_DIR = ROOT / "data" / "wiki"
WIKI_DIR.mkdir(parents=True, exist_ok=True)

# Default SPA targets
TARGETS = {
    "bolt": {
        "name": "Bolt.new",
        "urls": [
            "https://bolt.new",
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


def clean_text(raw: str) -> str:
    """Collapse whitespace, remove repeated lines."""
    lines = []
    seen: set[str] = set()
    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped or len(stripped) < 3:
            continue
        if stripped in seen:
            continue
        seen.add(stripped)
        lines.append(stripped)
    text = "\n".join(lines)
    return re.sub(r"\n{3,}", "\n\n", text)


async def crawl_spa(url: str, timeout_ms: int = 30_000) -> str:
    """Load a URL with headless Chromium, wait for JS, return page text."""
    try:
        from playwright.async_api import async_playwright
    except ImportError:
        return "ERROR: playwright not installed"

    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/124.0.0.0 Safari/537.36"
                )
            )
            page = await context.new_page()

            try:
                await page.goto(url, wait_until="networkidle", timeout=timeout_ms)
            except Exception:
                # Fallback: just wait for domcontentloaded
                try:
                    await page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)
                    await page.wait_for_timeout(3000)   # extra 3s for late JS
                except Exception as e2:
                    await browser.close()
                    return f"ERROR: {e2}"

            # Grab visible text
            try:
                content = await page.inner_text("body")
            except Exception:
                content = await page.evaluate("() => document.body.innerText")

            await browser.close()
            return clean_text(content)

    except Exception as e:
        return f"ERROR: {e}"


async def scrape_tool(tool_id: str, info: dict) -> bool:
    name = info["name"]
    urls = info["urls"]
    print(f"\n[{tool_id}] {name}  (Playwright)")

    sections = [f"# {name}\n\n*Scraped with Playwright (headless Chromium)*\n"]
    success = 0

    for url in urls:
        print(f"  Fetching: {url} ...")
        text = await crawl_spa(url)
        if text.startswith("ERROR") or len(text) < 200:
            print(f"    FAIL: {text[:100]}")
        else:
            sections.append(f"\n---\n## Source: {url}\n\n{text[:15_000]}")
            print(f"    OK: {len(text):,} chars")
            success += 1

    if success == 0:
        print(f"  FAILED: no usable content")
        return False

    out = WIKI_DIR / f"{tool_id}.md"
    content = "\n".join(sections)
    out.write_text(content, encoding="utf-8")
    print(f"  SAVED: {out.name}  ({len(content):,} chars, {success}/{len(urls)} URLs)")
    return True


async def main_async(targets: dict):
    ok = fail = 0
    for tool_id, info in targets.items():
        if await scrape_tool(tool_id, info):
            ok += 1
        else:
            fail += 1
    print(f"\n=== DONE: {ok} succeeded, {fail} failed ===")
    return ok


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tool", help="Single tool id from defaults")
    parser.add_argument("--url",  help="Custom URL to crawl")
    parser.add_argument("--out",  help="Output file stem (with --url)")
    args = parser.parse_args()

    if args.url and args.out:
        targets = {args.out: {"name": args.out, "urls": [args.url]}}
    elif args.tool:
        if args.tool not in TARGETS:
            print(f"Unknown: {args.tool}. Available: {list(TARGETS.keys())}")
            sys.exit(1)
        targets = {args.tool: TARGETS[args.tool]}
    else:
        targets = TARGETS

    ok = asyncio.run(main_async(targets))
    sys.exit(0 if ok > 0 else 1)


if __name__ == "__main__":
    main()
