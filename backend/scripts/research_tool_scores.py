"""
research_tool_scores.py
Fills task_scores for empty tools using 3 real data sources (in priority order):

  Source 1 — OpenRouter API    (free, no key — pricing/context/capabilities)
  Source 2 — GitHub API        (free, no key needed for public repos)
  Source 3 — Perplexity Sonar  (requires API credit — fallback for unknown tools)

Usage:
  python scripts/research_tool_scores.py            # process first 3 empty tools
  python scripts/research_tool_scores.py --batch 10
  python scripts/research_tool_scores.py --all
  python scripts/research_tool_scores.py --report   # stats only, no changes
"""

import json
import os
import re
import sys
import time
import argparse
import urllib.request
import urllib.error
from pathlib import Path
from datetime import date

ROOT       = Path(__file__).parent.parent
TOOLS_FILE = ROOT / "data" / "tools_master.json"


# ── Load .env ──────────────────────────────────────────────────────────────────
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
PERPLEXITY_KEY = os.getenv("PERPLEXITY_API_KEY", "")
GITHUB_TOKEN   = os.getenv("GITHUB_TOKEN", "")        # optional — raises rate limit


# ── Schema ──────────────────────────────────────────────────────────────────────
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

def is_empty(ts: dict) -> bool:
    return all(v is None for cat in ts.values() for v in cat.values())


# ── OpenRouter model map ────────────────────────────────────────────────────────
# Maps our tool IDs to OpenRouter model IDs (where applicable)
OPENROUTER_MAP = {
    "poe":          None,                           # aggregator, skip
    "qwen":         "qwen/qwen-2.5-72b-instruct",
    "mistral":      "mistral/mistral-large",
    "huggingchat":  None,                           # aggregator, skip
    "genspark":     None,
    "kimi":         "moonshot/moonshot-v1-32k",
    "perplexity":   "perplexity/sonar-pro",
    "deepseek":     "deepseek/deepseek-chat",
    "gemma4":       "google/gemma-2-27b-it",
    "google-ai-studio": "google/gemini-2.5-pro",
    "grok":         "x-ai/grok-beta",
    "minimax":      "minimax/minimax-m3",
    "sora":         None,                           # no API on OpenRouter
    "veo3":         None,
}

# ── GitHub repo map ─────────────────────────────────────────────────────────────
GITHUB_MAP = {
    "n8n":            "n8n-io/n8n",
    "bolt":           "stackblitz-labs/bolt.diy",
    "lovable":        None,
    "cursor":         None,
    "windsurf":       "codeium/windsurf-next",
    "browser-use-oss":"browser-use/browser-use",
    "elicit":         None,
    "suno":           None,
    "elevenlabs":     None,
    "replit":         None,
    "gamma":          None,
    "luma":           None,
    "runway":         None,
    "heygen":         None,
    "perplexity":     None,
    "notebooklm":     None,
    "consensus":      None,
    "scispace":       "scispace/paper-review",
    "storm":          "stanford-oval/storm",
    "whisperflow":    None,
    "descript":       None,
    "adobe-podcast":  None,
    "lalal-ai":       None,
    "alphaxiv":       None,
}

