"""
Base44 Integration Router
=========================
Endpoints מותאמים לחיבור דו-כיווני עם Base44.
כל endpoint מוגן ב-API key.

הגדרת BASE44_API_KEY ב-.env:
  BASE44_API_KEY=your-secret-key-here

שימוש מ-Base44:
  GET  /api/b44/wiki          → רשימת כל קבצי המחקר
  GET  /api/b44/wiki/{id}     → תוכן קובץ ספציפי
  GET  /api/b44/search?q=...  → חיפוש בכל המחקרים
  POST /api/b44/webhook        → Base44 שולח אירועים
  GET  /api/b44/status         → בריאות המערכת
"""

import os
import re
import time
from pathlib import Path
from datetime import datetime

from fastapi import APIRouter, Query, Header, HTTPException, Request
from fastapi.responses import JSONResponse

router = APIRouter()

WIKI_DIR = Path(__file__).parent.parent / "data" / "wiki"
YT_DIR   = WIKI_DIR / "youtube"

# ── Auth ──────────────────────────────────────────────────────────────────────

def _check_key(x_api_key: str | None):
    expected = os.getenv("BASE44_API_KEY", "")
    if expected and x_api_key != expected:
        raise HTTPException(status_code=401, detail="Invalid API key")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _parse_file(path: Path) -> dict:
    text = path.read_text(encoding="utf-8", errors="replace")
    title_m = re.search(r"^#\s+(.+)$", text, re.MULTILINE)
    eco_m   = re.search(r"\*\*אקו-סיסטם\*\*:\s*(.+)", text)
    date_m  = re.search(r"\*\*תאריך(?:\s+מחקר)?\*\*:\s*(.+)", text)
    desc_m  = re.search(r"## תיאור.*?\n\n(.*?)(?=\n##|\Z)", text, re.DOTALL)
    trans_m = re.search(r"## תמליל.*?\n\n(.*?)(?=\n##|\Z)", text, re.DOTALL)

    is_yt = path.parent.name == "youtube"
    return {
        "id":          path.stem,
        "title":       title_m.group(1).strip() if title_m else path.stem,
        "ecosystem":   eco_m.group(1).strip() if eco_m else ("YouTube — אלירן גיני" if is_yt else ""),
        "date":        date_m.group(1).strip() if date_m else "",
        "is_youtube":  is_yt,
        "size":        path.stat().st_size,
        "has_description": bool(desc_m),
        "has_transcript":  bool(trans_m),
        "preview":     (desc_m or trans_m).group(1).strip()[:200] if (desc_m or trans_m) else "",
    }


def _search_text(path: Path, query: str) -> dict | None:
    text = path.read_text(encoding="utf-8", errors="replace")
    if query.lower() not in text.lower():
        return None
    meta = _parse_file(path)
    # snippet around match
    idx = text.lower().find(query.lower())
    snippet = text[max(0, idx - 50): idx + 150].replace("\n", " ").strip()
    return {**meta, "snippet": snippet}


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/b44/status")
def b44_status(x_api_key: str | None = Header(None)):
    _check_key(x_api_key)
    research = list(WIKI_DIR.glob("*.md"))
    youtube  = list(YT_DIR.glob("*.md")) if YT_DIR.exists() else []
    return {
        "status":    "online",
        "timestamp": datetime.now().isoformat(),
        "stats": {
            "research_files": len(research),
            "youtube_files":  len(youtube),
            "total":          len(research) + len(youtube),
        },
    }


