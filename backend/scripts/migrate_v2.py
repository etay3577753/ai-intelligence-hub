#!/usr/bin/env python3
"""
Migration script: ecosystem-inventory.json v1.0.0 → v2.0.0
"""

import json

FILE_PATH = r"C:\Users\איתי\The Master AI Architect\backend\data\knowledge-base\ecosystem-inventory.json"

# ── Load ──────────────────────────────────────────────────────────────────────
with open(FILE_PATH, encoding="utf-8") as f:
    data = json.load(f)

# ── A. Migrate every tool ─────────────────────────────────────────────────────
DEEP_COMPLETE  = {"claude-code", "claude-ai-web", "anthropic-api"}
UPDATE_PENDING = {"cursor", "cursor-ide"}
NEEDS_REVIEW   = {"chatgpt"}

RESEARCH_RECORD_IDS = {
    "claude-code":    ["dr-001"],
    "claude-ai-web":  ["dr-002"],
    "anthropic-api":  ["dr-003"],
}

def get_research_status(tool):
    tid = tool["id"]
    if tid in DEEP_COMPLETE:
        return "deep_research_complete"
    if tid in UPDATE_PENDING:
        return "update_pending"
    if tid in NEEDS_REVIEW:
        return "needs_review"
    # map from deep_research_status
    drs = tool.get("deep_research_status", "none")
    if drs == "partial":
        return "research_in_progress"
    return "inventory_only"

def get_last_research_date(status):
    if status == "deep_research_complete":
        return "2026-04-10"
    if status == "research_in_progress":
        return "2026-04-01"
    return None

for tool in data["tools"]:
    tid = tool["id"]

    # Always (re)compute so re-runs are idempotent
    rs = get_research_status(tool)
    tool["research_status"] = rs
    tool["last_research_date"] = get_last_research_date(rs)
    tool["has_pending_updates"] = tid in (UPDATE_PENDING | NEEDS_REVIEW)
    tool["research_record_ids"] = RESEARCH_RECORD_IDS.get(tid, [])

# ── B. New top-level arrays ───────────────────────────────────────────────────
data["deep_research_records"] = [
    {
        "id": "dr-001",
        "tool_id": "claude-code",
        "ecosystem_id": "anthropic",
        "research_date": "2026-04-10",
        "researcher": "manual",
        "sources_used": [
            "wiki/claude-code.md",
            "youtube/claude-code-shorts.md",
            "https://docs.anthropic.com/claude-code"
        ],
        "summary": "Claude Code הוא CLI agent מלא מבית Anthropic. תומך ב-MCP, hooks, sub-agents. פועל על claude-sonnet-4-6 כברירת מחדל.",
        "key_findings": [
            "תומך ב-hooks מסוגים: PreToolUse, PostToolUse, Stop, SessionStart",
            "יש auto-compact כשהקונטקסט מתמלא",
            "ה-SDK מאפשר בניית agents מותאמים אישית",
            "תומך ב-MCP servers — מרחיב יכולות עם כלים חיצוניים",
            "עלות: נגבה מ-Anthropic API — ממוצע $2-8 לשעה לפי שימוש"
        ],
        "confidence": 92,
        "notebooklm_url": None,
        "version": 1
    },
    {
        "id": "dr-002",
        "tool_id": "claude-ai-web",
        "ecosystem_id": "anthropic",
        "research_date": "2026-04-10",
        "researcher": "manual",
        "sources_used": [
            "wiki/claude-ai.md",
            "https://claude.ai"
        ],
        "summary": "ממשק ה-web של Claude. תוכנית Pro כוללת Projects, extended thinking ו-Claude 3.7 Sonnet. Free tier מוגבל.",
        "key_findings": [
            "Claude.ai Pro: $20/חודש — Projects, extended thinking, priority access",
            "Claude for Work: $25/חודש/משתמש — shared Projects, admin controls",
            "Free tier: Claude 3.5 Haiku, מוגבל בהודעות",
            "Projects: זיכרון עקבי בתוך פרויקט אחד",
            "תמיכה בעברית מצוינת"
        ],
        "confidence": 88,
        "notebooklm_url": None,
        "version": 1
    },
    {
        "id": "dr-003",
        "tool_id": "anthropic-api",
        "ecosystem_id": "anthropic",
        "research_date": "2026-04-08",
        "researcher": "manual",
        "sources_used": [
            "wiki/anthropic-api.md",
            "https://docs.anthropic.com/api"
        ],
        "summary": "Anthropic API — גישה ישירה למודלי Claude דרך REST API. תמחור לפי tokens. תומך ב-streaming, vision, tool use.",
        "key_findings": [
            "claude-sonnet-4-6: $3/M input tokens, $15/M output tokens",
            "claude-haiku-3-5: $0.25/M input, $1.25/M output — הזול ביותר",
            "תמיכה מלאה ב-tool use, computer use, vision",
            "Prompt caching מוזיל עלויות עד 90% על prompts חוזרים",
            "Rate limits: Tier 1 — 50K TPM"
        ],
        "confidence": 95,
        "notebooklm_url": None,
        "version": 1
    }
]

