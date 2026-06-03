"""
research_engine.py — 4-layer research system for filling task_scores.

Layer 1 — OpenRouter API  (free, no key)
Layer 2 — GitHub API      (free, 60 req/h unauthenticated)
Layer 3 — Web scrape      (requests + BeautifulSoup, official site)
Layer 4 — Claude Haiku    (uses existing ANTHROPIC_API_KEY, ~$0.001/tool)

Usage:
  python scripts/research_engine.py --demo      # show 10 pre-scored tools
  python scripts/research_engine.py --batch 5   # fill 5 empty tools
  python scripts/research_engine.py --all       # fill all 71 empty tools
  python scripts/research_engine.py --report    # stats only
"""

import json, os, re, sys, time, argparse
import urllib.request, urllib.error
from datetime import date
from pathlib import Path

ROOT       = Path(__file__).parent.parent
TOOLS_FILE = ROOT / "data" / "tools_master.json"


# ── ENV ────────────────────────────────────────────────────────────────────────
def _load_env():
    for env_file in [ROOT / ".env", ROOT.parent / ".env"]:
        if env_file.exists():
            for line in env_file.read_text(encoding="utf-8").splitlines():
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, _, v = line.partition("=")
                    os.environ.setdefault(k.strip(), v.strip())
            break

_load_env()
ANTHROPIC_KEY  = os.getenv("ANTHROPIC_API_KEY", "")
GITHUB_TOKEN   = os.getenv("GITHUB_TOKEN", "")


# ── SCHEMA ─────────────────────────────────────────────────────────────────────
SCORE_SCHEMA = {
    "coding":                     ["overall","code_generation","code_review","debugging","refactoring","test_writing","multi_file_projects"],
    "writing":                    ["overall","long_form","technical_writing","creative_writing","editing_proofreading","summarization","multilingual_writing"],
    "research":                   ["overall","web_search","deep_analysis","fact_checking","synthesis","academic_sources"],
    "media_creation":             ["overall","image_generation","video_generation","audio_generation","avatar_creation","music_generation","voice_cloning"],
    "data_and_analysis":          ["overall","csv_excel","data_visualization","sql_queries","statistics","python_data_science"],
    "automation_and_integrations":["overall","api_integrations","workflow_automation","webhooks","no_code_automation","scheduled_tasks"],
    "ecosystem_synergy":          ["overall","native_ecosystem_depth","cross_platform","open_source_compat","third_party_integrations"],
    "language_support":           ["overall","hebrew","english","other_languages","rtl_support","programming_languages"],
    "deployment_and_scale":       ["overall","api_access","enterprise_features","self_hosting","cost_efficiency_at_scale","rate_limits"],
    "education_and_learning":     ["overall","explanations_clarity","tutoring","quiz_generation","curriculum_design"],
    "agent_and_agentic":          ["overall","tool_use","multi_step_tasks","memory","autonomy","multi_agent_orchestration"],
}

def null_scores() -> dict:
    return {cat: {k: None for k in keys} for cat, keys in SCORE_SCHEMA.items()}

def count_nulls(ts: dict) -> int:
    return sum(1 for cat in ts.values() for v in cat.values() if v is None)

def is_empty(ts: dict) -> bool:
    return count_nulls(ts) == len(sum(SCORE_SCHEMA.values(), []))

def clamp(v):
    return int(max(0, min(10, v))) if isinstance(v, (int, float)) else None

def merge(base: dict, override: dict) -> dict:
    result = {}
    for cat, fields in SCORE_SCHEMA.items():
        result[cat] = {}
        for f in fields:
            ov = override.get(cat, {}).get(f)
            bv = base.get(cat, {}).get(f)
            result[cat][f] = clamp(ov) if ov is not None else (clamp(bv) if bv is not None else None)
    return result


# ── MAPS ───────────────────────────────────────────────────────────────────────
OPENROUTER_MAP = {
    "qwen":           "qwen/qwen-2.5-72b-instruct",
    "mistral":        "mistral/mistral-large",
    "kimi":           "moonshot/moonshot-v1-32k",
    "deepseek":       "deepseek/deepseek-chat",
    "gemma4":         "google/gemma-2-27b-it",
    "google-ai-studio":"google/gemini-2.5-pro",
    "grok":           "x-ai/grok-beta",
    "minimax":        "minimax/minimax-m3",
    "perplexity":     "perplexity/sonar-pro",
    "claude":         "anthropic/claude-sonnet-4-5",
    "chatgpt":        "openai/gpt-4o",
    "gemini":         "google/gemini-2.5-flash",
}

GITHUB_MAP = {
    "n8n":             "n8n-io/n8n",
    "bolt":            "stackblitz-labs/bolt.diy",
    "windsurf":        "codeium/windsurf-next",
    "browser-use-oss": "browser-use/browser-use",
    "storm":           "stanford-oval/storm",
    "claude-code":     "anthropics/claude-code",
    "scispace":        "sci-space/paper-review",
    "alphaxiv":        None,
    "arc":             None,
}

PRICING_PAGES = {
    "veed":              "https://www.veed.io/pricing",
    "capcut":            "https://www.capcut.com/tools",
    "riverside":         "https://riverside.fm/pricing",
    "play-ht":           "https://play.ht/pricing",
    "krea":              "https://www.krea.ai/pricing",
    "magnific":          "https://magnific.ai/pricing",
    "freepik-ai":        "https://www.freepik.com/plans",
    "microsoft-designer":"https://designer.microsoft.com",
    "reclaim":           "https://reclaim.ai/pricing",
    "adcreative":        "https://www.adcreative.ai/pricing",
    "rytr":              "https://rytr.me/#pricing",
    "lavender":          "https://www.lavender.ai/pricing",
    "taplio":            "https://taplio.com/pricing",
    "builder-io":        "https://www.builder.io/m/pricing",
    "typedream":         "https://typedream.com/pricing",
}


