"""
score_from_text.py
Reads scraped wiki files and asks Claude to extract task_scores
based ONLY on the official website text — no training knowledge.

Usage:
    python scripts/score_from_text.py                     # all 8 rich tools
    python scripts/score_from_text.py --tool elevenlabs   # single tool
    python scripts/score_from_text.py --all               # all 15 scraped tools
    python scripts/score_from_text.py --dry               # parse only, no API call
"""

import argparse
import json
import os
import re
import sys
import time
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from google import genai

ROOT       = Path(__file__).parent.parent
TOOLS_FILE = ROOT / "data" / "tools_master.json"
WIKI_DIR   = ROOT / "data" / "wiki"

# Load .env from project root (one level above backend/)
load_dotenv(ROOT / ".env")
load_dotenv(ROOT.parent / ".env")

# ── Scoring schema (11 categories, 67 sub-fields) ───────────────────────────

SCHEMA_DESCRIPTION = """\
Fill in the following JSON schema. Rules:
- Scores are integers 0-10 (10 = best in class for that category).
- Use null for any field where the text gives NO information.
- Do NOT use your training knowledge — base every non-null value on the text.
- For each non-null score add a brief "evidence" note (max 20 words) citing the exact phrase from the text.

Schema to fill:
{
  "coding":        {"overall":null,"code_generation":null,"code_review":null,"debugging":null,"refactoring":null,"test_writing":null,"multi_file_projects":null},
  "research":      {"overall":null,"web_search":null,"source_quality":null,"fact_checking":null,"summarization":null},
  "writing":       {"overall":null,"creative_writing":null,"technical_writing":null,"editing":null,"translation":null,"tone_adaptation":null},
  "image_gen":     {"overall":null,"photorealism":null,"artistic_style":null,"text_in_image":null,"consistency":null,"editing":null},
  "video_gen":     {"overall":null,"short_clips":null,"long_form":null,"lip_sync":null,"style_transfer":null},
  "audio_gen":     {"overall":null,"voice_cloning":null,"music_gen":null,"sound_effects":null,"transcription":null},
  "automation":    {"overall":null,"no_code_workflows":null,"api_integrations":null,"scheduling":null,"data_processing":null},
  "data_analysis": {"overall":null,"spreadsheet":null,"visualization":null,"sql":null,"python_r":null},
  "presentation":  {"overall":null,"slide_design":null,"content_gen":null,"templates":null},
  "deployment":    {"overall":null,"hosting":null,"ci_cd":null,"monitoring":null,"scaling":null},
  "agent_tasks":   {"overall":null,"planning":null,"tool_use":null,"memory":null,"multi_step":null,"human_in_loop":null}
}

Also return:
- "evidence": a dict mapping "category.field" -> "exact quote from text" for every non-null value
- "confidence": a float 0.0-1.0 reflecting how well the text supports the filled fields
- "null_reason": brief note on why most fields are null (e.g. "tool is audio-only")
"""

# Rich tools (>5K chars) that also exist in tools_master.json — process these first
# NOTE: github-copilot, google-workspace, v0-vercel are NOT in tools_master.json (not added yet)
RICH_TOOLS = [
    "windsurf",
    "elevenlabs",
    "heygen",
    "perplexity",
    "notebooklm",
    "microsoft-copilot",
]

# All scraped tools that ARE in tools_master.json
ALL_SCRAPED = RICH_TOOLS + ["replit", "lovable", "runway", "suno", "bolt", "kling"]

MAX_WIKI_CHARS = 12_000   # trim to avoid huge prompts


def null_scores() -> dict:
    return {
        "coding":        {"overall": None, "code_generation": None, "code_review": None,
                          "debugging": None, "refactoring": None, "test_writing": None,
                          "multi_file_projects": None},
        "research":      {"overall": None, "web_search": None, "source_quality": None,
                          "fact_checking": None, "summarization": None},
        "writing":       {"overall": None, "creative_writing": None, "technical_writing": None,
                          "editing": None, "translation": None, "tone_adaptation": None},
        "image_gen":     {"overall": None, "photorealism": None, "artistic_style": None,
                          "text_in_image": None, "consistency": None, "editing": None},
        "video_gen":     {"overall": None, "short_clips": None, "long_form": None,
                          "lip_sync": None, "style_transfer": None},
        "audio_gen":     {"overall": None, "voice_cloning": None, "music_gen": None,
                          "sound_effects": None, "transcription": None},
        "automation":    {"overall": None, "no_code_workflows": None, "api_integrations": None,
                          "scheduling": None, "data_processing": None},
        "data_analysis": {"overall": None, "spreadsheet": None, "visualization": None,
                          "sql": None, "python_r": None},
        "presentation":  {"overall": None, "slide_design": None, "content_gen": None,
                          "templates": None},
        "deployment":    {"overall": None, "hosting": None, "ci_cd": None,
                          "monitoring": None, "scaling": None},
        "agent_tasks":   {"overall": None, "planning": None, "tool_use": None,
                          "memory": None, "multi_step": None, "human_in_loop": None},
    }


