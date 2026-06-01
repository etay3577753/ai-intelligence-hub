"""
fill_task_scores.py
Uses Perplexity Sonar Pro to fill task_scores for tools that still have all-null values.

Usage:
  python scripts/fill_task_scores.py            # fills first 5 empty tools
  python scripts/fill_task_scores.py --batch 10 # fills first 10
  python scripts/fill_task_scores.py --all      # fills ALL empty tools (slow + expensive)

Progress is saved after each tool, so the script is safe to interrupt and re-run.
"""

import json
import os
import sys
import time
import argparse
from pathlib import Path
import urllib.request
import urllib.error

# ── Config ─────────────────────────────────────────────────────────────────────
ROOT       = Path(__file__).parent.parent
TOOLS_FILE = ROOT / "data" / "tools_master.json"

# Load key from .env manually (no dotenv dependency required at runtime)
def _load_env():
    # Try backend/.env first, then project root .env
    candidates = [ROOT / ".env", ROOT.parent / ".env"]
    for env_file in candidates:
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    os.environ.setdefault(k.strip(), v.strip())
            break

_load_env()
PERPLEXITY_KEY = os.getenv("PERPLEXITY_API_KEY", "")

SCORE_SCHEMA_KEYS = {
    "coding":                     ["overall", "code_generation", "code_review", "debugging", "refactoring", "test_writing", "multi_file_projects"],
    "writing":                    ["overall", "long_form", "technical_writing", "creative_writing", "editing_proofreading", "summarization", "multilingual_writing"],
    "research":                   ["overall", "web_search", "deep_analysis", "fact_checking", "synthesis", "academic_sources"],
    "media_creation":             ["overall", "image_generation", "video_generation", "audio_generation", "avatar_creation", "music_generation", "voice_cloning"],
    "data_and_analysis":          ["overall", "csv_excel", "data_visualization", "sql_queries", "statistics", "python_data_science"],
    "automation_and_integrations":["overall", "api_integrations", "workflow_automation", "webhooks", "no_code_automation", "scheduled_tasks"],
    "ecosystem_synergy":          ["overall", "native_ecosystem_depth", "cross_platform", "open_source_compat", "third_party_integrations"],
    "language_support":           ["overall", "hebrew", "english", "other_languages", "rtl_support", "programming_languages"],
    "deployment_and_scale":       ["overall", "api_access", "enterprise_features", "self_hosting", "cost_efficiency_at_scale", "rate_limits"],
    "education_and_learning":     ["overall", "explanations_clarity", "tutoring", "quiz_generation", "curriculum_design"],
    "agent_and_agentic":          ["overall", "tool_use", "multi_step_tasks", "memory", "autonomy", "multi_agent_orchestration"],
}


def _null_template() -> dict:
    return {cat: {k: None for k in keys} for cat, keys in SCORE_SCHEMA_KEYS.items()}


def _is_empty(task_scores: dict) -> bool:
    """Return True if every single sub-field is None."""
    return all(
        v is None
        for cat in task_scores.values()
        for v in cat.values()
    )


def _build_prompt(tool_name: str, tool_link: str, template: dict) -> str:
    template_str = json.dumps(template, ensure_ascii=False, indent=2)
    return f"""You are an expert AI tool analyst with deep knowledge of every AI product.

Tool: "{tool_name}"
URL: {tool_link or 'unknown'}

Fill in the following task_scores JSON with integer scores 0-10 or null.
Scoring guide:
  10 = best-in-class (world leading)
  8-9 = very strong
  6-7 = good, above average
  4-5 = adequate / below average
  2-3 = poor / barely supported
  0-1 = not supported at all
  null = you genuinely have no data about this capability for this tool

Return ONLY valid JSON — no explanation, no markdown fences, no extra text.
Start your response with {{ and end with }}.

Template to fill:
{template_str}"""


