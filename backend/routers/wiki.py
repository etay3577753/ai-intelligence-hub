"""Wiki router — serves markdown research files and YouTube transcriptions."""

import re
from pathlib import Path
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse

router = APIRouter()

WIKI_DIR    = Path(__file__).parent.parent / "data" / "wiki"
YT_DIR      = WIKI_DIR / "youtube"


def _parse_meta(path: Path) -> dict:
    """Extract frontmatter-style metadata from first lines of a wiki file."""
    try:
        text = path.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return {}

    # Title: first # heading
    title_match = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
    title = title_match.group(1).strip() if title_match else path.stem

    # For YouTube files: extract channel, date, duration, views from blockquote lines
    channel  = "Eliron Giny"
    date     = ""
    duration = ""
    views    = ""
    source   = ""
    url      = ""

    for line in text.splitlines()[:15]:
        if "**ערוץ**" in line:   channel  = line.split("**:", 1)[-1].strip().rstrip("  ")
        if "**תאריך**" in line:  date     = line.split("**:", 1)[-1].strip().rstrip("  ")
        if "**משך**" in line:    duration = line.split("**:", 1)[-1].strip().rstrip("  ")
        if "**צפיות**" in line:  views    = line.split("**:", 1)[-1].strip().rstrip("  ")
        if "**מקור תמליל**" in line: source = line.split("**:", 1)[-1].strip().rstrip("  ")
        if "**קישור**" in line:  url      = line.split("**:", 1)[-1].strip().rstrip("  ")

    # Cost marker for tool research files
    cost_match  = re.search(r"\*\*עלות מחקר זה\*\*:\s*(\S+)", text)
    eco_match   = re.search(r"\*\*אקו-סיסטם\*\*:\s*(.+)", text)
    date_match  = re.search(r"\*\*תאריך מחקר\*\*:\s*(\S+)", text)

    return {
        "id":       path.stem,
        "title":    title,
        "size":     path.stat().st_size,
        # tool-research fields
        "ecosystem": eco_match.group(1).strip() if eco_match else ("YouTube — אלירן גיני" if path.parent.name == "youtube" else ""),
        "date":     date_match.group(1).strip() if date_match else date,
        "cost":     cost_match.group(1).strip() if cost_match else "",
        # youtube-specific
        "channel":  channel,
        "duration": duration,
        "views":    views,
        "source":   source,
        "url":      url,
        "is_youtube": path.parent.name == "youtube",
    }


@router.get("/wiki")
def wiki_endpoint(
    id:       str | None = Query(None),   # if set → return content
    category: str        = Query("all"),   # "all" | "research" | "youtube"
    search:   str        = Query(""),
    limit:    int        = Query(200),
    offset:   int        = Query(0),
):
    # ── Single file content ────────────────────────────────────────────────
    if id:
        for candidate in [WIKI_DIR / f"{id}.md", YT_DIR / f"{id}.md"]:
            if candidate.exists():
                text = candidate.read_text(encoding="utf-8", errors="replace")
                meta = _parse_meta(candidate)
                return {"id": id, "content": text, **meta}
        return JSONResponse(status_code=404, content={"error": f"Wiki file '{id}' not found"})

    # ── File list ──────────────────────────────────────────────────────────
    paths: list[Path] = []

    if category in ("all", "research"):
        paths += sorted(WIKI_DIR.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    if category in ("all", "youtube"):
        paths += sorted(YT_DIR.glob("*.md"),  key=lambda p: p.stat().st_mtime, reverse=True)

    metas = [_parse_meta(f) for f in paths]

    if search:
        q = search.lower()
        metas = [m for m in metas if q in m["title"].lower() or q in m.get("ecosystem","").lower()]

    total = len(metas)
    page  = metas[offset: offset + limit]

    return {
        "total": total,
        "files": page,   # WikiPage.tsx reads d.files
    }