data["update_records"] = [
    {
        "id": "upd-001",
        "tool_id": "cursor",
        "detected_at": "2026-04-12",
        "source_url": "https://cursor.sh/changelog",
        "source_type": "release_notes",
        "title": "Cursor 0.45 — Background Agent + Max Mode",
        "summary": "גרסה 0.45 מוסיפה Background Agent שרץ ברקע ומבצע משימות ארוכות. Max Mode מאפשר שימוש בקונטקסט גדול מאוד.",
        "classification": "new_feature",
        "recommended_action": "update_research",
        "status": "pending_review",
        "affects_deep_research": True
    },
    {
        "id": "upd-002",
        "tool_id": "chatgpt",
        "detected_at": "2026-04-11",
        "source_url": "https://openai.com/blog",
        "source_type": "blog",
        "title": "ChatGPT Plus price change — $20 → $22",
        "summary": "OpenAI העלתה את מחיר ChatGPT Plus מ-$20 ל-$22 לחודש החל מ-מאי 2026.",
        "classification": "pricing_change",
        "recommended_action": "append_update",
        "status": "pending_review",
        "affects_deep_research": False
    },
    {
        "id": "upd-003",
        "tool_id": "google-gemini-full",
        "detected_at": "2026-04-09",
        "source_url": "https://blog.google/products/gemini",
        "source_type": "blog",
        "title": "Gemini 2.5 Pro — שיפורי reasoning ו-Deep Research",
        "summary": "Gemini 2.5 Pro קיבל שדרוג ל-reasoning ולמצב Deep Research. ניסויים מראים שיפור של 15% ב-coding benchmarks.",
        "classification": "model_update",
        "recommended_action": "update_research",
        "status": "applied",
        "affects_deep_research": True,
        "applied_at": "2026-04-09",
        "applied_by": "manual",
        "resolution_notes": "עדכנו את wiki/google-gemini.md עם הפרטים"
    }
]

data["source_records"] = [
    {
        "id": "src-001",
        "tool_id": "claude-ai-web",
        "source_type": "web_page",
        "url": "https://www.anthropic.com/news",
        "label": "Anthropic News Blog",
        "last_checked": "2026-04-13",
        "check_frequency": "weekly",
        "is_active": True,
        "last_found_update": "2026-04-10",
        "total_updates_found": 3
    },
    {
        "id": "src-002",
        "tool_id": "cursor",
        "source_type": "web_page",
        "url": "https://cursor.sh/changelog",
        "label": "Cursor Changelog",
        "last_checked": "2026-04-13",
        "check_frequency": "weekly",
        "is_active": True,
        "last_found_update": "2026-04-12",
        "total_updates_found": 5
    },
    {
        "id": "src-003",
        "tool_id": "chatgpt",
        "source_type": "blog",
        "url": "https://openai.com/blog",
        "label": "OpenAI Blog",
        "last_checked": "2026-04-13",
        "check_frequency": "weekly",
        "is_active": True,
        "last_found_update": "2026-04-11",
        "total_updates_found": 2
    },
    {
        "id": "src-004",
        "tool_id": "anthropic-api",
        "source_type": "github_releases",
        "url": "https://github.com/anthropics/anthropic-sdk-python/releases",
        "label": "Anthropic Python SDK Releases",
        "last_checked": "2026-04-12",
        "check_frequency": "weekly",
        "is_active": True,
        "last_found_update": "2026-04-05",
        "total_updates_found": 8
    }
]

data["review_queue"] = [
    {
        "id": "rev-001",
        "tool_id": "chatgpt",
        "flagged_at": "2026-04-11",
        "reason": "עדכון מחיר ממתין לאישור + freshness_score נמוך. יש לוודא שהתוכניות מעודכנות.",
        "severity": "medium",
        "category": "conflicting_update",
        "status": "open",
        "linked_update_id": "upd-002"
    },
    {
        "id": "rev-002",
        "tool_id": "cursor",
        "flagged_at": "2026-04-12",
        "reason": "גרסה חדשה (0.45) עם Background Agent — ייתכן שה-wiki וה-handoff_steps מיושנים.",
        "severity": "high",
        "category": "conflicting_update",
        "status": "open",
        "linked_update_id": "upd-001"
    }
]

# ── C. Update stats ───────────────────────────────────────────────────────────
stats_update = {
    "total_tools": 36,
    "total_ecosystems": 11,
    "tools_with_wiki": 33,
    "tools_researched": 3,
    "tools_update_pending": 1,
    "tools_needs_review": 2,
    "tools_inventory_only": 24,
    "pending_backfill": 4,
    "open_review_items": 2,
    "active_sources": 4,
    "last_wiki_sync": "2026-04-13",
    "last_updated": "2026-04-13",
}

if "stats" not in data:
    data["stats"] = {}
data["stats"].update(stats_update)

# ── D. Version + last_updated ─────────────────────────────────────────────────
data["version"] = "2.0.0"
data["last_updated"] = "2026-04-13"

# ── Write ─────────────────────────────────────────────────────────────────────
with open(FILE_PATH, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Migration complete.")
print("Top-level keys:", list(data.keys()))
print("Stats:")
for k, v in data["stats"].items():
    print(f"  {k}: {v}")

# Spot-check a few tools
print("\nSpot-check tool research_status values:")
for tool in data["tools"]:
    tid = tool["id"]
    if tid in {"claude-code", "claude-ai-web", "anthropic-api", "cursor", "chatgpt"}:
        print(f"  {tid}: research_status={tool['research_status']}, "
              f"last_research_date={tool['last_research_date']}, "
              f"has_pending_updates={tool['has_pending_updates']}, "
              f"research_record_ids={tool['research_record_ids']}")