def _call_perplexity(prompt: str) -> str:
    """Call Perplexity sonar-pro and return the raw text response."""
    if not PERPLEXITY_KEY:
        raise RuntimeError("PERPLEXITY_API_KEY not set in .env")

    payload = json.dumps({
        "model": "sonar-pro",
        "messages": [
            {"role": "system", "content": "You are a precise AI analyst. Return only valid JSON."},
            {"role": "user", "content": prompt},
        ],
        "max_tokens": 2000,
        "temperature": 0.1,
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.perplexity.ai/chat/completions",
        data=payload,
        headers={
            "Authorization": f"Bearer {PERPLEXITY_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    with urllib.request.urlopen(req, timeout=30) as resp:
        data = json.loads(resp.read())

    return data["choices"][0]["message"]["content"].strip()


def _extract_json(raw: str) -> dict:
    """Extract JSON object from raw model output, even if there's surrounding text."""
    # Strip markdown fences
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("```", 2)[1]
        if raw.startswith("json"):
            raw = raw[4:]
        raw = raw.rsplit("```", 1)[0]

    # Find outermost { ... }
    start = raw.find("{")
    end   = raw.rfind("}") + 1
    if start == -1 or end == 0:
        raise ValueError("No JSON object found in response")

    return json.loads(raw[start:end])


def _merge_into_template(template: dict, filled: dict) -> dict:
    """Merge filled values into template, keeping template keys, clamping ints to 0-10."""
    result = {}
    for cat, fields in template.items():
        result[cat] = {}
        filled_cat = filled.get(cat, {})
        for field in fields:
            val = filled_cat.get(field, None)
            if val is None:
                result[cat][field] = None
            elif isinstance(val, (int, float)):
                result[cat][field] = int(max(0, min(10, val)))
            else:
                result[cat][field] = None   # unexpected type → null
    return result


def fill_tools(batch_size: int = 5) -> None:
    if not PERPLEXITY_KEY:
        print("ERROR: PERPLEXITY_API_KEY not set in .env")
        sys.exit(1)

    data  = json.loads(TOOLS_FILE.read_text(encoding="utf-8"))
    tools = data["tools"]

    empty_tools = [t for t in tools if _is_empty(t.get("task_scores", _null_template()))]
    to_process  = empty_tools[:batch_size]

    print(f"Total empty tools : {len(empty_tools)}")
    print(f"Processing batch  : {len(to_process)}")
    print("-" * 50)

    updated = 0
    failed  = 0

    for tool in to_process:
        tid  = tool["id"]
        name = tool.get("name", tid)
        link = tool.get("link", "")

        print(f"  [{updated+failed+1}/{len(to_process)}] {tid} ({name})...")

        template = _null_template()
        prompt   = _build_prompt(name, link, template)

        try:
            raw    = _call_perplexity(prompt)
            filled = _extract_json(raw)
            merged = _merge_into_template(template, filled)

            # Patch the tool in place
            for t in tools:
                if t["id"] == tid:
                    t["task_scores"] = merged
                    break

            # Save after every tool (safe against interruption)
            TOOLS_FILE.write_text(
                json.dumps(data, ensure_ascii=False, indent=2),
                encoding="utf-8"
            )

            non_null = sum(1 for cat in merged.values() for v in cat.values() if v is not None)
            print(f"    OK -- {non_null} fields filled")
            updated += 1

        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", errors="replace")
            if "insufficient_quota" in body or exc.code in (402, 429):
                print(f"    QUOTA EXHAUSTED (HTTP {exc.code}) -- stopping.")
                print("    Recharge at: https://www.perplexity.ai/settings/api")
                break
            elif exc.code == 401:
                print(f"    AUTH ERROR -- check PERPLEXITY_API_KEY in .env")
                print(f"    Details: {body[:200]}")
                break
            print(f"    HTTP {exc.code}: {body[:120]}")
            failed += 1
        except Exception as exc:
            print(f"    FAILED: {exc}")
            failed += 1

        # Small delay to stay within rate limits
        time.sleep(1.5)

    # ── Final report ──────────────────────────────────────────────────────────
    print("\n" + "=" * 50)
    print(f"Batch done: {updated} updated, {failed} failed")

    # Recount remaining empties
    data2        = json.loads(TOOLS_FILE.read_text(encoding="utf-8"))
    still_empty  = sum(1 for t in data2["tools"] if _is_empty(t.get("task_scores", _null_template())))
    still_scored = len(data2["tools"]) - still_empty
    print(f"Tools with scores : {still_scored}/{len(data2['tools'])}")
    print(f"Still empty       : {still_empty}")
    print("=" * 50)


# ── CLI ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fill task_scores via Perplexity")
    group  = parser.add_mutually_exclusive_group()
    group.add_argument("--batch", type=int, default=5, help="Number of tools to process (default: 5)")
    group.add_argument("--all",   action="store_true",  help="Process ALL empty tools")
    args = parser.parse_args()

    batch = 9999 if args.all else args.batch
    fill_tools(batch_size=batch)