def count_filled(scores: dict) -> int:
    n = 0
    for cat in scores.values():
        if isinstance(cat, dict):
            n += sum(1 for v in cat.values() if v is not None)
    return n


def ask_llm(tool_name: str, wiki_text: str, dry: bool = False) -> dict | None:
    """Call Gemini Flash and return parsed JSON response."""
    trimmed = wiki_text[:MAX_WIKI_CHARS]

    prompt = (
        f"Here is the official content scraped from **{tool_name}**'s website:\n\n"
        f"---\n{trimmed}\n---\n\n"
        f"{SCHEMA_DESCRIPTION}\n\n"
        "Return ONLY a valid JSON object with keys: "
        '"task_scores", "evidence", "confidence", "null_reason". '
        "No markdown, no explanation, just the JSON."
    )

    if dry:
        print(f"  [DRY] Would send {len(prompt):,} chars to Gemini Flash")
        return None

    api_key = os.environ.get("GEMINI_API_KEY", "")
    if not api_key:
        print("  ERROR: GEMINI_API_KEY not set")
        return None

    try:
        client = genai.Client(api_key=api_key)
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=prompt,
        )
        raw = response.text.strip()
        # Strip markdown code fences if present
        raw = re.sub(r"^```(?:json)?\s*", "", raw)
        raw = re.sub(r"\s*```$", "", raw)
        return json.loads(raw)
    except json.JSONDecodeError as e:
        print(f"  JSON parse error: {e}")
        print(f"  Raw response (first 300): {raw[:300]}")
        return None
    except Exception as e:
        print(f"  API error: {e}")
        return None


def process_tool(tool_id: str, data: dict, dry: bool = False) -> bool:
    wiki_path = WIKI_DIR / f"{tool_id}.md"
    if not wiki_path.exists():
        print(f"  SKIP: no wiki file at {wiki_path}")
        return False

    # Find tool in tools_master.json
    tool = next((t for t in data["tools"] if t["id"] == tool_id), None)
    if not tool:
        print(f"  SKIP: tool '{tool_id}' not in tools_master.json")
        return False

    wiki_text = wiki_path.read_text(encoding="utf-8")
    print(f"\n[{tool_id}] {tool.get('name', tool_id)}  ({len(wiki_text):,} chars in wiki)")

    result = ask_llm(tool.get("name", tool_id), wiki_text, dry=dry)
    if result is None:
        return False

    scores    = result.get("task_scores", null_scores())
    evidence  = result.get("evidence", {})
    conf      = float(result.get("confidence", 0.5))
    null_note = result.get("null_reason", "")
    filled    = count_filled(scores)
    nulls     = 67 - filled

    # Merge into base schema (in case Claude omitted some keys)
    base = null_scores()
    for cat, sub in scores.items():
        if cat in base and isinstance(sub, dict):
            for field, val in sub.items():
                if field in base[cat]:
                    base[cat][field] = val

    tool["task_scores"] = base
    tool["task_scores_meta"] = {
        "data_source":  "official_website_crawl",
        "source_urls":  [str(wiki_path.name)],
        "confidence":   conf,
        "last_updated": datetime.now().strftime("%Y-%m-%d"),
        "fields_filled": filled,
        "fields_null":  nulls,
        "evidence":     evidence,
        "null_reason":  null_note,
    }

    # Save after every tool
    TOOLS_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(f"  SAVED: filled={filled}/67  conf={conf:.2f}  null_reason={null_note[:60]}")

    # Print 3 sample evidence items
    if evidence:
        print("  Sample evidence:")
        for i, (key, quote) in enumerate(list(evidence.items())[:3]):
            print(f"    {key}: \"{quote[:80]}\"")

    return True


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--tool",  help="Process a single tool by id")
    parser.add_argument("--all",   action="store_true", help="All 15 scraped tools")
    parser.add_argument("--dry",   action="store_true", help="No API calls, just show prompt size")
    args = parser.parse_args()

    data = json.loads(TOOLS_FILE.read_text(encoding="utf-8"))

    if args.tool:
        target_ids = [args.tool]
    elif args.all:
        target_ids = ALL_SCRAPED
    else:
        target_ids = RICH_TOOLS   # default: rich tools only

    print(f"Processing {len(target_ids)} tools: {target_ids}")
    print("=" * 60)

    ok = fail = 0
    for tool_id in target_ids:
        if process_tool(tool_id, data, dry=args.dry):
            ok += 1
        else:
            fail += 1
        if not args.dry:
            time.sleep(0.5)   # gentle API pacing

    print(f"\n=== DONE: {ok} succeeded, {fail} failed ===")

    # Summary of data_source distribution
    by_src: dict[str, int] = {}
    for t in data["tools"]:
        m = t.get("task_scores_meta") or {}
        src = m.get("data_source", "manual_verified" if m is None else "unverified")
        if t.get("task_scores_meta") is None:
            src = "manual_verified"
        by_src[src] = by_src.get(src, 0) + 1

    print("\ndata_source distribution:")
    for k, v in sorted(by_src.items(), key=lambda x: -x[1]):
        print(f"  {k:<35} {v} tools")


if __name__ == "__main__":
    main()