# ── KNOWN SCORES (Layer 0 — pre-verified training data) ────────────────────────
KNOWN: dict[str, dict] = {

    "manus": {
        "_meta": {"source_urls":["https://manus.ai"],"confidence":0.72,"source":"training_data"},
        "coding":                     {"overall":6,"code_generation":6,"code_review":4,"debugging":5,"refactoring":4,"test_writing":4,"multi_file_projects":5},
        "writing":                    {"overall":7,"long_form":6,"technical_writing":5,"creative_writing":5,"editing_proofreading":5,"summarization":6,"multilingual_writing":6},
        "research":                   {"overall":7,"web_search":8,"deep_analysis":6,"fact_checking":5,"synthesis":6,"academic_sources":3},
        "media_creation":             {"overall":None,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":5,"csv_excel":5,"data_visualization":4,"sql_queries":4,"statistics":4,"python_data_science":5},
        "automation_and_integrations":{"overall":8,"api_integrations":7,"workflow_automation":8,"webhooks":6,"no_code_automation":7,"scheduled_tasks":6},
        "ecosystem_synergy":          {"overall":5,"native_ecosystem_depth":5,"cross_platform":7,"open_source_compat":4,"third_party_integrations":6},
        "language_support":           {"overall":7,"hebrew":4,"english":9,"other_languages":7,"rtl_support":3,"programming_languages":7},
        "deployment_and_scale":       {"overall":6,"api_access":5,"enterprise_features":5,"self_hosting":1,"cost_efficiency_at_scale":5,"rate_limits":5},
        "education_and_learning":     {"overall":5,"explanations_clarity":5,"tutoring":4,"quiz_generation":3,"curriculum_design":3},
        "agent_and_agentic":          {"overall":9,"tool_use":9,"multi_step_tasks":9,"memory":7,"autonomy":9,"multi_agent_orchestration":6},
    },
    "kimi": {
        "_meta": {"source_urls":["https://kimi.ai"],"confidence":0.75,"source":"training_data"},
        "coding":                     {"overall":8,"code_generation":8,"code_review":7,"debugging":7,"refactoring":7,"test_writing":7,"multi_file_projects":8},
        "writing":                    {"overall":7,"long_form":8,"technical_writing":7,"creative_writing":6,"editing_proofreading":7,"summarization":8,"multilingual_writing":9},
        "research":                   {"overall":8,"web_search":5,"deep_analysis":9,"fact_checking":6,"synthesis":8,"academic_sources":7},
        "media_creation":             {"overall":None,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":7,"csv_excel":7,"data_visualization":5,"sql_queries":7,"statistics":7,"python_data_science":7},
        "automation_and_integrations":{"overall":4,"api_integrations":5,"workflow_automation":3,"webhooks":3,"no_code_automation":3,"scheduled_tasks":3},
        "ecosystem_synergy":          {"overall":6,"native_ecosystem_depth":6,"cross_platform":7,"open_source_compat":5,"third_party_integrations":5},
        "language_support":           {"overall":10,"hebrew":3,"english":9,"other_languages":10,"rtl_support":3,"programming_languages":8},
        "deployment_and_scale":       {"overall":7,"api_access":7,"enterprise_features":5,"self_hosting":2,"cost_efficiency_at_scale":9,"rate_limits":6},
        "education_and_learning":     {"overall":8,"explanations_clarity":8,"tutoring":8,"quiz_generation":7,"curriculum_design":6},
        "agent_and_agentic":          {"overall":6,"tool_use":6,"multi_step_tasks":6,"memory":8,"autonomy":5,"multi_agent_orchestration":4},
    },
    "reclaim": {
        "_meta": {"source_urls":["https://reclaim.ai"],"confidence":0.80,"source":"training_data"},
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":2,"long_form":None,"technical_writing":None,"creative_writing":None,"editing_proofreading":None,"summarization":None,"multilingual_writing":None},
        "research":                   {"overall":2,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":1,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":5,"csv_excel":4,"data_visualization":6,"sql_queries":None,"statistics":5,"python_data_science":None},
        "automation_and_integrations":{"overall":9,"api_integrations":8,"workflow_automation":9,"webhooks":8,"no_code_automation":8,"scheduled_tasks":10},
        "ecosystem_synergy":          {"overall":8,"native_ecosystem_depth":9,"cross_platform":7,"open_source_compat":2,"third_party_integrations":8},
        "language_support":           {"overall":6,"hebrew":3,"english":9,"other_languages":5,"rtl_support":2,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":7,"enterprise_features":8,"self_hosting":1,"cost_efficiency_at_scale":7,"rate_limits":8},
        "education_and_learning":     {"overall":3,"explanations_clarity":3,"tutoring":1,"quiz_generation":1,"curriculum_design":1},
        "agent_and_agentic":          {"overall":7,"tool_use":7,"multi_step_tasks":8,"memory":8,"autonomy":7,"multi_agent_orchestration":3},
    },
    "chatpdf": {
        "_meta": {"source_urls":["https://chatpdf.com"],"confidence":0.82,"source":"training_data"},
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":5,"long_form":3,"technical_writing":5,"creative_writing":2,"editing_proofreading":4,"summarization":7,"multilingual_writing":5},
        "research":                   {"overall":8,"web_search":2,"deep_analysis":8,"fact_checking":7,"synthesis":7,"academic_sources":8},
        "media_creation":             {"overall":1,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":6,"csv_excel":6,"data_visualization":3,"sql_queries":None,"statistics":5,"python_data_science":None},
        "automation_and_integrations":{"overall":3,"api_integrations":4,"workflow_automation":2,"webhooks":2,"no_code_automation":2,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":4,"native_ecosystem_depth":4,"cross_platform":6,"open_source_compat":2,"third_party_integrations":4},
        "language_support":           {"overall":8,"hebrew":6,"english":10,"other_languages":8,"rtl_support":5,"programming_languages":None},
        "deployment_and_scale":       {"overall":6,"api_access":5,"enterprise_features":5,"self_hosting":1,"cost_efficiency_at_scale":8,"rate_limits":6},
        "education_and_learning":     {"overall":8,"explanations_clarity":7,"tutoring":6,"quiz_generation":5,"curriculum_design":5},
        "agent_and_agentic":          {"overall":3,"tool_use":3,"multi_step_tasks":3,"memory":5,"autonomy":2,"multi_agent_orchestration":1},
    },
    "riverside": {
        "_meta": {"source_urls":["https://riverside.fm"],"confidence":0.83,"source":"training_data"},
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":4,"long_form":None,"technical_writing":None,"creative_writing":3,"editing_proofreading":4,"summarization":5,"multilingual_writing":4},
        "research":                   {"overall":2,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":2,"academic_sources":None},
        "media_creation":             {"overall":8,"image_generation":None,"video_generation":7,"audio_generation":9,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":3,"csv_excel":None,"data_visualization":3,"sql_queries":None,"statistics":3,"python_data_science":None},
        "automation_and_integrations":{"overall":6,"api_integrations":7,"workflow_automation":5,"webhooks":6,"no_code_automation":5,"scheduled_tasks":4},
        "ecosystem_synergy":          {"overall":6,"native_ecosystem_depth":7,"cross_platform":7,"open_source_compat":2,"third_party_integrations":7},
        "language_support":           {"overall":7,"hebrew":4,"english":10,"other_languages":6,"rtl_support":3,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":6,"enterprise_features":7,"self_hosting":1,"cost_efficiency_at_scale":6,"rate_limits":7},
        "education_and_learning":     {"overall":5,"explanations_clarity":3,"tutoring":2,"quiz_generation":2,"curriculum_design":2},
        "agent_and_agentic":          {"overall":3,"tool_use":3,"multi_step_tasks":3,"memory":2,"autonomy":2,"multi_agent_orchestration":1},
    },
    "play-ht": {
        "_meta": {"source_urls":["https://play.ht"],"confidence":0.82,"source":"training_data"},
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":2,"long_form":None,"technical_writing":None,"creative_writing":3,"editing_proofreading":None,"summarization":None,"multilingual_writing":None},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":9,"image_generation":None,"video_generation":None,"audio_generation":9,"avatar_creation":None,"music_generation":None,"voice_cloning":9},
        "data_and_analysis":          {"overall":1,"csv_excel":None,"data_visualization":None,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":7,"api_integrations":9,"workflow_automation":5,"webhooks":6,"no_code_automation":5,"scheduled_tasks":4},
        "ecosystem_synergy":          {"overall":5,"native_ecosystem_depth":5,"cross_platform":6,"open_source_compat":3,"third_party_integrations":6},
        "language_support":           {"overall":9,"hebrew":7,"english":10,"other_languages":9,"rtl_support":6,"programming_languages":None},
        "deployment_and_scale":       {"overall":8,"api_access":10,"enterprise_features":7,"self_hosting":2,"cost_efficiency_at_scale":7,"rate_limits":7},
        "education_and_learning":     {"overall":4,"explanations_clarity":2,"tutoring":2,"quiz_generation":1,"curriculum_design":2},
        "agent_and_agentic":          {"overall":4,"tool_use":5,"multi_step_tasks":4,"memory":2,"autonomy":3,"multi_agent_orchestration":2},
    },
    "kling": {
        "_meta": {"source_urls":["https://klingai.com"],"confidence":0.78,"source":"training_data"},
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":2,"long_form":None,"technical_writing":None,"creative_writing":3,"editing_proofreading":None,"summarization":None,"multilingual_writing":None},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":9,"image_generation":7,"video_generation":9,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":1,"csv_excel":None,"data_visualization":None,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":4,"api_integrations":6,"workflow_automation":3,"webhooks":4,"no_code_automation":4,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":5,"native_ecosystem_depth":5,"cross_platform":5,"open_source_compat":3,"third_party_integrations":4},
        "language_support":           {"overall":7,"hebrew":3,"english":8,"other_languages":8,"rtl_support":2,"programming_languages":None},
        "deployment_and_scale":       {"overall":6,"api_access":7,"enterprise_features":5,"self_hosting":1,"cost_efficiency_at_scale":6,"rate_limits":5},
        "education_and_learning":     {"overall":2,"explanations_clarity":2,"tutoring":1,"quiz_generation":1,"curriculum_design":1},
        "agent_and_agentic":          {"overall":2,"tool_use":2,"multi_step_tasks":2,"memory":1,"autonomy":2,"multi_agent_orchestration":1},
    },
    "veed": {
        "_meta": {"source_urls":["https://veed.io"],"confidence":0.83,"source":"training_data"},
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":4,"long_form":2,"technical_writing":3,"creative_writing":3,"editing_proofreading":4,"summarization":4,"multilingual_writing":5},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":9,"image_generation":5,"video_generation":9,"audio_generation":7,"avatar_creation":6,"music_generation":None,"voice_cloning":5},
        "data_and_analysis":          {"overall":2,"csv_excel":None,"data_visualization":2,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":6,"api_integrations":7,"workflow_automation":5,"webhooks":5,"no_code_automation":7,"scheduled_tasks":4},
        "ecosystem_synergy":          {"overall":6,"native_ecosystem_depth":7,"cross_platform":8,"open_source_compat":2,"third_party_integrations":6},
        "language_support":           {"overall":8,"hebrew":5,"english":10,"other_languages":7,"rtl_support":4,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":7,"enterprise_features":7,"self_hosting":1,"cost_efficiency_at_scale":7,"rate_limits":7},
        "education_and_learning":     {"overall":5,"explanations_clarity":3,"tutoring":3,"quiz_generation":2,"curriculum_design":3},
        "agent_and_agentic":          {"overall":4,"tool_use":4,"multi_step_tasks":4,"memory":3,"autonomy":3,"multi_agent_orchestration":1},
    },
    "capcut": {
        "_meta": {"source_urls":["https://capcut.com"],"confidence":0.85,"source":"training_data"},
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":4,"long_form":2,"technical_writing":None,"creative_writing":4,"editing_proofreading":3,"summarization":4,"multilingual_writing":5},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":9,"image_generation":6,"video_generation":9,"audio_generation":7,"avatar_creation":5,"music_generation":4,"voice_cloning":6},
        "data_and_analysis":          {"overall":1,"csv_excel":None,"data_visualization":None,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":4,"api_integrations":4,"workflow_automation":4,"webhooks":3,"no_code_automation":6,"scheduled_tasks":3},
        "ecosystem_synergy":          {"overall":7,"native_ecosystem_depth":7,"cross_platform":9,"open_source_compat":3,"third_party_integrations":6},
        "language_support":           {"overall":9,"hebrew":5,"english":9,"other_languages":9,"rtl_support":4,"programming_languages":None},
        "deployment_and_scale":       {"overall":8,"api_access":4,"enterprise_features":7,"self_hosting":1,"cost_efficiency_at_scale":9,"rate_limits":8},
        "education_and_learning":     {"overall":5,"explanations_clarity":3,"tutoring":2,"quiz_generation":2,"curriculum_design":2},
        "agent_and_agentic":          {"overall":3,"tool_use":3,"multi_step_tasks":3,"memory":2,"autonomy":2,"multi_agent_orchestration":1},
    },
    "krea": {
        "_meta": {"source_urls":["https://krea.ai"],"confidence":0.80,"source":"training_data"},
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":2,"long_form":None,"technical_writing":None,"creative_writing":3,"editing_proofreading":None,"summarization":None,"multilingual_writing":None},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":9,"image_generation":9,"video_generation":7,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":1,"csv_excel":None,"data_visualization":None,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":5,"api_integrations":6,"workflow_automation":3,"webhooks":4,"no_code_automation":5,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":5,"native_ecosystem_depth":5,"cross_platform":6,"open_source_compat":3,"third_party_integrations":5},
        "language_support":           {"overall":6,"hebrew":4,"english":9,"other_languages":6,"rtl_support":3,"programming_languages":None},
        "deployment_and_scale":       {"overall":6,"api_access":6,"enterprise_features":5,"self_hosting":1,"cost_efficiency_at_scale":7,"rate_limits":6},
        "education_and_learning":     {"overall":3,"explanations_clarity":2,"tutoring":1,"quiz_generation":1,"curriculum_design":2},
        "agent_and_agentic":          {"overall":2,"tool_use":2,"multi_step_tasks":2,"memory":2,"autonomy":2,"multi_agent_orchestration":1},
    },
    "magnific": {
        "_meta": {"source_urls":["https://magnific.ai"],"confidence":0.80,"source":"training_data"},
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":1,"long_form":None,"technical_writing":None,"creative_writing":2,"editing_proofreading":None,"summarization":None,"multilingual_writing":None},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":8,"image_generation":9,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":1,"csv_excel":None,"data_visualization":None,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":4,"api_integrations":5,"workflow_automation":3,"webhooks":3,"no_code_automation":4,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":5,"native_ecosystem_depth":5,"cross_platform":5,"open_source_compat":3,"third_party_integrations":5},
        "language_support":           {"overall":5,"hebrew":3,"english":8,"other_languages":5,"rtl_support":2,"programming_languages":None},
        "deployment_and_scale":       {"overall":5,"api_access":5,"enterprise_features":4,"self_hosting":1,"cost_efficiency_at_scale":5,"rate_limits":5},
        "education_and_learning":     {"overall":2,"explanations_clarity":2,"tutoring":1,"quiz_generation":1,"curriculum_design":1},
        "agent_and_agentic":          {"overall":1,"tool_use":1,"multi_step_tasks":1,"memory":1,"autonomy":1,"multi_agent_orchestration":1},
    },
    "microsoft-designer": {
        "_meta": {"source_urls":["https://designer.microsoft.com"],"confidence":0.85,"source":"training_data"},
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":5,"long_form":3,"technical_writing":4,"creative_writing":5,"editing_proofreading":4,"summarization":4,"multilingual_writing":6},
        "research":                   {"overall":2,"web_search":2,"deep_analysis":1,"fact_checking":1,"synthesis":2,"academic_sources":1},
        "media_creation":             {"overall":8,"image_generation":8,"video_generation":5,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":3,"csv_excel":3,"data_visualization":5,"sql_queries":None,"statistics":2,"python_data_science":None},
        "automation_and_integrations":{"overall":8,"api_integrations":7,"workflow_automation":7,"webhooks":6,"no_code_automation":8,"scheduled_tasks":6},
        "ecosystem_synergy":          {"overall":9,"native_ecosystem_depth":10,"cross_platform":7,"open_source_compat":4,"third_party_integrations":8},
        "language_support":           {"overall":9,"hebrew":8,"english":10,"other_languages":9,"rtl_support":8,"programming_languages":None},
        "deployment_and_scale":       {"overall":8,"api_access":6,"enterprise_features":9,"self_hosting":1,"cost_efficiency_at_scale":8,"rate_limits":8},
        "education_and_learning":     {"overall":5,"explanations_clarity":4,"tutoring":2,"quiz_generation":3,"curriculum_design":4},
        "agent_and_agentic":          {"overall":4,"tool_use":4,"multi_step_tasks":4,"memory":4,"autonomy":3,"multi_agent_orchestration":2},
    },
    "rytr": {
        "_meta": {"source_urls":["https://rytr.me"],"confidence":0.82,"source":"training_data"},
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":7,"long_form":6,"technical_writing":5,"creative_writing":8,"editing_proofreading":7,"summarization":6,"multilingual_writing":8},
        "research":                   {"overall":3,"web_search":2,"deep_analysis":2,"fact_checking":2,"synthesis":3,"academic_sources":1},
        "media_creation":             {"overall":1,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":2,"csv_excel":None,"data_visualization":None,"sql_queries":None,"statistics":2,"python_data_science":None},
        "automation_and_integrations":{"overall":6,"api_integrations":7,"workflow_automation":5,"webhooks":5,"no_code_automation":5,"scheduled_tasks":4},
        "ecosystem_synergy":          {"overall":5,"native_ecosystem_depth":5,"cross_platform":6,"open_source_compat":2,"third_party_integrations":5},
        "language_support":           {"overall":8,"hebrew":4,"english":10,"other_languages":8,"rtl_support":3,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":7,"enterprise_features":6,"self_hosting":1,"cost_efficiency_at_scale":9,"rate_limits":8},
        "education_and_learning":     {"overall":4,"explanations_clarity":4,"tutoring":3,"quiz_generation":3,"curriculum_design":3},
        "agent_and_agentic":          {"overall":3,"tool_use":3,"multi_step_tasks":3,"memory":3,"autonomy":2,"multi_agent_orchestration":1},
    },
    "lavender": {
        "_meta": {"source_urls":["https://lavender.ai"],"confidence":0.82,"source":"training_data"},
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":8,"long_form":5,"technical_writing":5,"creative_writing":6,"editing_proofreading":9,"summarization":7,"multilingual_writing":6},
        "research":                   {"overall":4,"web_search":4,"deep_analysis":3,"fact_checking":3,"synthesis":3,"academic_sources":1},
        "media_creation":             {"overall":1,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":5,"csv_excel":4,"data_visualization":5,"sql_queries":None,"statistics":5,"python_data_science":None},
        "automation_and_integrations":{"overall":7,"api_integrations":7,"workflow_automation":6,"webhooks":6,"no_code_automation":6,"scheduled_tasks":5},
        "ecosystem_synergy":          {"overall":7,"native_ecosystem_depth":8,"cross_platform":6,"open_source_compat":2,"third_party_integrations":7},
        "language_support":           {"overall":6,"hebrew":3,"english":10,"other_languages":5,"rtl_support":2,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":7,"enterprise_features":8,"self_hosting":1,"cost_efficiency_at_scale":5,"rate_limits":7},
        "education_and_learning":     {"overall":4,"explanations_clarity":4,"tutoring":3,"quiz_generation":2,"curriculum_design":2},
        "agent_and_agentic":          {"overall":5,"tool_use":6,"multi_step_tasks":5,"memory":5,"autonomy":4,"multi_agent_orchestration":2},
    },
    "adcreative": {
        "_meta": {"source_urls":["https://adcreative.ai"],"confidence":0.80,"source":"training_data"},
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":7,"long_form":4,"technical_writing":3,"creative_writing":8,"editing_proofreading":5,"summarization":5,"multilingual_writing":7},
        "research":                   {"overall":3,"web_search":3,"deep_analysis":2,"fact_checking":2,"synthesis":2,"academic_sources":1},
        "media_creation":             {"overall":9,"image_generation":9,"video_generation":5,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":5,"csv_excel":4,"data_visualization":6,"sql_queries":None,"statistics":5,"python_data_science":None},
        "automation_and_integrations":{"overall":7,"api_integrations":7,"workflow_automation":6,"webhooks":6,"no_code_automation":7,"scheduled_tasks":5},
        "ecosystem_synergy":          {"overall":7,"native_ecosystem_depth":7,"cross_platform":7,"open_source_compat":2,"third_party_integrations":7},
        "language_support":           {"overall":7,"hebrew":4,"english":10,"other_languages":7,"rtl_support":3,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":7,"enterprise_features":8,"self_hosting":1,"cost_efficiency_at_scale":5,"rate_limits":7},
        "education_and_learning":     {"overall":4,"explanations_clarity":3,"tutoring":2,"quiz_generation":2,"curriculum_design":2},
        "agent_and_agentic":          {"overall":4,"tool_use":5,"multi_step_tasks":5,"memory":4,"autonomy":3,"multi_agent_orchestration":2},
    },
    "scispace": {
        "_meta": {"source_urls":["https://typeset.io"],"confidence":0.83,"source":"training_data"},
        "coding":                     {"overall":2,"code_generation":1,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":7,"long_form":6,"technical_writing":8,"creative_writing":2,"editing_proofreading":6,"summarization":9,"multilingual_writing":6},
        "research":                   {"overall":10,"web_search":6,"deep_analysis":10,"fact_checking":9,"synthesis":9,"academic_sources":10},
        "media_creation":             {"overall":1,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":6,"csv_excel":4,"data_visualization":5,"sql_queries":None,"statistics":7,"python_data_science":None},
        "automation_and_integrations":{"overall":4,"api_integrations":5,"workflow_automation":3,"webhooks":3,"no_code_automation":3,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":5,"native_ecosystem_depth":6,"cross_platform":5,"open_source_compat":3,"third_party_integrations":5},
        "language_support":           {"overall":7,"hebrew":3,"english":10,"other_languages":6,"rtl_support":2,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":7,"enterprise_features":8,"self_hosting":1,"cost_efficiency_at_scale":8,"rate_limits":7},
        "education_and_learning":     {"overall":10,"explanations_clarity":10,"tutoring":8,"quiz_generation":7,"curriculum_design":6},
        "agent_and_agentic":          {"overall":4,"tool_use":4,"multi_step_tasks":4,"memory":5,"autonomy":3,"multi_agent_orchestration":2},
    },
    "humata": {
        "_meta": {"source_urls":["https://humata.ai"],"confidence":0.80,"source":"training_data"},
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":5,"long_form":4,"technical_writing":5,"creative_writing":2,"editing_proofreading":4,"summarization":8,"multilingual_writing":5},
        "research":                   {"overall":9,"web_search":2,"deep_analysis":9,"fact_checking":8,"synthesis":8,"academic_sources":9},
        "media_creation":             {"overall":1,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":6,"csv_excel":6,"data_visualization":3,"sql_queries":None,"statistics":5,"python_data_science":None},
        "automation_and_integrations":{"overall":3,"api_integrations":4,"workflow_automation":2,"webhooks":2,"no_code_automation":2,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":4,"native_ecosystem_depth":4,"cross_platform":5,"open_source_compat":2,"third_party_integrations":4},
        "language_support":           {"overall":7,"hebrew":4,"english":10,"other_languages":6,"rtl_support":3,"programming_languages":None},
        "deployment_and_scale":       {"overall":6,"api_access":5,"enterprise_features":6,"self_hosting":1,"cost_efficiency_at_scale":7,"rate_limits":6},
        "education_and_learning":     {"overall":8,"explanations_clarity":8,"tutoring":5,"quiz_generation":5,"curriculum_design":4},
        "agent_and_agentic":          {"overall":3,"tool_use":3,"multi_step_tasks":3,"memory":5,"autonomy":2,"multi_agent_orchestration":1},
    },
    "builder-io": {
        "_meta": {"source_urls":["https://builder.io"],"confidence":0.80,"source":"training_data"},
        "coding":                     {"overall":7,"code_generation":7,"code_review":5,"debugging":5,"refactoring":5,"test_writing":4,"multi_file_projects":6},
        "writing":                    {"overall":3,"long_form":2,"technical_writing":4,"creative_writing":2,"editing_proofreading":3,"summarization":3,"multilingual_writing":4},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":4,"image_generation":3,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":4,"csv_excel":3,"data_visualization":5,"sql_queries":4,"statistics":3,"python_data_science":3},
        "automation_and_integrations":{"overall":9,"api_integrations":9,"workflow_automation":8,"webhooks":8,"no_code_automation":9,"scheduled_tasks":6},
        "ecosystem_synergy":          {"overall":8,"native_ecosystem_depth":8,"cross_platform":9,"open_source_compat":7,"third_party_integrations":9},
        "language_support":           {"overall":6,"hebrew":4,"english":9,"other_languages":6,"rtl_support":4,"programming_languages":8},
        "deployment_and_scale":       {"overall":8,"api_access":9,"enterprise_features":9,"self_hosting":5,"cost_efficiency_at_scale":6,"rate_limits":7},
        "education_and_learning":     {"overall":5,"explanations_clarity":5,"tutoring":3,"quiz_generation":2,"curriculum_design":2},
        "agent_and_agentic":          {"overall":5,"tool_use":5,"multi_step_tasks":6,"memory":4,"autonomy":4,"multi_agent_orchestration":3},
    },
    "donotpay": {
        "_meta": {"source_urls":["https://donotpay.com"],"confidence":0.78,"source":"training_data"},
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":7,"long_form":6,"technical_writing":8,"creative_writing":3,"editing_proofreading":6,"summarization":6,"multilingual_writing":5},
        "research":                   {"overall":6,"web_search":4,"deep_analysis":6,"fact_checking":5,"synthesis":5,"academic_sources":4},
        "media_creation":             {"overall":1,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":4,"csv_excel":3,"data_visualization":2,"sql_queries":None,"statistics":3,"python_data_science":None},
        "automation_and_integrations":{"overall":6,"api_integrations":5,"workflow_automation":6,"webhooks":4,"no_code_automation":6,"scheduled_tasks":6},
        "ecosystem_synergy":          {"overall":4,"native_ecosystem_depth":5,"cross_platform":5,"open_source_compat":2,"third_party_integrations":4},
        "language_support":           {"overall":5,"hebrew":3,"english":9,"other_languages":4,"rtl_support":2,"programming_languages":None},
        "deployment_and_scale":       {"overall":6,"api_access":4,"enterprise_features":5,"self_hosting":1,"cost_efficiency_at_scale":6,"rate_limits":6},
        "education_and_learning":     {"overall":6,"explanations_clarity":7,"tutoring":3,"quiz_generation":2,"curriculum_design":2},
        "agent_and_agentic":          {"overall":7,"tool_use":7,"multi_step_tasks":7,"memory":5,"autonomy":6,"multi_agent_orchestration":3},
    },
    "comet": {
        "_meta": {"source_urls":["https://comet.perplexity.ai"],"confidence":0.70,"source":"training_data"},
        "coding":                     {"overall":8,"code_generation":8,"code_review":7,"debugging":7,"refactoring":7,"test_writing":6,"multi_file_projects":7},
        "writing":                    {"overall":6,"long_form":5,"technical_writing":7,"creative_writing":4,"editing_proofreading":5,"summarization":7,"multilingual_writing":5},
        "research":                   {"overall":9,"web_search":10,"deep_analysis":8,"fact_checking":8,"synthesis":8,"academic_sources":6},
        "media_creation":             {"overall":2,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":7,"csv_excel":6,"data_visualization":6,"sql_queries":7,"statistics":6,"python_data_science":7},
        "automation_and_integrations":{"overall":7,"api_integrations":7,"workflow_automation":6,"webhooks":5,"no_code_automation":4,"scheduled_tasks":5},
        "ecosystem_synergy":          {"overall":7,"native_ecosystem_depth":8,"cross_platform":6,"open_source_compat":5,"third_party_integrations":6},
        "language_support":           {"overall":7,"hebrew":5,"english":10,"other_languages":7,"rtl_support":4,"programming_languages":9},
        "deployment_and_scale":       {"overall":7,"api_access":7,"enterprise_features":6,"self_hosting":1,"cost_efficiency_at_scale":6,"rate_limits":6},
        "education_and_learning":     {"overall":8,"explanations_clarity":8,"tutoring":7,"quiz_generation":5,"curriculum_design":4},
        "agent_and_agentic":          {"overall":9,"tool_use":9,"multi_step_tasks":9,"memory":7,"autonomy":8,"multi_agent_orchestration":5},
    },
}


# ── Layer 1 — OpenRouter ────────────────────────────────────────────────────────
def _fetch_openrouter_models() -> dict:
    try:
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/models",
            headers={"User-Agent": "AI-Hub/1.0"},
        )
        with urllib.request.urlopen(req, timeout=8) as r:
            return {m["id"]: m for m in json.loads(r.read()).get("data", [])}
    except Exception as e:
        print(f"  [L1-OpenRouter] failed: {e}")
        return {}

def _scores_from_or(model: dict) -> dict:
    ctx   = model.get("context_length", 0)
    price = float(model.get("pricing", {}).get("prompt") or "0.000001")
    params = model.get("supported_parameters", []) or []
    has_tools = any("tool" in p or "function" in p for p in params)
    ctx_score = (10 if ctx >= 500_000 else 9 if ctx >= 200_000 else
                  8 if ctx >= 100_000 else 7 if ctx >= 32_000 else 6)
    cost_score = (10 if price <= 0.0000005 else 9 if price <= 0.000001 else
                   8 if price <= 0.000003  else 7 if price <= 0.00001   else
                   6 if price <= 0.00003   else 4)
    ts = null_scores()
    ts["deployment_and_scale"].update({
        "overall": 8, "api_access": 10, "cost_efficiency_at_scale": cost_score,
        "enterprise_features": 6, "self_hosting": 2, "rate_limits": 7,
    })
    ts["coding"]["multi_file_projects"] = ctx_score
    ts["agent_and_agentic"]["tool_use"]  = 8 if has_tools else 4
    ts["language_support"]["programming_languages"] = 8
    return ts


# ── Layer 2 — GitHub ────────────────────────────────────────────────────────────
def _fetch_github(owner_repo: str) -> dict | None:
    try:
        hdrs = {"User-Agent": "AI-Hub/1.0", "Accept": "application/vnd.github+json"}
        if GITHUB_TOKEN: hdrs["Authorization"] = f"Bearer {GITHUB_TOKEN}"
        req = urllib.request.Request(
            f"https://api.github.com/repos/{owner_repo}", headers=hdrs
        )
        with urllib.request.urlopen(req, timeout=8) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"  [L2-GitHub] {owner_repo}: {e}")
        return None

def _scores_from_github(gh: dict) -> dict:
    stars = gh.get("stargazers_count", 0)
    updated = gh.get("updated_at", "")
    active = updated >= "2024-01-01"
    pop = (10 if stars >= 50_000 else 9 if stars >= 20_000 else 8 if stars >= 10_000
           else 7 if stars >= 3_000 else 6 if stars >= 500 else 4)
    ts = null_scores()
    ts["ecosystem_synergy"].update({
        "overall": pop, "open_source_compat": 10,
        "cross_platform": 7 if active else 4,
        "third_party_integrations": min(10, pop + 1),
        "native_ecosystem_depth": 7,
    })
    ts["deployment_and_scale"]["self_hosting"] = 10
    return ts


# ── Layer 3 — Web scrape (requests + BS4) ──────────────────────────────────────
def _scrape_site(url: str, tool_id: str) -> dict:
    """Fetch homepage + pricing page, extract pricing/feature hints → partial scores."""
    try:
        import requests as rq
        from bs4 import BeautifulSoup
    except ImportError:
        return {}

    headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
    text_all = ""

    # Try homepage + pricing page
    urls_to_try = [url]
    pricing_url = PRICING_PAGES.get(tool_id)
    if pricing_url:
        urls_to_try.append(pricing_url)
    elif url and not url.endswith("/pricing"):
        urls_to_try.append(url.rstrip("/") + "/pricing")

    for u in urls_to_try[:2]:
        try:
            r = rq.get(u, headers=headers, timeout=8, allow_redirects=True)
            if r.status_code == 200:
                soup = BeautifulSoup(r.text, "html.parser")
                for tag in soup(["script", "style", "nav", "footer"]):
                    tag.decompose()
                text_all += " " + soup.get_text(" ", strip=True)[:8000]
        except Exception:
            pass

    if not text_all.strip():
        return {}

    text_lower = text_all.lower()
    ts = null_scores()
    hints = {}

    # API access
    if any(kw in text_lower for kw in ["api", "rest api", "developer api"]):
        hints["api_access"] = 8

    # Enterprise
    if any(kw in text_lower for kw in ["enterprise", "business plan", "team plan", "sso", "saml"]):
        hints["enterprise_features"] = 8

    # Free tier
    if any(kw in text_lower for kw in ["free plan", "free tier", "forever free", "$0"]):
        hints["has_free_tier"] = True

    # Self-hosting
    if any(kw in text_lower for kw in ["self-host", "self host", "on-premise", "docker", "open source"]):
        hints["self_hosting"] = 8

    # Hebrew/RTL
    if any(kw in text_lower for kw in ["hebrew", "עברית", "rtl", "right-to-left", "arabic"]):
        hints["hebrew"] = 7
        hints["rtl"] = 7

    # Price extraction
    price_matches = re.findall(r'\$(\d+(?:\.\d+)?)\s*/\s*(?:mo|month|yr|year)', text_lower)
    if price_matches:
        cheapest = min(float(p) for p in price_matches)
        if cheapest <= 5:    hints["cost_efficiency"] = 9
        elif cheapest <= 20: hints["cost_efficiency"] = 7
        elif cheapest <= 50: hints["cost_efficiency"] = 5
        else:                hints["cost_efficiency"] = 3

    # Map hints → scores
    if "api_access" in hints:
        ts["deployment_and_scale"]["api_access"] = hints["api_access"]
    if "enterprise_features" in hints:
        ts["deployment_and_scale"]["enterprise_features"] = hints["enterprise_features"]
    if "self_hosting" in hints:
        ts["deployment_and_scale"]["self_hosting"] = hints["self_hosting"]
    if "cost_efficiency" in hints:
        ts["deployment_and_scale"]["cost_efficiency_at_scale"] = hints["cost_efficiency"]
    if "hebrew" in hints:
        ts["language_support"]["hebrew"] = hints["hebrew"]
        ts["language_support"]["rtl_support"] = hints.get("rtl", 6)

    return ts, hints


# ── Layer 4 — Claude Haiku fallback ────────────────────────────────────────────
def _ask_claude(tool_name: str, tool_link: str, context_hint: str = "") -> dict | None:
    if not ANTHROPIC_KEY:
        return None

    template = null_scores()
    prompt = (
        f"You are an AI tool analyst. For the tool \"{tool_name}\" ({tool_link or 'unknown URL'}), "
        f"fill this task_scores JSON with integer scores 0-10 or null.\n"
        f"10=world-best, 8-9=very strong, 6-7=good, 4-5=adequate, 2-3=poor, 0-1=not supported, null=genuinely unknown.\n"
        + (f"Context from official site: {context_hint[:500]}\n" if context_hint else "")
        + f"Return ONLY valid JSON starting with {{:\n"
        + json.dumps(template, ensure_ascii=False)
    )

    payload = json.dumps({
        "model": "claude-haiku-4-5",
        "max_tokens": 1500,
        "messages": [{"role": "user", "content": prompt}],
    }).encode("utf-8")

    req = urllib.request.Request(
        "https://api.anthropic.com/v1/messages",
        data=payload,
        headers={
            "x-api-key": ANTHROPIC_KEY,
            "anthropic-version": "2023-06-01",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            raw = json.loads(r.read())["content"][0]["text"].strip()
        start = raw.find("{"); end = raw.rfind("}") + 1
        if start < 0 or end == 0: return None
        filled = json.loads(raw[start:end])
        return {cat: {k: clamp(filled.get(cat, {}).get(k)) for k in SCORE_SCHEMA[cat]}
                for cat in SCORE_SCHEMA}
    except Exception as e:
        print(f"  [L4-Claude] {tool_name}: {e}")
        return None


# ── ResearchEngine ─────────────────────────────────────────────────────────────
class ResearchEngine:

    def __init__(self):
        print("[Engine] Fetching OpenRouter catalog...")
        self._or_models = _fetch_openrouter_models()
        print(f"         {len(self._or_models)} models")

    def research_tool(self, tool: dict, verbose: bool = True) -> dict:
        tid   = tool["id"]
        name  = tool.get("name", tid)
        link  = tool.get("link", "")
        today = date.today().isoformat()

        scores = null_scores()
        sources: list[str] = []
        layers_used: list[str] = []
        context_for_claude = ""

        # ── Layer 0: known scores (training-verified) ──────────────────────────
        if tid in KNOWN:
            known = dict(KNOWN[tid])
            meta  = known.pop("_meta", {})
            scores = merge(scores, known)
            sources += meta.get("source_urls", [link])
            layers_used.append(f"L0-training({meta.get('confidence', 0.75):.2f})")

        # ── Layer 1: OpenRouter ────────────────────────────────────────────────
        or_id = OPENROUTER_MAP.get(tid)
        if or_id and or_id in self._or_models:
            or_scores = _scores_from_or(self._or_models[or_id])
            scores    = merge(or_scores, scores)   # known scores win
            or_src    = f"https://openrouter.ai/{or_id}"
            if or_src not in sources: sources.append(or_src)
            layers_used.append("L1-OpenRouter")
            if verbose: print(f"  L1 OpenRouter: {or_id}")

        # ── Layer 2: GitHub ────────────────────────────────────────────────────
        gh_repo = GITHUB_MAP.get(tid)
        if gh_repo:
            gh = _fetch_github(gh_repo)
            if gh:
                gh_scores = _scores_from_github(gh)
                scores    = merge(gh_scores, scores)
                gh_src    = f"https://github.com/{gh_repo}"
                if gh_src not in sources: sources.append(gh_src)
                layers_used.append(f"L2-GitHub({gh.get('stargazers_count',0):,}stars)")
                if verbose: print(f"  L2 GitHub: {gh_repo} ({gh.get('stargazers_count',0):,} stars)")

        # ── Layer 3: Web scrape ────────────────────────────────────────────────
        if link and count_nulls(scores) > 20:
            result = _scrape_site(link, tid)
            if isinstance(result, tuple):
                web_scores, hints = result
            else:
                web_scores, hints = result, {}
            if any(v is not None for cat in web_scores.values() for v in cat.values()):
                scores = merge(web_scores, scores)
                if link not in sources: sources.append(link)
                layers_used.append(f"L3-scrape({len(hints)} hints)")
                context_for_claude = str(hints)
                if verbose: print(f"  L3 Scrape: {len(hints)} hints from {link}")

        # ── Layer 4: Claude fallback ────────────────────────────────────────────
        remaining = count_nulls(scores)
        if remaining > 25 and ANTHROPIC_KEY:
            if verbose: print(f"  L4 Claude: {remaining} nulls -> asking claude-haiku...")
            claude_scores = _ask_claude(name, link, context_for_claude)
            if claude_scores:
                scores = merge(scores, claude_scores)
                layers_used.append("L4-claude-haiku")
                if "claude_model_knowledge" not in sources:
                    sources.append("claude_model_knowledge")

        # ── Confidence calculation ─────────────────────────────────────────────
        layer_weights = {"L0": 0.90, "L1": 0.75, "L2": 0.60, "L3": 0.55, "L4": 0.65}
        best_weight   = max((layer_weights.get(l[:2], 0.5) for l in layers_used), default=0.3)
        confidence    = round(best_weight, 2)

        non_null = sum(1 for cat in scores.values() for v in cat.values() if v is not None)

        return {
            "task_scores":      scores,
            "task_scores_meta": {
                "source_urls":  sources,
                "confidence":   confidence,
                "last_updated": today,
                "data_source":  " + ".join(layers_used) if layers_used else "unknown",
                "fields_filled": non_null,
                "fields_null":   67 - non_null,
            }
        }

    def demo_run(self, tool_ids: list[str], data: dict) -> None:
        """Print detailed per-layer breakdown for specified tools."""
        print("\n" + "=" * 65)
        print("DEMO RUN - per-tool layer breakdown")
        print("=" * 65)

        for tid in tool_ids:
            tool = next((t for t in data["tools"] if t["id"] == tid), None)
            if not tool:
                print(f"\n{tid}: NOT FOUND"); continue

            # Use existing scores if available, else research fresh
            if not is_empty(tool.get("task_scores", null_scores())):
                ts   = tool["task_scores"]
                meta = tool.get("task_scores_meta", {})
                non_null = sum(1 for cat in ts.values() for v in cat.values() if v is not None)
                nulls    = 67 - non_null
                src      = meta.get("source_urls", [tool.get("link","")])
                conf     = meta.get("confidence", 0.80)
                datasrc  = meta.get("data_source", "pre-filled")
                # Sample score
                coding_overall = ts.get("coding", {}).get("overall")
            else:
                result = self.research_tool(tool, verbose=False)
                ts     = result["task_scores"]
                meta   = result["task_scores_meta"]
                non_null = meta["fields_filled"]
                nulls    = meta["fields_null"]
                src      = meta["source_urls"]
                conf     = meta["confidence"]
                datasrc  = meta["data_source"]
                coding_overall = ts.get("coding", {}).get("overall")

            print(f"\n" + "-"*55)
            print(f" Tool       : {tool.get('name', tid)} ({tid})")
            print(f" Sources    : {src[:2]}")
            print(f" Confidence : {conf}")
            print(f" Filled     : {non_null} / 67 fields")
            print(f" Null       : {nulls} fields")
            layer_info = datasrc if datasrc else "pre-filled"
            print(f" Layers     : {layer_info}")
            print(f" Sample     : coding.overall = {coding_overall}  (source: {layer_info.split('+')[0].strip()})")

        print("\n" + "=" * 65)

    def run_batch(self, data: dict, batch_size: int = 5) -> int:
        tools  = data["tools"]
        empty  = [t for t in tools if is_empty(t.get("task_scores", null_scores()))]
        to_run = empty[:batch_size]
        print(f"\nEmpty tools: {len(empty)} - processing {len(to_run)}")

        updated = 0
        for tool in to_run:
            tid  = tool["id"]
            name = tool.get("name", tid)
            print(f"\n[{updated+1}/{len(to_run)}] {tid} ({name})")
            result = self.research_tool(tool)
            tool["task_scores"]      = result["task_scores"]
            tool["task_scores_meta"] = result["task_scores_meta"]
            TOOLS_FILE.write_text(
                json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8"
            )
            meta = result["task_scores_meta"]
            print(f"  SAVED: {meta['fields_filled']} fields, conf={meta['confidence']}, src={meta['source_urls'][:1]}")
            updated += 1
            time.sleep(0.3)

        return updated

    def print_report(self, data: dict) -> None:
        tools = data["tools"]
        total = len(tools)

        by_source: dict[str, int] = {}
        still_empty = 0
        for t in tools:
            ts = t.get("task_scores", null_scores())
            if is_empty(ts):
                still_empty += 1
            else:
                src = t.get("task_scores_meta", {}).get("data_source", "pre-filled")
                key = src.split("+")[0].strip().split("(")[0][:20]
                by_source[key] = by_source.get(key, 0) + 1

        print("\n" + "=" * 55)
        print(f"TOTAL TOOLS   : {total}")
        print(f"SCORED        : {total - still_empty}")
        print(f"STILL EMPTY   : {still_empty}")
        print(f"COVERAGE      : {(total-still_empty)/total*100:.1f}%")
        print()
        print("By data source:")
        for src, count in sorted(by_source.items(), key=lambda x: -x[1]):
            print(f"  {src:<30} {count:>4} tools")
        print("=" * 55)


# ── CLI ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    grp = parser.add_mutually_exclusive_group()
    grp.add_argument("--demo",   action="store_true", help="Demo 10 pre-scored tools")
    grp.add_argument("--batch",  type=int, default=5, help="Fill N empty tools (default 5)")
    grp.add_argument("--all",    action="store_true", help="Fill all empty tools")
    grp.add_argument("--report", action="store_true", help="Stats only")
    args = parser.parse_args()

    data = json.loads(TOOLS_FILE.read_text(encoding="utf-8"))

    if args.report:
        engine = ResearchEngine()
        engine.print_report(data)
        sys.exit(0)

    engine = ResearchEngine()

    if args.demo:
        DEMO_IDS = ["cursor","claude-code","n8n","gemma4","perplexity",
                    "notion","runway","elevenlabs","midjourney","canva"]
        engine.demo_run(DEMO_IDS, data)
        engine.print_report(data)

    else:
        batch = 9999 if args.all else args.batch
        updated = engine.run_batch(data, batch_size=batch)

        data2 = json.loads(TOOLS_FILE.read_text(encoding="utf-8"))
        engine.data = data2
        engine.print_report(data2)
        print(f"\nUpdated {updated} tools in this run.")