@router.get("/b44/wiki")
def b44_wiki_list(
    category: str        = Query("all"),    # all | research | youtube
    limit:    int        = Query(50),
    offset:   int        = Query(0),
    x_api_key: str | None = Header(None),
):
    _check_key(x_api_key)
    paths: list[Path] = []
    if category in ("all", "research"):
        paths += sorted(WIKI_DIR.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    if category in ("all", "youtube") and YT_DIR.exists():
        paths += sorted(YT_DIR.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)

    total = len(paths)
    page  = [_parse_file(p) for p in paths[offset: offset + limit]]
    return {"total": total, "offset": offset, "limit": limit, "files": page}


@router.get("/b44/wiki/{file_id}")
def b44_wiki_content(
    file_id: str,
    x_api_key: str | None = Header(None),
):
    _check_key(x_api_key)
    for candidate in [WIKI_DIR / f"{file_id}.md", YT_DIR / f"{file_id}.md"]:
        if candidate.exists():
            meta    = _parse_file(candidate)
            content = candidate.read_text(encoding="utf-8", errors="replace")
            return {**meta, "content": content}
    raise HTTPException(status_code=404, detail=f"'{file_id}' not found")


@router.get("/b44/search")
def b44_search(
    q:         str        = Query(..., min_length=2),
    category:  str        = Query("all"),
    limit:     int        = Query(20),
    x_api_key: str | None = Header(None),
):
    _check_key(x_api_key)
    paths: list[Path] = []
    if category in ("all", "research"):
        paths += WIKI_DIR.glob("*.md")
    if category in ("all", "youtube") and YT_DIR.exists():
        paths += YT_DIR.glob("*.md")

    results = []
    for p in paths:
        match = _search_text(p, q)
        if match:
            results.append(match)
        if len(results) >= limit:
            break

    return {"query": q, "total": len(results), "results": results}


@router.get("/b44/export")
def b44_export(
    category:  str        = Query("all"),
    x_api_key: str | None = Header(None),
):
    """
    ייצוא כל הנתונים כ-JSON מוכן לייבוא ל-Base44 Entities.
    שמור את הפלט כ-knowledge_base_export.json ויבא ב-Base44.
    """
    _check_key(x_api_key)
    paths: list[Path] = []
    if category in ("all", "research"):
        paths += sorted(WIKI_DIR.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)
    if category in ("all", "youtube") and YT_DIR.exists():
        paths += sorted(YT_DIR.glob("*.md"), key=lambda p: p.stat().st_mtime, reverse=True)

    records = []
    for p in paths:
        text    = p.read_text(encoding="utf-8", errors="replace")
        meta    = _parse_file(p)
        # חלץ כל section
        desc_m  = re.search(r"## תיאור.*?\n\n(.*?)(?=\n##|\Z)", text, re.DOTALL)
        trans_m = re.search(r"## תמליל.*?\n\n(.*?)(?=\n##|\Z)", text, re.DOTALL)
        url_m   = re.search(r"\*\*קישור\*\*:\s*(.+)", text)
        dur_m   = re.search(r"\*\*משך\*\*:\s*(.+)", text)
        views_m = re.search(r"\*\*צפיות\*\*:\s*(.+)", text)

        records.append({
            # שדות Base44 Entity סטנדרטיים
            "name":        meta["title"],
            "type":        "youtube_video" if meta["is_youtube"] else "research_article",
            "ecosystem":   meta["ecosystem"],
            "date":        meta["date"],
            "source_id":   meta["id"],
            "url":         url_m.group(1).strip() if url_m else "",
            "duration":    dur_m.group(1).strip() if dur_m else "",
            "views":       views_m.group(1).strip() if views_m else "",
            "description": desc_m.group(1).strip()[:1000] if desc_m else "",
            "transcript":  trans_m.group(1).strip()[:2000] if trans_m else "",
            "preview":     meta["preview"],
            "tags":        ["AI", "Rails", "אלירן גיני"] if meta["is_youtube"] else ["מחקר", meta["ecosystem"]],
            # metadata
            "has_description": meta["has_description"],
            "has_transcript":  meta["has_transcript"],
            "char_count":      meta["size"],
        })

    return {
        "exported_at": datetime.now().isoformat(),
        "total":       len(records),
        "entity_type": "KnowledgeBaseItem",
        "records":     records,
    }


@router.post("/b44/webhook")
async def b44_webhook(
    request: Request,
    x_api_key: str | None = Header(None),
):
    """Base44 שולח אירועים — לוגים ומטפל בהם."""
    _check_key(x_api_key)
    body = await request.json()
    event_type = body.get("event", "unknown")

    # כאן אפשר לטפל באירועים מ-Base44 בעתיד
    print(f"[Base44 webhook] event={event_type} payload={str(body)[:200]}")

    return {"received": True, "event": event_type, "timestamp": datetime.now().isoformat()}
