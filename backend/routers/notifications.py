"""Notifications router — bell system for new content alerts."""

import json
from datetime import datetime
from pathlib import Path
from typing import Literal
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()

NOTIFS_FILE = Path(__file__).parent.parent / "data" / "notifications.json"


def _load() -> list[dict]:
    if not NOTIFS_FILE.exists():
        return []
    with open(NOTIFS_FILE, encoding="utf-8") as f:
        return json.load(f).get("notifications", [])


def _save(notifs: list[dict]):
    with open(NOTIFS_FILE, "w", encoding="utf-8") as f:
        json.dump({"notifications": notifs}, f, ensure_ascii=False, indent=2)


# ── Schemas ────────────────────────────────────────────────────────────────

class NotificationCreate(BaseModel):
    type: Literal["new_video", "new_content", "research_done", "system"]
    source: Literal["youtube", "facebook", "instagram", "system"]
    title: str
    description: str
    video_id: str | None = None
    url: str | None = None


# ── Endpoints ──────────────────────────────────────────────────────────────

@router.get("/notifications")
def get_notifications(limit: int = 50):
    notifs = _load()
    return {
        "notifications": notifs[:limit],
        "unread_count": sum(1 for n in notifs if not n.get("read")),
    }


@router.post("/notifications")
def create_notification(data: NotificationCreate):
    notifs = _load()
    notif = {
        "id": f"notif_{datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:20]}",
        "type": data.type,
        "source": data.source,
        "title": data.title,
        "description": data.description,
        "video_id": data.video_id,
        "url": data.url,
        "created_at": datetime.now().isoformat(),
        "read": False,
    }
    notifs.insert(0, notif)
    _save(notifs)
    return notif


@router.patch("/notifications/{notif_id}/read")
def mark_read(notif_id: str):
    notifs = _load()
    for n in notifs:
        if n["id"] == notif_id:
            n["read"] = True
            break
    _save(notifs)
    return {"ok": True}


@router.post("/notifications/read-all")
def mark_all_read():
    notifs = _load()
    for n in notifs:
        n["read"] = True
    _save(notifs)
    return {"ok": True, "count": len(notifs)}


@router.delete("/notifications/{notif_id}")
def delete_notification(notif_id: str):
    notifs = _load()
    notifs = [n for n in notifs if n["id"] != notif_id]
    _save(notifs)
    return {"ok": True}