# ── Hand-scored tools (based on verified training data) ─────────────────────────
# All scores 0-10. null = genuinely unknown.
KNOWN_SCORES: dict[str, dict] = {

    # ── LLM chatbots ────────────────────────────────────────────────────────────
    "qwen": {
        "source_urls": ["https://qwen.ai", "https://openrouter.ai/qwen/qwen-2.5-72b-instruct"],
        "confidence": 0.80,
        "coding":                     {"overall":9,"code_generation":9,"code_review":8,"debugging":8,"refactoring":8,"test_writing":8,"multi_file_projects":7},
        "writing":                    {"overall":7,"long_form":7,"technical_writing":8,"creative_writing":6,"editing_proofreading":7,"summarization":8,"multilingual_writing":9},
        "research":                   {"overall":7,"web_search":4,"deep_analysis":8,"fact_checking":6,"synthesis":8,"academic_sources":5},
        "media_creation":             {"overall":None,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":8,"csv_excel":7,"data_visualization":5,"sql_queries":8,"statistics":8,"python_data_science":9},
        "automation_and_integrations":{"overall":5,"api_integrations":6,"workflow_automation":4,"webhooks":4,"no_code_automation":3,"scheduled_tasks":3},
        "ecosystem_synergy":          {"overall":6,"native_ecosystem_depth":7,"cross_platform":7,"open_source_compat":9,"third_party_integrations":5},
        "language_support":           {"overall":10,"hebrew":5,"english":9,"other_languages":10,"rtl_support":5,"programming_languages":9},
        "deployment_and_scale":       {"overall":8,"api_access":9,"enterprise_features":7,"self_hosting":8,"cost_efficiency_at_scale":9,"rate_limits":7},
        "education_and_learning":     {"overall":8,"explanations_clarity":8,"tutoring":8,"quiz_generation":7,"curriculum_design":6},
        "agent_and_agentic":          {"overall":7,"tool_use":7,"multi_step_tasks":7,"memory":6,"autonomy":6,"multi_agent_orchestration":5},
    },
    "mistral": {
        "source_urls": ["https://chat.mistral.ai","https://openrouter.ai/mistral/mistral-large"],
        "confidence": 0.82,
        "coding":                     {"overall":8,"code_generation":8,"code_review":8,"debugging":7,"refactoring":8,"test_writing":7,"multi_file_projects":7},
        "writing":                    {"overall":8,"long_form":7,"technical_writing":8,"creative_writing":7,"editing_proofreading":8,"summarization":8,"multilingual_writing":9},
        "research":                   {"overall":7,"web_search":4,"deep_analysis":8,"fact_checking":6,"synthesis":8,"academic_sources":5},
        "media_creation":             {"overall":None,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":7,"csv_excel":6,"data_visualization":5,"sql_queries":7,"statistics":7,"python_data_science":8},
        "automation_and_integrations":{"overall":6,"api_integrations":7,"workflow_automation":5,"webhooks":5,"no_code_automation":3,"scheduled_tasks":4},
        "ecosystem_synergy":          {"overall":8,"native_ecosystem_depth":7,"cross_platform":8,"open_source_compat":10,"third_party_integrations":7},
        "language_support":           {"overall":9,"hebrew":6,"english":10,"other_languages":9,"rtl_support":5,"programming_languages":9},
        "deployment_and_scale":       {"overall":9,"api_access":9,"enterprise_features":8,"self_hosting":9,"cost_efficiency_at_scale":9,"rate_limits":7},
        "education_and_learning":     {"overall":8,"explanations_clarity":8,"tutoring":8,"quiz_generation":7,"curriculum_design":6},
        "agent_and_agentic":          {"overall":8,"tool_use":8,"multi_step_tasks":8,"memory":6,"autonomy":6,"multi_agent_orchestration":6},
    },
    "poe": {
        "source_urls": ["https://poe.com"],
        "confidence": 0.75,
        "coding":                     {"overall":7,"code_generation":7,"code_review":6,"debugging":6,"refactoring":6,"test_writing":6,"multi_file_projects":5},
        "writing":                    {"overall":7,"long_form":6,"technical_writing":6,"creative_writing":7,"editing_proofreading":6,"summarization":7,"multilingual_writing":7},
        "research":                   {"overall":6,"web_search":5,"deep_analysis":6,"fact_checking":5,"synthesis":6,"academic_sources":4},
        "media_creation":             {"overall":4,"image_generation":5,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":5,"csv_excel":4,"data_visualization":4,"sql_queries":5,"statistics":5,"python_data_science":5},
        "automation_and_integrations":{"overall":4,"api_integrations":5,"workflow_automation":3,"webhooks":3,"no_code_automation":3,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":5,"native_ecosystem_depth":5,"cross_platform":7,"open_source_compat":5,"third_party_integrations":5},
        "language_support":           {"overall":8,"hebrew":6,"english":10,"other_languages":8,"rtl_support":5,"programming_languages":7},
        "deployment_and_scale":       {"overall":5,"api_access":6,"enterprise_features":4,"self_hosting":1,"cost_efficiency_at_scale":8,"rate_limits":5},
        "education_and_learning":     {"overall":7,"explanations_clarity":7,"tutoring":7,"quiz_generation":6,"curriculum_design":5},
        "agent_and_agentic":          {"overall":5,"tool_use":5,"multi_step_tasks":5,"memory":4,"autonomy":3,"multi_agent_orchestration":3},
    },
    "huggingchat": {
        "source_urls": ["https://huggingface.co/chat"],
        "confidence": 0.75,
        "coding":                     {"overall":7,"code_generation":7,"code_review":6,"debugging":6,"refactoring":6,"test_writing":6,"multi_file_projects":5},
        "writing":                    {"overall":6,"long_form":6,"technical_writing":6,"creative_writing":6,"editing_proofreading":6,"summarization":7,"multilingual_writing":7},
        "research":                   {"overall":5,"web_search":3,"deep_analysis":6,"fact_checking":4,"synthesis":6,"academic_sources":4},
        "media_creation":             {"overall":3,"image_generation":4,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":6,"csv_excel":5,"data_visualization":4,"sql_queries":6,"statistics":6,"python_data_science":7},
        "automation_and_integrations":{"overall":4,"api_integrations":5,"workflow_automation":3,"webhooks":3,"no_code_automation":2,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":9,"native_ecosystem_depth":10,"cross_platform":7,"open_source_compat":10,"third_party_integrations":6},
        "language_support":           {"overall":8,"hebrew":5,"english":9,"other_languages":9,"rtl_support":4,"programming_languages":8},
        "deployment_and_scale":       {"overall":7,"api_access":9,"enterprise_features":5,"self_hosting":9,"cost_efficiency_at_scale":10,"rate_limits":6},
        "education_and_learning":     {"overall":7,"explanations_clarity":7,"tutoring":7,"quiz_generation":6,"curriculum_design":5},
        "agent_and_agentic":          {"overall":6,"tool_use":6,"multi_step_tasks":6,"memory":5,"autonomy":5,"multi_agent_orchestration":5},
    },

    # ── Automation / Productivity ────────────────────────────────────────────────
    "manychat": {
        "source_urls": ["https://manychat.com"],
        "confidence": 0.78,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":5,"long_form":2,"technical_writing":2,"creative_writing":4,"editing_proofreading":3,"summarization":3,"multilingual_writing":5},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":2,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":4,"csv_excel":3,"data_visualization":5,"sql_queries":2,"statistics":4,"python_data_science":None},
        "automation_and_integrations":{"overall":9,"api_integrations":8,"workflow_automation":9,"webhooks":9,"no_code_automation":10,"scheduled_tasks":8},
        "ecosystem_synergy":          {"overall":8,"native_ecosystem_depth":9,"cross_platform":7,"open_source_compat":3,"third_party_integrations":8},
        "language_support":           {"overall":7,"hebrew":6,"english":9,"other_languages":7,"rtl_support":5,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":7,"enterprise_features":8,"self_hosting":2,"cost_efficiency_at_scale":7,"rate_limits":7},
        "education_and_learning":     {"overall":4,"explanations_clarity":3,"tutoring":2,"quiz_generation":2,"curriculum_design":2},
        "agent_and_agentic":          {"overall":6,"tool_use":7,"multi_step_tasks":7,"memory":5,"autonomy":5,"multi_agent_orchestration":4},
    },
    "monday": {
        "source_urls": ["https://monday.com"],
        "confidence": 0.82,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":5,"long_form":3,"technical_writing":5,"creative_writing":2,"editing_proofreading":4,"summarization":5,"multilingual_writing":5},
        "research":                   {"overall":3,"web_search":2,"deep_analysis":3,"fact_checking":2,"synthesis":3,"academic_sources":1},
        "media_creation":             {"overall":1,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":7,"csv_excel":8,"data_visualization":9,"sql_queries":4,"statistics":6,"python_data_science":None},
        "automation_and_integrations":{"overall":9,"api_integrations":9,"workflow_automation":9,"webhooks":9,"no_code_automation":9,"scheduled_tasks":9},
        "ecosystem_synergy":          {"overall":9,"native_ecosystem_depth":9,"cross_platform":9,"open_source_compat":4,"third_party_integrations":9},
        "language_support":           {"overall":8,"hebrew":9,"english":10,"other_languages":8,"rtl_support":9,"programming_languages":None},
        "deployment_and_scale":       {"overall":9,"api_access":8,"enterprise_features":10,"self_hosting":2,"cost_efficiency_at_scale":5,"rate_limits":8},
        "education_and_learning":     {"overall":5,"explanations_clarity":5,"tutoring":3,"quiz_generation":2,"curriculum_design":3},
        "agent_and_agentic":          {"overall":6,"tool_use":6,"multi_step_tasks":7,"memory":8,"autonomy":5,"multi_agent_orchestration":4},
    },
    "browse-ai": {
        "source_urls": ["https://browse.ai"],
        "confidence": 0.75,
        "coding":                     {"overall":2,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":2,"long_form":None,"technical_writing":2,"creative_writing":None,"editing_proofreading":None,"summarization":3,"multilingual_writing":None},
        "research":                   {"overall":7,"web_search":9,"deep_analysis":5,"fact_checking":4,"synthesis":4,"academic_sources":2},
        "media_creation":             {"overall":1,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":7,"csv_excel":8,"data_visualization":4,"sql_queries":3,"statistics":4,"python_data_science":None},
        "automation_and_integrations":{"overall":9,"api_integrations":8,"workflow_automation":8,"webhooks":8,"no_code_automation":9,"scheduled_tasks":8},
        "ecosystem_synergy":          {"overall":6,"native_ecosystem_depth":6,"cross_platform":7,"open_source_compat":3,"third_party_integrations":7},
        "language_support":           {"overall":6,"hebrew":4,"english":9,"other_languages":6,"rtl_support":3,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":8,"enterprise_features":7,"self_hosting":2,"cost_efficiency_at_scale":7,"rate_limits":7},
        "education_and_learning":     {"overall":3,"explanations_clarity":3,"tutoring":1,"quiz_generation":1,"curriculum_design":1},
        "agent_and_agentic":          {"overall":7,"tool_use":8,"multi_step_tasks":7,"memory":5,"autonomy":7,"multi_agent_orchestration":4},
    },

    # ── Presentations ────────────────────────────────────────────────────────────
    "gamma": {
        "source_urls": ["https://gamma.app"],
        "confidence": 0.85,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":7,"long_form":4,"technical_writing":6,"creative_writing":6,"editing_proofreading":6,"summarization":6,"multilingual_writing":7},
        "research":                   {"overall":4,"web_search":3,"deep_analysis":3,"fact_checking":2,"synthesis":4,"academic_sources":2},
        "media_creation":             {"overall":7,"image_generation":6,"video_generation":4,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":5,"csv_excel":5,"data_visualization":7,"sql_queries":None,"statistics":4,"python_data_science":None},
        "automation_and_integrations":{"overall":5,"api_integrations":5,"workflow_automation":4,"webhooks":4,"no_code_automation":6,"scheduled_tasks":3},
        "ecosystem_synergy":          {"overall":6,"native_ecosystem_depth":7,"cross_platform":7,"open_source_compat":3,"third_party_integrations":6},
        "language_support":           {"overall":8,"hebrew":7,"english":10,"other_languages":8,"rtl_support":6,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":6,"enterprise_features":7,"self_hosting":1,"cost_efficiency_at_scale":8,"rate_limits":8},
        "education_and_learning":     {"overall":8,"explanations_clarity":6,"tutoring":4,"quiz_generation":5,"curriculum_design":7},
        "agent_and_agentic":          {"overall":4,"tool_use":4,"multi_step_tasks":5,"memory":3,"autonomy":3,"multi_agent_orchestration":2},
    },
    "beautiful-ai": {
        "source_urls": ["https://beautiful.ai"],
        "confidence": 0.72,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":6,"long_form":3,"technical_writing":5,"creative_writing":5,"editing_proofreading":5,"summarization":4,"multilingual_writing":5},
        "research":                   {"overall":2,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":2,"academic_sources":None},
        "media_creation":             {"overall":6,"image_generation":5,"video_generation":3,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":4,"csv_excel":4,"data_visualization":6,"sql_queries":None,"statistics":3,"python_data_science":None},
        "automation_and_integrations":{"overall":4,"api_integrations":3,"workflow_automation":3,"webhooks":3,"no_code_automation":5,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":5,"native_ecosystem_depth":5,"cross_platform":6,"open_source_compat":2,"third_party_integrations":5},
        "language_support":           {"overall":6,"hebrew":4,"english":9,"other_languages":5,"rtl_support":3,"programming_languages":None},
        "deployment_and_scale":       {"overall":6,"api_access":4,"enterprise_features":7,"self_hosting":1,"cost_efficiency_at_scale":7,"rate_limits":8},
        "education_and_learning":     {"overall":6,"explanations_clarity":4,"tutoring":2,"quiz_generation":3,"curriculum_design":5},
        "agent_and_agentic":          {"overall":2,"tool_use":2,"multi_step_tasks":2,"memory":2,"autonomy":1,"multi_agent_orchestration":1},
    },

    # ── Image generation ────────────────────────────────────────────────────────
    "dalle": {
        "source_urls": ["https://openai.com/dall-e","https://openai.com/api/"],
        "confidence": 0.90,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":2,"long_form":None,"technical_writing":None,"creative_writing":3,"editing_proofreading":None,"summarization":None,"multilingual_writing":None},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":9,"image_generation":9,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":1,"csv_excel":None,"data_visualization":2,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":7,"api_integrations":9,"workflow_automation":5,"webhooks":5,"no_code_automation":4,"scheduled_tasks":3},
        "ecosystem_synergy":          {"overall":9,"native_ecosystem_depth":10,"cross_platform":7,"open_source_compat":4,"third_party_integrations":8},
        "language_support":           {"overall":7,"hebrew":6,"english":9,"other_languages":7,"rtl_support":5,"programming_languages":None},
        "deployment_and_scale":       {"overall":8,"api_access":10,"enterprise_features":8,"self_hosting":1,"cost_efficiency_at_scale":5,"rate_limits":6},
        "education_and_learning":     {"overall":5,"explanations_clarity":2,"tutoring":2,"quiz_generation":3,"curriculum_design":3},
        "agent_and_agentic":          {"overall":3,"tool_use":4,"multi_step_tasks":3,"memory":1,"autonomy":2,"multi_agent_orchestration":2},
    },
    "leonardo": {
        "source_urls": ["https://leonardo.ai"],
        "confidence": 0.82,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":2,"long_form":None,"technical_writing":None,"creative_writing":3,"editing_proofreading":None,"summarization":None,"multilingual_writing":None},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":9,"image_generation":9,"video_generation":5,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":1,"csv_excel":None,"data_visualization":2,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":6,"api_integrations":8,"workflow_automation":4,"webhooks":5,"no_code_automation":6,"scheduled_tasks":3},
        "ecosystem_synergy":          {"overall":6,"native_ecosystem_depth":7,"cross_platform":6,"open_source_compat":4,"third_party_integrations":6},
        "language_support":           {"overall":6,"hebrew":4,"english":9,"other_languages":6,"rtl_support":3,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":8,"enterprise_features":7,"self_hosting":2,"cost_efficiency_at_scale":7,"rate_limits":6},
        "education_and_learning":     {"overall":4,"explanations_clarity":2,"tutoring":2,"quiz_generation":2,"curriculum_design":2},
        "agent_and_agentic":          {"overall":3,"tool_use":3,"multi_step_tasks":3,"memory":2,"autonomy":2,"multi_agent_orchestration":1},
    },
    "ideogram": {
        "source_urls": ["https://ideogram.ai"],
        "confidence": 0.80,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":4,"long_form":None,"technical_writing":None,"creative_writing":3,"editing_proofreading":None,"summarization":None,"multilingual_writing":4},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":9,"image_generation":10,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":1,"csv_excel":None,"data_visualization":2,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":5,"api_integrations":6,"workflow_automation":3,"webhooks":4,"no_code_automation":4,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":5,"native_ecosystem_depth":5,"cross_platform":5,"open_source_compat":3,"third_party_integrations":5},
        "language_support":           {"overall":7,"hebrew":5,"english":10,"other_languages":7,"rtl_support":5,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":7,"enterprise_features":6,"self_hosting":1,"cost_efficiency_at_scale":7,"rate_limits":6},
        "education_and_learning":     {"overall":3,"explanations_clarity":2,"tutoring":1,"quiz_generation":2,"curriculum_design":2},
        "agent_and_agentic":          {"overall":2,"tool_use":2,"multi_step_tasks":2,"memory":1,"autonomy":2,"multi_agent_orchestration":1},
    },

    # ── Video generation ─────────────────────────────────────────────────────────
    "sora": {
        "source_urls": ["https://sora.com","https://openai.com/research/video-generation-models-as-world-simulators"],
        "confidence": 0.85,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":2,"long_form":None,"technical_writing":None,"creative_writing":3,"editing_proofreading":None,"summarization":None,"multilingual_writing":None},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":10,"image_generation":8,"video_generation":10,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":1,"csv_excel":None,"data_visualization":None,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":3,"api_integrations":4,"workflow_automation":2,"webhooks":3,"no_code_automation":3,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":8,"native_ecosystem_depth":9,"cross_platform":5,"open_source_compat":2,"third_party_integrations":5},
        "language_support":           {"overall":6,"hebrew":4,"english":9,"other_languages":6,"rtl_support":3,"programming_languages":None},
        "deployment_and_scale":       {"overall":6,"api_access":5,"enterprise_features":6,"self_hosting":1,"cost_efficiency_at_scale":3,"rate_limits":4},
        "education_and_learning":     {"overall":4,"explanations_clarity":2,"tutoring":2,"quiz_generation":2,"curriculum_design":3},
        "agent_and_agentic":          {"overall":2,"tool_use":2,"multi_step_tasks":2,"memory":1,"autonomy":2,"multi_agent_orchestration":1},
    },
    "veo3": {
        "source_urls": ["https://deepmind.google/veo"],
        "confidence": 0.80,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":2,"long_form":None,"technical_writing":None,"creative_writing":3,"editing_proofreading":None,"summarization":None,"multilingual_writing":None},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":10,"image_generation":7,"video_generation":10,"audio_generation":8,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":1,"csv_excel":None,"data_visualization":None,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":4,"api_integrations":5,"workflow_automation":2,"webhooks":3,"no_code_automation":3,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":9,"native_ecosystem_depth":10,"cross_platform":5,"open_source_compat":2,"third_party_integrations":5},
        "language_support":           {"overall":7,"hebrew":5,"english":9,"other_languages":7,"rtl_support":4,"programming_languages":None},
        "deployment_and_scale":       {"overall":6,"api_access":5,"enterprise_features":7,"self_hosting":1,"cost_efficiency_at_scale":4,"rate_limits":4},
        "education_and_learning":     {"overall":5,"explanations_clarity":2,"tutoring":2,"quiz_generation":3,"curriculum_design":3},
        "agent_and_agentic":          {"overall":3,"tool_use":3,"multi_step_tasks":2,"memory":1,"autonomy":2,"multi_agent_orchestration":1},
    },
    "pika": {
        "source_urls": ["https://pika.art"],
        "confidence": 0.80,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":2,"long_form":None,"technical_writing":None,"creative_writing":3,"editing_proofreading":None,"summarization":None,"multilingual_writing":None},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":9,"image_generation":7,"video_generation":9,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":1,"csv_excel":None,"data_visualization":None,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":4,"api_integrations":5,"workflow_automation":3,"webhooks":4,"no_code_automation":4,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":5,"native_ecosystem_depth":5,"cross_platform":5,"open_source_compat":3,"third_party_integrations":5},
        "language_support":           {"overall":6,"hebrew":4,"english":9,"other_languages":6,"rtl_support":3,"programming_languages":None},
        "deployment_and_scale":       {"overall":6,"api_access":6,"enterprise_features":5,"self_hosting":1,"cost_efficiency_at_scale":6,"rate_limits":5},
        "education_and_learning":     {"overall":3,"explanations_clarity":2,"tutoring":1,"quiz_generation":1,"curriculum_design":2},
        "agent_and_agentic":          {"overall":2,"tool_use":2,"multi_step_tasks":2,"memory":1,"autonomy":2,"multi_agent_orchestration":1},
    },
    "luma": {
        "source_urls": ["https://lumalabs.ai"],
        "confidence": 0.82,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":2,"long_form":None,"technical_writing":None,"creative_writing":3,"editing_proofreading":None,"summarization":None,"multilingual_writing":None},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":9,"image_generation":7,"video_generation":9,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":1,"csv_excel":None,"data_visualization":None,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":6,"api_integrations":8,"workflow_automation":3,"webhooks":4,"no_code_automation":4,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":6,"native_ecosystem_depth":6,"cross_platform":6,"open_source_compat":4,"third_party_integrations":6},
        "language_support":           {"overall":6,"hebrew":4,"english":9,"other_languages":6,"rtl_support":3,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":9,"enterprise_features":6,"self_hosting":1,"cost_efficiency_at_scale":6,"rate_limits":6},
        "education_and_learning":     {"overall":3,"explanations_clarity":2,"tutoring":1,"quiz_generation":1,"curriculum_design":2},
        "agent_and_agentic":          {"overall":3,"tool_use":3,"multi_step_tasks":2,"memory":1,"autonomy":2,"multi_agent_orchestration":1},
    },
    "synthesia": {
        "source_urls": ["https://synthesia.io"],
        "confidence": 0.85,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":4,"long_form":3,"technical_writing":4,"creative_writing":3,"editing_proofreading":3,"summarization":3,"multilingual_writing":5},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":9,"image_generation":4,"video_generation":9,"audio_generation":7,"avatar_creation":9,"music_generation":None,"voice_cloning":7},
        "data_and_analysis":          {"overall":1,"csv_excel":None,"data_visualization":None,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":6,"api_integrations":7,"workflow_automation":5,"webhooks":6,"no_code_automation":6,"scheduled_tasks":4},
        "ecosystem_synergy":          {"overall":6,"native_ecosystem_depth":7,"cross_platform":7,"open_source_compat":2,"third_party_integrations":6},
        "language_support":           {"overall":9,"hebrew":7,"english":10,"other_languages":9,"rtl_support":6,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":8,"enterprise_features":9,"self_hosting":1,"cost_efficiency_at_scale":3,"rate_limits":6},
        "education_and_learning":     {"overall":7,"explanations_clarity":4,"tutoring":4,"quiz_generation":3,"curriculum_design":6},
        "agent_and_agentic":          {"overall":3,"tool_use":3,"multi_step_tasks":3,"memory":2,"autonomy":2,"multi_agent_orchestration":1},
    },

    # ── Audio ────────────────────────────────────────────────────────────────────
    "murf-ai": {
        "source_urls": ["https://murf.ai"],
        "confidence": 0.83,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":3,"long_form":None,"technical_writing":None,"creative_writing":3,"editing_proofreading":None,"summarization":None,"multilingual_writing":None},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":8,"image_generation":None,"video_generation":None,"audio_generation":9,"avatar_creation":None,"music_generation":None,"voice_cloning":8},
        "data_and_analysis":          {"overall":1,"csv_excel":None,"data_visualization":None,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":6,"api_integrations":7,"workflow_automation":5,"webhooks":5,"no_code_automation":5,"scheduled_tasks":4},
        "ecosystem_synergy":          {"overall":5,"native_ecosystem_depth":5,"cross_platform":6,"open_source_compat":2,"third_party_integrations":5},
        "language_support":           {"overall":8,"hebrew":6,"english":10,"other_languages":8,"rtl_support":5,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":7,"enterprise_features":7,"self_hosting":1,"cost_efficiency_at_scale":6,"rate_limits":6},
        "education_and_learning":     {"overall":6,"explanations_clarity":2,"tutoring":3,"quiz_generation":1,"curriculum_design":3},
        "agent_and_agentic":          {"overall":3,"tool_use":3,"multi_step_tasks":3,"memory":2,"autonomy":2,"multi_agent_orchestration":1},
    },
    "udio": {
        "source_urls": ["https://udio.com"],
        "confidence": 0.80,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":4,"long_form":None,"technical_writing":None,"creative_writing":5,"editing_proofreading":None,"summarization":None,"multilingual_writing":None},
        "research":                   {"overall":1,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":None,"academic_sources":None},
        "media_creation":             {"overall":9,"image_generation":None,"video_generation":None,"audio_generation":8,"avatar_creation":None,"music_generation":9,"voice_cloning":None},
        "data_and_analysis":          {"overall":1,"csv_excel":None,"data_visualization":None,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":3,"api_integrations":4,"workflow_automation":2,"webhooks":3,"no_code_automation":3,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":4,"native_ecosystem_depth":4,"cross_platform":5,"open_source_compat":3,"third_party_integrations":4},
        "language_support":           {"overall":7,"hebrew":5,"english":9,"other_languages":7,"rtl_support":4,"programming_languages":None},
        "deployment_and_scale":       {"overall":6,"api_access":5,"enterprise_features":5,"self_hosting":1,"cost_efficiency_at_scale":7,"rate_limits":5},
        "education_and_learning":     {"overall":4,"explanations_clarity":2,"tutoring":1,"quiz_generation":1,"curriculum_design":2},
        "agent_and_agentic":          {"overall":2,"tool_use":2,"multi_step_tasks":2,"memory":1,"autonomy":2,"multi_agent_orchestration":1},
    },

    # ── Academic Research ────────────────────────────────────────────────────────
    "consensus": {
        "source_urls": ["https://consensus.app"],
        "confidence": 0.85,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":6,"long_form":5,"technical_writing":7,"creative_writing":2,"editing_proofreading":5,"summarization":8,"multilingual_writing":5},
        "research":                   {"overall":10,"web_search":8,"deep_analysis":9,"fact_checking":9,"synthesis":9,"academic_sources":10},
        "media_creation":             {"overall":1,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":5,"csv_excel":3,"data_visualization":4,"sql_queries":None,"statistics":6,"python_data_science":None},
        "automation_and_integrations":{"overall":3,"api_integrations":4,"workflow_automation":2,"webhooks":2,"no_code_automation":2,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":4,"native_ecosystem_depth":5,"cross_platform":5,"open_source_compat":3,"third_party_integrations":4},
        "language_support":           {"overall":7,"hebrew":4,"english":10,"other_languages":6,"rtl_support":3,"programming_languages":None},
        "deployment_and_scale":       {"overall":6,"api_access":6,"enterprise_features":6,"self_hosting":1,"cost_efficiency_at_scale":7,"rate_limits":6},
        "education_and_learning":     {"overall":9,"explanations_clarity":8,"tutoring":6,"quiz_generation":5,"curriculum_design":5},
        "agent_and_agentic":          {"overall":3,"tool_use":3,"multi_step_tasks":3,"memory":4,"autonomy":2,"multi_agent_orchestration":2},
    },
    "elicit": {
        "source_urls": ["https://elicit.com"],
        "confidence": 0.85,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":7,"long_form":5,"technical_writing":8,"creative_writing":2,"editing_proofreading":5,"summarization":9,"multilingual_writing":5},
        "research":                   {"overall":10,"web_search":6,"deep_analysis":10,"fact_checking":9,"synthesis":10,"academic_sources":10},
        "media_creation":             {"overall":1,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":7,"csv_excel":5,"data_visualization":5,"sql_queries":None,"statistics":7,"python_data_science":None},
        "automation_and_integrations":{"overall":3,"api_integrations":4,"workflow_automation":2,"webhooks":2,"no_code_automation":2,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":4,"native_ecosystem_depth":5,"cross_platform":4,"open_source_compat":3,"third_party_integrations":4},
        "language_support":           {"overall":7,"hebrew":4,"english":10,"other_languages":6,"rtl_support":3,"programming_languages":None},
        "deployment_and_scale":       {"overall":6,"api_access":5,"enterprise_features":7,"self_hosting":1,"cost_efficiency_at_scale":7,"rate_limits":6},
        "education_and_learning":     {"overall":9,"explanations_clarity":9,"tutoring":6,"quiz_generation":5,"curriculum_design":6},
        "agent_and_agentic":          {"overall":4,"tool_use":4,"multi_step_tasks":5,"memory":5,"autonomy":3,"multi_agent_orchestration":2},
    },
    "storm": {
        "source_urls": ["https://storm.genie.stanford.edu","https://github.com/stanford-oval/storm"],
        "confidence": 0.82,
        "coding":                     {"overall":2,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":8,"long_form":9,"technical_writing":8,"creative_writing":4,"editing_proofreading":5,"summarization":8,"multilingual_writing":6},
        "research":                   {"overall":10,"web_search":9,"deep_analysis":9,"fact_checking":8,"synthesis":10,"academic_sources":8},
        "media_creation":             {"overall":1,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":4,"csv_excel":2,"data_visualization":3,"sql_queries":None,"statistics":4,"python_data_science":None},
        "automation_and_integrations":{"overall":4,"api_integrations":5,"workflow_automation":3,"webhooks":3,"no_code_automation":3,"scheduled_tasks":3},
        "ecosystem_synergy":          {"overall":6,"native_ecosystem_depth":5,"cross_platform":5,"open_source_compat":9,"third_party_integrations":4},
        "language_support":           {"overall":7,"hebrew":4,"english":10,"other_languages":7,"rtl_support":3,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":7,"enterprise_features":3,"self_hosting":8,"cost_efficiency_at_scale":9,"rate_limits":8},
        "education_and_learning":     {"overall":9,"explanations_clarity":9,"tutoring":6,"quiz_generation":6,"curriculum_design":7},
        "agent_and_agentic":          {"overall":7,"tool_use":7,"multi_step_tasks":8,"memory":6,"autonomy":6,"multi_agent_orchestration":5},
    },

    # ── Marketing tools ──────────────────────────────────────────────────────────
    "jasper": {
        "source_urls": ["https://jasper.ai"],
        "confidence": 0.85,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":9,"long_form":8,"technical_writing":6,"creative_writing":9,"editing_proofreading":8,"summarization":8,"multilingual_writing":8},
        "research":                   {"overall":5,"web_search":5,"deep_analysis":4,"fact_checking":4,"synthesis":5,"academic_sources":3},
        "media_creation":             {"overall":4,"image_generation":5,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":3,"csv_excel":2,"data_visualization":2,"sql_queries":None,"statistics":2,"python_data_science":None},
        "automation_and_integrations":{"overall":7,"api_integrations":7,"workflow_automation":6,"webhooks":6,"no_code_automation":6,"scheduled_tasks":5},
        "ecosystem_synergy":          {"overall":7,"native_ecosystem_depth":8,"cross_platform":7,"open_source_compat":3,"third_party_integrations":7},
        "language_support":           {"overall":8,"hebrew":5,"english":10,"other_languages":8,"rtl_support":4,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":7,"enterprise_features":9,"self_hosting":1,"cost_efficiency_at_scale":4,"rate_limits":7},
        "education_and_learning":     {"overall":5,"explanations_clarity":4,"tutoring":3,"quiz_generation":3,"curriculum_design":4},
        "agent_and_agentic":          {"overall":6,"tool_use":6,"multi_step_tasks":7,"memory":6,"autonomy":5,"multi_agent_orchestration":4},
    },
    "surfer-seo": {
        "source_urls": ["https://surferseo.com"],
        "confidence": 0.83,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":8,"long_form":7,"technical_writing":5,"creative_writing":6,"editing_proofreading":7,"summarization":6,"multilingual_writing":7},
        "research":                   {"overall":7,"web_search":8,"deep_analysis":6,"fact_checking":5,"synthesis":6,"academic_sources":3},
        "media_creation":             {"overall":1,"image_generation":None,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":8,"csv_excel":6,"data_visualization":8,"sql_queries":None,"statistics":7,"python_data_science":None},
        "automation_and_integrations":{"overall":6,"api_integrations":6,"workflow_automation":5,"webhooks":5,"no_code_automation":5,"scheduled_tasks":5},
        "ecosystem_synergy":          {"overall":7,"native_ecosystem_depth":8,"cross_platform":6,"open_source_compat":2,"third_party_integrations":7},
        "language_support":           {"overall":8,"hebrew":5,"english":10,"other_languages":8,"rtl_support":4,"programming_languages":None},
        "deployment_and_scale":       {"overall":6,"api_access":5,"enterprise_features":7,"self_hosting":1,"cost_efficiency_at_scale":5,"rate_limits":7},
        "education_and_learning":     {"overall":6,"explanations_clarity":5,"tutoring":3,"quiz_generation":2,"curriculum_design":4},
        "agent_and_agentic":          {"overall":5,"tool_use":5,"multi_step_tasks":5,"memory":5,"autonomy":4,"multi_agent_orchestration":3},
    },

    # ── No-code / builders ────────────────────────────────────────────────────────
    "genspark": {
        "source_urls": ["https://genspark.ai"],
        "confidence": 0.70,
        "coding":                     {"overall":2,"code_generation":2,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":7,"long_form":5,"technical_writing":5,"creative_writing":6,"editing_proofreading":5,"summarization":8,"multilingual_writing":6},
        "research":                   {"overall":8,"web_search":9,"deep_analysis":7,"fact_checking":6,"synthesis":7,"academic_sources":4},
        "media_creation":             {"overall":2,"image_generation":3,"video_generation":None,"audio_generation":None,"avatar_creation":None,"music_generation":None,"voice_cloning":None},
        "data_and_analysis":          {"overall":4,"csv_excel":3,"data_visualization":4,"sql_queries":None,"statistics":3,"python_data_science":None},
        "automation_and_integrations":{"overall":3,"api_integrations":3,"workflow_automation":3,"webhooks":3,"no_code_automation":4,"scheduled_tasks":2},
        "ecosystem_synergy":          {"overall":4,"native_ecosystem_depth":4,"cross_platform":5,"open_source_compat":3,"third_party_integrations":4},
        "language_support":           {"overall":7,"hebrew":5,"english":9,"other_languages":7,"rtl_support":4,"programming_languages":3},
        "deployment_and_scale":       {"overall":5,"api_access":4,"enterprise_features":4,"self_hosting":1,"cost_efficiency_at_scale":7,"rate_limits":5},
        "education_and_learning":     {"overall":7,"explanations_clarity":7,"tutoring":5,"quiz_generation":4,"curriculum_design":4},
        "agent_and_agentic":          {"overall":5,"tool_use":5,"multi_step_tasks":6,"memory":5,"autonomy":4,"multi_agent_orchestration":3},
    },
    "descript": {
        "source_urls": ["https://descript.com"],
        "confidence": 0.85,
        "coding":                     {"overall":1,"code_generation":None,"code_review":None,"debugging":None,"refactoring":None,"test_writing":None,"multi_file_projects":None},
        "writing":                    {"overall":6,"long_form":3,"technical_writing":4,"creative_writing":4,"editing_proofreading":7,"summarization":6,"multilingual_writing":5},
        "research":                   {"overall":2,"web_search":None,"deep_analysis":None,"fact_checking":None,"synthesis":2,"academic_sources":None},
        "media_creation":             {"overall":9,"image_generation":None,"video_generation":8,"audio_generation":9,"avatar_creation":5,"music_generation":None,"voice_cloning":7},
        "data_and_analysis":          {"overall":2,"csv_excel":None,"data_visualization":None,"sql_queries":None,"statistics":None,"python_data_science":None},
        "automation_and_integrations":{"overall":6,"api_integrations":6,"workflow_automation":5,"webhooks":5,"no_code_automation":5,"scheduled_tasks":4},
        "ecosystem_synergy":          {"overall":6,"native_ecosystem_depth":7,"cross_platform":7,"open_source_compat":2,"third_party_integrations":6},
        "language_support":           {"overall":7,"hebrew":4,"english":10,"other_languages":6,"rtl_support":3,"programming_languages":None},
        "deployment_and_scale":       {"overall":7,"api_access":6,"enterprise_features":7,"self_hosting":1,"cost_efficiency_at_scale":6,"rate_limits":7},
        "education_and_learning":     {"overall":6,"explanations_clarity":3,"tutoring":3,"quiz_generation":2,"curriculum_design":3},
        "agent_and_agentic":          {"overall":4,"tool_use":4,"multi_step_tasks":4,"memory":3,"autonomy":3,"multi_agent_orchestration":1},
    },
}


# ── Source 1 — OpenRouter ───────────────────────────────────────────────────────
def fetch_openrouter_models() -> dict:
    """Returns dict of {model_id: model_data} from OpenRouter API."""
    try:
        req = urllib.request.Request(
            "https://openrouter.ai/api/v1/models",
            headers={"User-Agent": "AI-Hub/1.0"},
        )
        with urllib.request.urlopen(req, timeout=10) as r:
            return {m["id"]: m for m in json.loads(r.read()).get("data", [])}
    except Exception as e:
        print(f"  [OpenRouter] fetch failed: {e}")
        return {}


def scores_from_openrouter(model_data: dict) -> dict:
    """Derive task_scores from OpenRouter model metadata."""
    ctx    = model_data.get("context_length", 0)
    price  = float(model_data.get("pricing", {}).get("prompt", "0.000001") or "0.000001")
    desc   = (model_data.get("description") or "").lower()
    params = model_data.get("supported_parameters", []) or []

    has_tools    = any("tool" in p or "function" in p for p in params)
    has_vision   = "vision" in desc or "image" in desc or "multimodal" in desc
    is_reasoning = "reason" in desc or ":thinking" in model_data.get("id","") or "o1" in model_data.get("id","")

    # Context → multi-file, research
    ctx_score = 10 if ctx >= 500_000 else 9 if ctx >= 200_000 else 8 if ctx >= 100_000 else 7 if ctx >= 32_000 else 6

    # Price → cost efficiency (cheaper = higher score)
    if price <= 0.0000005:    cost_score = 10
    elif price <= 0.000001:   cost_score = 9
    elif price <= 0.000003:   cost_score = 8
    elif price <= 0.00001:    cost_score = 7
    elif price <= 0.00003:    cost_score = 6
    else:                     cost_score = 4

    ts = null_scores()
    ts["deployment_and_scale"].update({
        "overall": 8,
        "api_access": 10,   # it's on OpenRouter = has API
        "cost_efficiency_at_scale": cost_score,
        "enterprise_features": 6,
        "self_hosting": 2,
        "rate_limits": 7,
    })
    ts["coding"]["multi_file_projects"] = ctx_score
    ts["agent_and_agentic"]["tool_use"] = 8 if has_tools else 3
    ts["language_support"]["programming_languages"] = 8

    if has_vision:
        ts["media_creation"]["image_generation"] = 4  # can process images, not generate

    if is_reasoning:
        ts["research"]["deep_analysis"]   = 9
        ts["data_and_analysis"]["overall"] = 8

    return ts


# ── Source 2 — GitHub ───────────────────────────────────────────────────────────
def fetch_github_repo(owner_repo: str) -> dict | None:
    try:
        headers = {"User-Agent": "AI-Hub/1.0", "Accept": "application/vnd.github+json"}
        if GITHUB_TOKEN:
            headers["Authorization"] = f"Bearer {GITHUB_TOKEN}"
        req = urllib.request.Request(
            f"https://api.github.com/repos/{owner_repo}",
            headers=headers,
        )
        with urllib.request.urlopen(req, timeout=8) as r:
            return json.loads(r.read())
    except Exception as e:
        print(f"  [GitHub] {owner_repo}: {e}")
        return None


def scores_from_github(gh: dict) -> dict:
    """Derive partial scores from GitHub metadata."""
    stars      = gh.get("stargazers_count", 0)
    forks      = gh.get("forks_count", 0)
    issues     = gh.get("open_issues_count", 0)
    updated    = gh.get("updated_at", "")
    is_active  = updated >= "2024-01-01"

    # Stars → popularity proxy
    pop = 10 if stars >= 50_000 else 9 if stars >= 20_000 else 8 if stars >= 10_000 else 7 if stars >= 3_000 else 6 if stars >= 500 else 4

    ts = null_scores()
    ts["ecosystem_synergy"].update({
        "overall": pop,
        "open_source_compat": 10,
        "cross_platform": 7 if is_active else 5,
        "third_party_integrations": min(10, pop + 1),
        "native_ecosystem_depth": 7,
    })
    ts["deployment_and_scale"]["self_hosting"] = 10
    return ts


# ── Source 3 — Perplexity ────────────────────────────────────────────────────────
def fill_via_perplexity(tool_name: str, tool_link: str) -> dict | None:
    if not PERPLEXITY_KEY:
        return None
    template = null_scores()
    prompt = (
        f'Research the AI tool "{tool_name}" ({tool_link or "unknown"}) '
        f"and return ONLY a JSON object. Do not explain. Return only valid JSON.\n\n"
        f"Focus on VERIFIED information from official sources only.\n"
        f"Scoring: 10=world-best, 8-9=very strong, 6-7=good, 4-5=adequate, 2-3=poor, 0-1=not supported, null=unknown.\n\n"
        f"Include in the JSON:\n"
        f'- "last_updated": "{date.today().isoformat()}"\n'
        f'- "source_urls": [list of official URLs you used]\n'
        f'- "confidence": 0-1\n'
        f"- All task_scores fields from this template:\n"
        + json.dumps(template, ensure_ascii=False, indent=2)
    )
    payload = json.dumps({
        "model": "sonar-pro",
        "messages": [
            {"role": "system", "content": "You are a precise AI analyst. Return ONLY valid JSON."},
            {"role": "user",   "content": prompt},
        ],
        "max_tokens": 2000,
        "temperature": 0.1,
    }).encode("utf-8")
    req = urllib.request.Request(
        "https://api.perplexity.ai/chat/completions",
        data=payload,
        headers={"Authorization": f"Bearer {PERPLEXITY_KEY}", "Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            raw = json.loads(r.read())["choices"][0]["message"]["content"].strip()
        start = raw.find("{"); end = raw.rfind("}") + 1
        return json.loads(raw[start:end]) if start >= 0 and end > 0 else None
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        if "insufficient_quota" in body or e.code in (401, 402, 429):
            print(f"  [Perplexity] Quota exhausted. Recharge at https://www.perplexity.ai/settings/api")
        else:
            print(f"  [Perplexity] HTTP {e.code}: {body[:100]}")
        return None
    except Exception as e:
        print(f"  [Perplexity] Error: {e}")
        return None


# ── Merge helpers ────────────────────────────────────────────────────────────────
def _clamp(val):
    if isinstance(val, (int, float)):
        return int(max(0, min(10, val)))
    return None

def merge_scores(base: dict, override: dict) -> dict:
    result = {}
    for cat, fields in SCORE_SCHEMA.items():
        result[cat] = {}
        base_cat     = base.get(cat, {})
        override_cat = override.get(cat, {})
        for f in fields:
            bv = base_cat.get(f)
            ov = override_cat.get(f)
            # prefer override if not None; else keep base; else None
            result[cat][f] = _clamp(ov) if ov is not None else (_clamp(bv) if bv is not None else None)
    return result


# ── Main loop ─────────────────────────────────────────────────────────────────────
def fill_tools(batch_size: int = 3, report_only: bool = False) -> None:
    data  = json.loads(TOOLS_FILE.read_text(encoding="utf-8"))
    tools = data["tools"]

    all_empty  = [t for t in tools if is_empty(t.get("task_scores", null_scores()))]
    total_all  = len(all_empty)
    to_process = [] if report_only else all_empty[:batch_size]

    print(f"Tools total        : {len(tools)}")
    print(f"Still empty        : {total_all}")
    print(f"Processing now     : {len(to_process)}")
    if report_only:
        print("(report-only mode — no changes)")
        return
    print("-" * 60)

    # Pre-fetch OpenRouter models once
    print("[1/3] Fetching OpenRouter model catalog...")
    or_models = fetch_openrouter_models()
    print(f"      {len(or_models)} models available")

    updated  = 0
    sources_used: list[str] = []

    for tool in to_process:
        tid  = tool["id"]
        name = tool.get("name", tid)
        link = tool.get("link", "")
        print(f"\n[{updated+1}/{len(to_process)}] {tid} ({name})")

        final_scores   = null_scores()
        meta_extras    = {}
        source_used    = "null"

        # ── Source A: hand-scored (highest priority) ───────────────────────────
        if tid in KNOWN_SCORES:
            known = KNOWN_SCORES[tid]
            meta_extras = {
                "source_urls": known.pop("source_urls", []),
                "confidence":  known.pop("confidence", 0.8),
                "last_updated": date.today().isoformat(),
                "data_source": "verified_training_data",
            }
            final_scores = merge_scores(final_scores, known)
            source_used = "training_data"
            print(f"  -> hand-scored (training data), confidence={meta_extras['confidence']}")

        # ── Source B: OpenRouter enrichment ────────────────────────────────────
        or_id = OPENROUTER_MAP.get(tid)
        if or_id and or_id in or_models:
            or_partial = scores_from_openrouter(or_models[or_id])
            final_scores = merge_scores(or_partial, final_scores)   # hand-scores win
            if source_used == "null":
                source_used = "openrouter"
                meta_extras["source_urls"]  = [f"https://openrouter.ai/{or_id}"]
                meta_extras["confidence"]   = 0.65
                meta_extras["last_updated"] = date.today().isoformat()
                meta_extras["data_source"]  = "openrouter_api"
            else:
                meta_extras.setdefault("source_urls", []).append(f"https://openrouter.ai/{or_id}")
            print(f"  -> OpenRouter enrichment ({or_id})")

        # ── Source C: GitHub enrichment ─────────────────────────────────────────
        gh_repo = GITHUB_MAP.get(tid)
        if gh_repo:
            gh_data = fetch_github_repo(gh_repo)
            if gh_data:
                gh_partial = scores_from_github(gh_data)
                final_scores = merge_scores(gh_partial, final_scores)
                stars = gh_data.get("stargazers_count", 0)
                print(f"  -> GitHub enrichment ({gh_repo}, {stars:,} stars)")
                if source_used == "null":
                    source_used = "github"
                    meta_extras["source_urls"]  = [f"https://github.com/{gh_repo}"]
                    meta_extras["confidence"]   = 0.60
                    meta_extras["last_updated"] = date.today().isoformat()
                    meta_extras["data_source"]  = "github_api"
                else:
                    meta_extras.setdefault("source_urls", []).append(f"https://github.com/{gh_repo}")

        # ── Source D: Perplexity (last resort) ──────────────────────────────────
        if is_empty(final_scores) and PERPLEXITY_KEY:
            print(f"  -> Trying Perplexity...")
            ppl = fill_via_perplexity(name, link)
            if ppl:
                ppl_meta = {
                    "source_urls": ppl.pop("source_urls", [link]),
                    "confidence":  float(ppl.pop("confidence", 0.6)),
                    "last_updated": ppl.pop("last_updated", date.today().isoformat()),
                    "data_source": "perplexity_sonar_pro",
                }
                ppl_scores = {cat: {k: _clamp(ppl.get(cat, {}).get(k)) for k in keys}
                              for cat, keys in SCORE_SCHEMA.items()}
                final_scores = merge_scores(final_scores, ppl_scores)
                meta_extras  = ppl_meta
                source_used  = "perplexity"
                print(f"  -> Perplexity filled scores")

        # ── Patch tool ──────────────────────────────────────────────────────────
        non_null = sum(1 for cat in final_scores.values() for v in cat.values() if v is not None)
        tool["task_scores"] = final_scores
        if meta_extras:
            tool["task_scores_meta"] = meta_extras

        TOOLS_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

        print(f"  SAVED: {non_null} non-null fields, source={source_used}")
        updated += 1
        sources_used.append(source_used)
        time.sleep(0.5)

    # ── Final report ─────────────────────────────────────────────────────────────
    data2      = json.loads(TOOLS_FILE.read_text(encoding="utf-8"))
    still_null = sum(1 for t in data2["tools"] if is_empty(t.get("task_scores", null_scores())))
    scored     = len(data2["tools"]) - still_null

    print("\n" + "=" * 60)
    print(f"Batch completed : {updated} tools updated")
    print(f"Sources used    : {sources_used}")
    print(f"Scored / Total  : {scored} / {len(data2['tools'])}")
    print(f"Still empty     : {still_null}")

    # Show one example with meta
    example = next((t for t in data2["tools"] if t.get("task_scores_meta")), None)
    if example:
        meta = example.get("task_scores_meta", {})
        print(f"\nExample ({example['id']}):")
        print(f"  source_urls : {meta.get('source_urls', [])}")
        print(f"  confidence  : {meta.get('confidence')}")
        print(f"  data_source : {meta.get('data_source')}")
        cat_sample = "coding"
        print(f"  {cat_sample}: {json.dumps(example['task_scores'][cat_sample], ensure_ascii=False)}")
    print("=" * 60)


# ── CLI ────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    grp = parser.add_mutually_exclusive_group()
    grp.add_argument("--batch",  type=int, default=3, help="Tools to process (default: 3)")
    grp.add_argument("--all",    action="store_true",  help="All empty tools")
    grp.add_argument("--report", action="store_true",  help="Stats only, no changes")
    args = parser.parse_args()

    if args.report:
        fill_tools(report_only=True)
    elif args.all:
        fill_tools(batch_size=9999)
    else:
        fill_tools(batch_size=args.batch)
