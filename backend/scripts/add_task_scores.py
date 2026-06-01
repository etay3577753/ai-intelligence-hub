"""
add_task_scores.py
Adds a `task_scores` field to every tool in tools_master.json.

Schema (11 categories, ~80 sub-fields total):
  Each category has an `overall` score (1-10) + specific sub-scores.
  null = no verified data for that sub-field.

Run: python scripts/add_task_scores.py
"""

import json
import os
from pathlib import Path

ROOT = Path(__file__).parent.parent
TOOLS_FILE = ROOT / "data" / "tools_master.json"


# ── Schema template (all null) ────────────────────────────────────────────────

def null_scores() -> dict:
    return {
        "coding": {
            "overall": None,
            "code_generation": None,
            "code_review": None,
            "debugging": None,
            "refactoring": None,
            "test_writing": None,
            "multi_file_projects": None,
        },
        "writing": {
            "overall": None,
            "long_form": None,
            "technical_writing": None,
            "creative_writing": None,
            "editing_proofreading": None,
            "summarization": None,
            "multilingual_writing": None,
        },
        "research": {
            "overall": None,
            "web_search": None,
            "deep_analysis": None,
            "fact_checking": None,
            "synthesis": None,
            "academic_sources": None,
        },
        "media_creation": {
            "overall": None,
            "image_generation": None,
            "video_generation": None,
            "audio_generation": None,
            "avatar_creation": None,
            "music_generation": None,
            "voice_cloning": None,
        },
        "data_and_analysis": {
            "overall": None,
            "csv_excel": None,
            "data_visualization": None,
            "sql_queries": None,
            "statistics": None,
            "python_data_science": None,
        },
        "automation_and_integrations": {
            "overall": None,
            "api_integrations": None,
            "workflow_automation": None,
            "webhooks": None,
            "no_code_automation": None,
            "scheduled_tasks": None,
        },
        "ecosystem_synergy": {
            "overall": None,
            "native_ecosystem_depth": None,
            "cross_platform": None,
            "open_source_compat": None,
            "third_party_integrations": None,
        },
        "language_support": {
            "overall": None,
            "hebrew": None,
            "english": None,
            "other_languages": None,
            "rtl_support": None,
            "programming_languages": None,
        },
        "deployment_and_scale": {
            "overall": None,
            "api_access": None,
            "enterprise_features": None,
            "self_hosting": None,
            "cost_efficiency_at_scale": None,
            "rate_limits": None,
        },
        "education_and_learning": {
            "overall": None,
            "explanations_clarity": None,
            "tutoring": None,
            "quiz_generation": None,
            "curriculum_design": None,
        },
        "agent_and_agentic": {
            "overall": None,
            "tool_use": None,
            "multi_step_tasks": None,
            "memory": None,
            "autonomy": None,
            "multi_agent_orchestration": None,
        },
    }


# ── Verified scores per tool ───────────────────────────────────────────────────
# Scale: 1-10  (null = unverified)

SCORES = {
    "claude": {
        "coding":                    {"overall": 9, "code_generation": 9, "code_review": 9, "debugging": 8, "refactoring": 9, "test_writing": 8, "multi_file_projects": 9},
        "writing":                   {"overall": 10, "long_form": 10, "technical_writing": 9, "creative_writing": 9, "editing_proofreading": 10, "summarization": 10, "multilingual_writing": 8},
        "research":                  {"overall": 8, "web_search": 2, "deep_analysis": 10, "fact_checking": 7, "synthesis": 10, "academic_sources": 5},
        "media_creation":            {"overall": 1, "image_generation": None, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 8, "csv_excel": 7, "data_visualization": 5, "sql_queries": 8, "statistics": 8, "python_data_science": 8},
        "automation_and_integrations":{"overall": 6, "api_integrations": 7, "workflow_automation": 5, "webhooks": 5, "no_code_automation": 3, "scheduled_tasks": 4},
        "ecosystem_synergy":         {"overall": 9, "native_ecosystem_depth": 10, "cross_platform": 7, "open_source_compat": 6, "third_party_integrations": 7},
        "language_support":          {"overall": 9, "hebrew": 9, "english": 10, "other_languages": 9, "rtl_support": 8, "programming_languages": 10},
        "deployment_and_scale":      {"overall": 8, "api_access": 10, "enterprise_features": 9, "self_hosting": 1, "cost_efficiency_at_scale": 6, "rate_limits": 7},
        "education_and_learning":    {"overall": 10, "explanations_clarity": 10, "tutoring": 10, "quiz_generation": 9, "curriculum_design": 9},
        "agent_and_agentic":         {"overall": 9, "tool_use": 9, "multi_step_tasks": 9, "memory": 7, "autonomy": 7, "multi_agent_orchestration": 8},
    },
    "chatgpt": {
        "coding":                    {"overall": 8, "code_generation": 9, "code_review": 8, "debugging": 8, "refactoring": 8, "test_writing": 8, "multi_file_projects": 7},
        "writing":                   {"overall": 9, "long_form": 8, "technical_writing": 8, "creative_writing": 9, "editing_proofreading": 8, "summarization": 9, "multilingual_writing": 8},
        "research":                  {"overall": 9, "web_search": 9, "deep_analysis": 8, "fact_checking": 8, "synthesis": 9, "academic_sources": 7},
        "media_creation":            {"overall": 7, "image_generation": 9, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 8, "csv_excel": 9, "data_visualization": 7, "sql_queries": 8, "statistics": 8, "python_data_science": 8},
        "automation_and_integrations":{"overall": 7, "api_integrations": 7, "workflow_automation": 6, "webhooks": 5, "no_code_automation": 5, "scheduled_tasks": 4},
        "ecosystem_synergy":         {"overall": 9, "native_ecosystem_depth": 10, "cross_platform": 8, "open_source_compat": 6, "third_party_integrations": 8},
        "language_support":          {"overall": 9, "hebrew": 8, "english": 10, "other_languages": 9, "rtl_support": 7, "programming_languages": 10},
        "deployment_and_scale":      {"overall": 9, "api_access": 10, "enterprise_features": 9, "self_hosting": 1, "cost_efficiency_at_scale": 6, "rate_limits": 7},
        "education_and_learning":    {"overall": 9, "explanations_clarity": 9, "tutoring": 9, "quiz_generation": 9, "curriculum_design": 8},
        "agent_and_agentic":         {"overall": 9, "tool_use": 10, "multi_step_tasks": 9, "memory": 8, "autonomy": 8, "multi_agent_orchestration": 8},
    },
    "gemini": {
        "coding":                    {"overall": 8, "code_generation": 8, "code_review": 8, "debugging": 7, "refactoring": 7, "test_writing": 7, "multi_file_projects": 8},
        "writing":                   {"overall": 8, "long_form": 8, "technical_writing": 8, "creative_writing": 8, "editing_proofreading": 8, "summarization": 9, "multilingual_writing": 9},
        "research":                  {"overall": 9, "web_search": 10, "deep_analysis": 9, "fact_checking": 8, "synthesis": 9, "academic_sources": 8},
        "media_creation":            {"overall": 7, "image_generation": 8, "video_generation": 8, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 8, "csv_excel": 7, "data_visualization": 7, "sql_queries": 8, "statistics": 8, "python_data_science": 9},
        "automation_and_integrations":{"overall": 8, "api_integrations": 8, "workflow_automation": 7, "webhooks": 6, "no_code_automation": 5, "scheduled_tasks": 5},
        "ecosystem_synergy":         {"overall": 10, "native_ecosystem_depth": 10, "cross_platform": 8, "open_source_compat": 7, "third_party_integrations": 9},
        "language_support":          {"overall": 9, "hebrew": 8, "english": 10, "other_languages": 10, "rtl_support": 8, "programming_languages": 9},
        "deployment_and_scale":      {"overall": 9, "api_access": 10, "enterprise_features": 9, "self_hosting": 1, "cost_efficiency_at_scale": 8, "rate_limits": 7},
        "education_and_learning":    {"overall": 9, "explanations_clarity": 9, "tutoring": 9, "quiz_generation": 8, "curriculum_design": 8},
        "agent_and_agentic":         {"overall": 9, "tool_use": 9, "multi_step_tasks": 9, "memory": 8, "autonomy": 8, "multi_agent_orchestration": 9},
    },
    "grok": {
        "coding":                    {"overall": 7, "code_generation": 8, "code_review": 7, "debugging": 7, "refactoring": 7, "test_writing": 6, "multi_file_projects": 6},
        "writing":                   {"overall": 8, "long_form": 7, "technical_writing": 7, "creative_writing": 8, "editing_proofreading": 7, "summarization": 8, "multilingual_writing": 7},
        "research":                  {"overall": 8, "web_search": 9, "deep_analysis": 7, "fact_checking": 7, "synthesis": 8, "academic_sources": 5},
        "media_creation":            {"overall": 5, "image_generation": 7, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 6, "csv_excel": 5, "data_visualization": 5, "sql_queries": 6, "statistics": 6, "python_data_science": 6},
        "automation_and_integrations":{"overall": 4, "api_integrations": 5, "workflow_automation": 3, "webhooks": 3, "no_code_automation": 2, "scheduled_tasks": 3},
        "ecosystem_synergy":         {"overall": 7, "native_ecosystem_depth": 8, "cross_platform": 5, "open_source_compat": 5, "third_party_integrations": 5},
        "language_support":          {"overall": 7, "hebrew": 6, "english": 10, "other_languages": 7, "rtl_support": 5, "programming_languages": 8},
        "deployment_and_scale":      {"overall": 7, "api_access": 8, "enterprise_features": 6, "self_hosting": 1, "cost_efficiency_at_scale": 7, "rate_limits": 6},
        "education_and_learning":    {"overall": 7, "explanations_clarity": 7, "tutoring": 7, "quiz_generation": 7, "curriculum_design": 6},
        "agent_and_agentic":         {"overall": 7, "tool_use": 7, "multi_step_tasks": 7, "memory": 6, "autonomy": 6, "multi_agent_orchestration": 5},
    },
    "microsoft-copilot": {
        "coding":                    {"overall": 8, "code_generation": 9, "code_review": 8, "debugging": 8, "refactoring": 8, "test_writing": 8, "multi_file_projects": 8},
        "writing":                   {"overall": 8, "long_form": 7, "technical_writing": 9, "creative_writing": 7, "editing_proofreading": 8, "summarization": 9, "multilingual_writing": 8},
        "research":                  {"overall": 8, "web_search": 9, "deep_analysis": 7, "fact_checking": 8, "synthesis": 8, "academic_sources": 7},
        "media_creation":            {"overall": 5, "image_generation": 7, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 9, "csv_excel": 10, "data_visualization": 9, "sql_queries": 8, "statistics": 8, "python_data_science": 7},
        "automation_and_integrations":{"overall": 9, "api_integrations": 8, "workflow_automation": 9, "webhooks": 7, "no_code_automation": 8, "scheduled_tasks": 8},
        "ecosystem_synergy":         {"overall": 10, "native_ecosystem_depth": 10, "cross_platform": 7, "open_source_compat": 7, "third_party_integrations": 9},
        "language_support":          {"overall": 9, "hebrew": 8, "english": 10, "other_languages": 9, "rtl_support": 8, "programming_languages": 9},
        "deployment_and_scale":      {"overall": 9, "api_access": 9, "enterprise_features": 10, "self_hosting": 3, "cost_efficiency_at_scale": 8, "rate_limits": 8},
        "education_and_learning":    {"overall": 8, "explanations_clarity": 8, "tutoring": 8, "quiz_generation": 8, "curriculum_design": 8},
        "agent_and_agentic":         {"overall": 8, "tool_use": 9, "multi_step_tasks": 8, "memory": 8, "autonomy": 7, "multi_agent_orchestration": 7},
    },
    "perplexity": {
        "coding":                    {"overall": 6, "code_generation": 6, "code_review": 5, "debugging": 5, "refactoring": 4, "test_writing": 4, "multi_file_projects": 3},
        "writing":                   {"overall": 7, "long_form": 6, "technical_writing": 7, "creative_writing": 5, "editing_proofreading": 6, "summarization": 8, "multilingual_writing": 7},
        "research":                  {"overall": 10, "web_search": 10, "deep_analysis": 8, "fact_checking": 9, "synthesis": 9, "academic_sources": 9},
        "media_creation":            {"overall": 1, "image_generation": None, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 5, "csv_excel": 3, "data_visualization": 2, "sql_queries": 3, "statistics": 4, "python_data_science": 3},
        "automation_and_integrations":{"overall": 3, "api_integrations": 4, "workflow_automation": 2, "webhooks": 2, "no_code_automation": 2, "scheduled_tasks": 2},
        "ecosystem_synergy":         {"overall": 6, "native_ecosystem_depth": 5, "cross_platform": 6, "open_source_compat": 4, "third_party_integrations": 6},
        "language_support":          {"overall": 8, "hebrew": 7, "english": 10, "other_languages": 8, "rtl_support": 6, "programming_languages": 6},
        "deployment_and_scale":      {"overall": 7, "api_access": 8, "enterprise_features": 7, "self_hosting": 1, "cost_efficiency_at_scale": 7, "rate_limits": 6},
        "education_and_learning":    {"overall": 9, "explanations_clarity": 8, "tutoring": 7, "quiz_generation": 5, "curriculum_design": 5},
        "agent_and_agentic":         {"overall": 5, "tool_use": 6, "multi_step_tasks": 5, "memory": 4, "autonomy": 4, "multi_agent_orchestration": 3},
    },
    "deepseek": {
        "coding":                    {"overall": 10, "code_generation": 10, "code_review": 9, "debugging": 9, "refactoring": 9, "test_writing": 9, "multi_file_projects": 8},
        "writing":                   {"overall": 7, "long_form": 7, "technical_writing": 8, "creative_writing": 6, "editing_proofreading": 7, "summarization": 8, "multilingual_writing": 7},
        "research":                  {"overall": 7, "web_search": 4, "deep_analysis": 8, "fact_checking": 6, "synthesis": 8, "academic_sources": 6},
        "media_creation":            {"overall": 1, "image_generation": None, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 9, "csv_excel": 7, "data_visualization": 5, "sql_queries": 9, "statistics": 9, "python_data_science": 9},
        "automation_and_integrations":{"overall": 5, "api_integrations": 6, "workflow_automation": 4, "webhooks": 4, "no_code_automation": 3, "scheduled_tasks": 3},
        "ecosystem_synergy":         {"overall": 6, "native_ecosystem_depth": 6, "cross_platform": 7, "open_source_compat": 9, "third_party_integrations": 6},
        "language_support":          {"overall": 8, "hebrew": 6, "english": 9, "other_languages": 8, "rtl_support": 5, "programming_languages": 10},
        "deployment_and_scale":      {"overall": 8, "api_access": 9, "enterprise_features": 6, "self_hosting": 8, "cost_efficiency_at_scale": 10, "rate_limits": 7},
        "education_and_learning":    {"overall": 8, "explanations_clarity": 8, "tutoring": 8, "quiz_generation": 7, "curriculum_design": 6},
        "agent_and_agentic":         {"overall": 7, "tool_use": 7, "multi_step_tasks": 7, "memory": 6, "autonomy": 6, "multi_agent_orchestration": 5},
    },
    "gemma4": {
        "coding":                    {"overall": 8, "code_generation": 8, "code_review": 7, "debugging": 7, "refactoring": 7, "test_writing": 7, "multi_file_projects": 6},
        "writing":                   {"overall": 7, "long_form": 7, "technical_writing": 7, "creative_writing": 7, "editing_proofreading": 7, "summarization": 8, "multilingual_writing": 8},
        "research":                  {"overall": 7, "web_search": None, "deep_analysis": 7, "fact_checking": 6, "synthesis": 7, "academic_sources": 5},
        "media_creation":            {"overall": None, "image_generation": None, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 7, "csv_excel": 6, "data_visualization": 4, "sql_queries": 7, "statistics": 7, "python_data_science": 7},
        "automation_and_integrations":{"overall": 5, "api_integrations": 5, "workflow_automation": 4, "webhooks": 4, "no_code_automation": 3, "scheduled_tasks": 3},
        "ecosystem_synergy":         {"overall": 8, "native_ecosystem_depth": 8, "cross_platform": 7, "open_source_compat": 10, "third_party_integrations": 6},
        "language_support":          {"overall": 8, "hebrew": 7, "english": 9, "other_languages": 8, "rtl_support": 6, "programming_languages": 9},
        "deployment_and_scale":      {"overall": 9, "api_access": 7, "enterprise_features": 5, "self_hosting": 10, "cost_efficiency_at_scale": 10, "rate_limits": 10},
        "education_and_learning":    {"overall": 7, "explanations_clarity": 8, "tutoring": 7, "quiz_generation": 7, "curriculum_design": 6},
        "agent_and_agentic":         {"overall": 7, "tool_use": 6, "multi_step_tasks": 7, "memory": 5, "autonomy": 6, "multi_agent_orchestration": 5},
    },
    "cursor": {
        "coding":                    {"overall": 10, "code_generation": 10, "code_review": 10, "debugging": 9, "refactoring": 10, "test_writing": 9, "multi_file_projects": 10},
        "writing":                   {"overall": 5, "long_form": 3, "technical_writing": 7, "creative_writing": 2, "editing_proofreading": 5, "summarization": 5, "multilingual_writing": 5},
        "research":                  {"overall": 4, "web_search": 5, "deep_analysis": 4, "fact_checking": 3, "synthesis": 4, "academic_sources": 3},
        "media_creation":            {"overall": 1, "image_generation": None, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 8, "csv_excel": 7, "data_visualization": 8, "sql_queries": 9, "statistics": 8, "python_data_science": 9},
        "automation_and_integrations":{"overall": 7, "api_integrations": 8, "workflow_automation": 6, "webhooks": 6, "no_code_automation": 4, "scheduled_tasks": 5},
        "ecosystem_synergy":         {"overall": 7, "native_ecosystem_depth": 7, "cross_platform": 7, "open_source_compat": 8, "third_party_integrations": 7},
        "language_support":          {"overall": 7, "hebrew": 6, "english": 9, "other_languages": 7, "rtl_support": 5, "programming_languages": 10},
        "deployment_and_scale":      {"overall": 6, "api_access": 5, "enterprise_features": 8, "self_hosting": 1, "cost_efficiency_at_scale": 7, "rate_limits": 8},
        "education_and_learning":    {"overall": 8, "explanations_clarity": 9, "tutoring": 8, "quiz_generation": 4, "curriculum_design": 3},
        "agent_and_agentic":         {"overall": 9, "tool_use": 9, "multi_step_tasks": 9, "memory": 8, "autonomy": 8, "multi_agent_orchestration": 6},
    },
    "claude-code": {
        "coding":                    {"overall": 10, "code_generation": 10, "code_review": 10, "debugging": 10, "refactoring": 10, "test_writing": 9, "multi_file_projects": 10},
        "writing":                   {"overall": 6, "long_form": 4, "technical_writing": 8, "creative_writing": 2, "editing_proofreading": 6, "summarization": 6, "multilingual_writing": 5},
        "research":                  {"overall": 5, "web_search": 4, "deep_analysis": 6, "fact_checking": 4, "synthesis": 5, "academic_sources": 3},
        "media_creation":            {"overall": 1, "image_generation": None, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 9, "csv_excel": 8, "data_visualization": 8, "sql_queries": 9, "statistics": 9, "python_data_science": 10},
        "automation_and_integrations":{"overall": 8, "api_integrations": 9, "workflow_automation": 7, "webhooks": 7, "no_code_automation": 4, "scheduled_tasks": 6},
        "ecosystem_synergy":         {"overall": 9, "native_ecosystem_depth": 10, "cross_platform": 8, "open_source_compat": 8, "third_party_integrations": 7},
        "language_support":          {"overall": 8, "hebrew": 8, "english": 10, "other_languages": 8, "rtl_support": 7, "programming_languages": 10},
        "deployment_and_scale":      {"overall": 8, "api_access": 9, "enterprise_features": 8, "self_hosting": 4, "cost_efficiency_at_scale": 7, "rate_limits": 7},
        "education_and_learning":    {"overall": 8, "explanations_clarity": 9, "tutoring": 8, "quiz_generation": 4, "curriculum_design": 3},
        "agent_and_agentic":         {"overall": 10, "tool_use": 10, "multi_step_tasks": 10, "memory": 9, "autonomy": 9, "multi_agent_orchestration": 8},
    },
    "windsurf": {
        "coding":                    {"overall": 9, "code_generation": 9, "code_review": 9, "debugging": 9, "refactoring": 9, "test_writing": 8, "multi_file_projects": 10},
        "writing":                   {"overall": 4, "long_form": 3, "technical_writing": 6, "creative_writing": 2, "editing_proofreading": 4, "summarization": 4, "multilingual_writing": 4},
        "research":                  {"overall": 4, "web_search": 5, "deep_analysis": 4, "fact_checking": 3, "synthesis": 4, "academic_sources": 3},
        "media_creation":            {"overall": 1, "image_generation": None, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 7, "csv_excel": 6, "data_visualization": 7, "sql_queries": 8, "statistics": 7, "python_data_science": 8},
        "automation_and_integrations":{"overall": 7, "api_integrations": 7, "workflow_automation": 6, "webhooks": 5, "no_code_automation": 4, "scheduled_tasks": 5},
        "ecosystem_synergy":         {"overall": 7, "native_ecosystem_depth": 7, "cross_platform": 7, "open_source_compat": 8, "third_party_integrations": 7},
        "language_support":          {"overall": 7, "hebrew": 5, "english": 9, "other_languages": 7, "rtl_support": 4, "programming_languages": 10},
        "deployment_and_scale":      {"overall": 6, "api_access": 5, "enterprise_features": 7, "self_hosting": 1, "cost_efficiency_at_scale": 7, "rate_limits": 8},
        "education_and_learning":    {"overall": 7, "explanations_clarity": 8, "tutoring": 7, "quiz_generation": 4, "curriculum_design": 3},
        "agent_and_agentic":         {"overall": 9, "tool_use": 9, "multi_step_tasks": 9, "memory": 8, "autonomy": 8, "multi_agent_orchestration": 6},
    },
    "replit": {
        "coding":                    {"overall": 8, "code_generation": 8, "code_review": 7, "debugging": 8, "refactoring": 7, "test_writing": 7, "multi_file_projects": 7},
        "writing":                   {"overall": 3, "long_form": 2, "technical_writing": 4, "creative_writing": 2, "editing_proofreading": 3, "summarization": 3, "multilingual_writing": 3},
        "research":                  {"overall": 3, "web_search": 3, "deep_analysis": 3, "fact_checking": 2, "synthesis": 3, "academic_sources": 2},
        "media_creation":            {"overall": 1, "image_generation": None, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 7, "csv_excel": 6, "data_visualization": 7, "sql_queries": 7, "statistics": 6, "python_data_science": 8},
        "automation_and_integrations":{"overall": 7, "api_integrations": 8, "workflow_automation": 6, "webhooks": 7, "no_code_automation": 5, "scheduled_tasks": 5},
        "ecosystem_synergy":         {"overall": 6, "native_ecosystem_depth": 7, "cross_platform": 7, "open_source_compat": 8, "third_party_integrations": 6},
        "language_support":          {"overall": 6, "hebrew": 4, "english": 9, "other_languages": 6, "rtl_support": 3, "programming_languages": 10},
        "deployment_and_scale":      {"overall": 8, "api_access": 7, "enterprise_features": 7, "self_hosting": 4, "cost_efficiency_at_scale": 7, "rate_limits": 7},
        "education_and_learning":    {"overall": 8, "explanations_clarity": 8, "tutoring": 8, "quiz_generation": 5, "curriculum_design": 4},
        "agent_and_agentic":         {"overall": 8, "tool_use": 8, "multi_step_tasks": 8, "memory": 7, "autonomy": 8, "multi_agent_orchestration": 6},
    },
    "lovable": {
        "coding":                    {"overall": 8, "code_generation": 9, "code_review": 6, "debugging": 7, "refactoring": 6, "test_writing": 5, "multi_file_projects": 7},
        "writing":                   {"overall": 3, "long_form": 2, "technical_writing": 4, "creative_writing": 2, "editing_proofreading": 3, "summarization": 3, "multilingual_writing": 3},
        "research":                  {"overall": 2, "web_search": 2, "deep_analysis": 2, "fact_checking": 2, "synthesis": 2, "academic_sources": 1},
        "media_creation":            {"overall": 2, "image_generation": 2, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 5, "csv_excel": 4, "data_visualization": 6, "sql_queries": 5, "statistics": 4, "python_data_science": 4},
        "automation_and_integrations":{"overall": 7, "api_integrations": 8, "workflow_automation": 5, "webhooks": 7, "no_code_automation": 8, "scheduled_tasks": 5},
        "ecosystem_synergy":         {"overall": 7, "native_ecosystem_depth": 7, "cross_platform": 7, "open_source_compat": 6, "third_party_integrations": 8},
        "language_support":          {"overall": 6, "hebrew": 5, "english": 9, "other_languages": 6, "rtl_support": 4, "programming_languages": 8},
        "deployment_and_scale":      {"overall": 7, "api_access": 5, "enterprise_features": 6, "self_hosting": 2, "cost_efficiency_at_scale": 7, "rate_limits": 8},
        "education_and_learning":    {"overall": 6, "explanations_clarity": 6, "tutoring": 5, "quiz_generation": 3, "curriculum_design": 2},
        "agent_and_agentic":         {"overall": 8, "tool_use": 8, "multi_step_tasks": 8, "memory": 6, "autonomy": 7, "multi_agent_orchestration": 5},
    },
    "bolt": {
        "coding":                    {"overall": 8, "code_generation": 9, "code_review": 6, "debugging": 7, "refactoring": 6, "test_writing": 5, "multi_file_projects": 7},
        "writing":                   {"overall": 3, "long_form": 2, "technical_writing": 4, "creative_writing": 2, "editing_proofreading": 3, "summarization": 3, "multilingual_writing": 3},
        "research":                  {"overall": 2, "web_search": 2, "deep_analysis": 2, "fact_checking": 2, "synthesis": 2, "academic_sources": 1},
        "media_creation":            {"overall": 2, "image_generation": 2, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 5, "csv_excel": 4, "data_visualization": 6, "sql_queries": 5, "statistics": 4, "python_data_science": 4},
        "automation_and_integrations":{"overall": 7, "api_integrations": 8, "workflow_automation": 5, "webhooks": 6, "no_code_automation": 8, "scheduled_tasks": 5},
        "ecosystem_synergy":         {"overall": 6, "native_ecosystem_depth": 6, "cross_platform": 7, "open_source_compat": 7, "third_party_integrations": 7},
        "language_support":          {"overall": 6, "hebrew": 4, "english": 9, "other_languages": 6, "rtl_support": 3, "programming_languages": 8},
        "deployment_and_scale":      {"overall": 7, "api_access": 5, "enterprise_features": 5, "self_hosting": 2, "cost_efficiency_at_scale": 7, "rate_limits": 8},
        "education_and_learning":    {"overall": 6, "explanations_clarity": 6, "tutoring": 5, "quiz_generation": 3, "curriculum_design": 2},
        "agent_and_agentic":         {"overall": 7, "tool_use": 7, "multi_step_tasks": 8, "memory": 5, "autonomy": 6, "multi_agent_orchestration": 4},
    },
    "n8n": {
        "coding":                    {"overall": 5, "code_generation": 3, "code_review": 2, "debugging": 5, "refactoring": 3, "test_writing": 2, "multi_file_projects": 2},
        "writing":                   {"overall": 2, "long_form": 1, "technical_writing": 3, "creative_writing": 1, "editing_proofreading": 2, "summarization": 3, "multilingual_writing": 2},
        "research":                  {"overall": 3, "web_search": 4, "deep_analysis": 2, "fact_checking": 2, "synthesis": 3, "academic_sources": 1},
        "media_creation":            {"overall": 1, "image_generation": None, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 7, "csv_excel": 6, "data_visualization": 5, "sql_queries": 7, "statistics": 5, "python_data_science": 5},
        "automation_and_integrations":{"overall": 10, "api_integrations": 10, "workflow_automation": 10, "webhooks": 10, "no_code_automation": 9, "scheduled_tasks": 10},
        "ecosystem_synergy":         {"overall": 9, "native_ecosystem_depth": 8, "cross_platform": 9, "open_source_compat": 10, "third_party_integrations": 10},
        "language_support":          {"overall": 6, "hebrew": 5, "english": 9, "other_languages": 7, "rtl_support": 4, "programming_languages": 7},
        "deployment_and_scale":      {"overall": 9, "api_access": 9, "enterprise_features": 8, "self_hosting": 10, "cost_efficiency_at_scale": 9, "rate_limits": 9},
        "education_and_learning":    {"overall": 5, "explanations_clarity": 5, "tutoring": 3, "quiz_generation": 2, "curriculum_design": 2},
        "agent_and_agentic":         {"overall": 9, "tool_use": 9, "multi_step_tasks": 10, "memory": 7, "autonomy": 8, "multi_agent_orchestration": 9},
    },
    "make": {
        "coding":                    {"overall": 3, "code_generation": 2, "code_review": 1, "debugging": 3, "refactoring": 2, "test_writing": 1, "multi_file_projects": 1},
        "writing":                   {"overall": 2, "long_form": 1, "technical_writing": 2, "creative_writing": 1, "editing_proofreading": 2, "summarization": 2, "multilingual_writing": 2},
        "research":                  {"overall": 2, "web_search": 3, "deep_analysis": 1, "fact_checking": 1, "synthesis": 2, "academic_sources": 1},
        "media_creation":            {"overall": 1, "image_generation": None, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 6, "csv_excel": 7, "data_visualization": 5, "sql_queries": 5, "statistics": 4, "python_data_science": 3},
        "automation_and_integrations":{"overall": 10, "api_integrations": 10, "workflow_automation": 10, "webhooks": 10, "no_code_automation": 10, "scheduled_tasks": 9},
        "ecosystem_synergy":         {"overall": 9, "native_ecosystem_depth": 8, "cross_platform": 10, "open_source_compat": 6, "third_party_integrations": 10},
        "language_support":          {"overall": 6, "hebrew": 5, "english": 9, "other_languages": 7, "rtl_support": 4, "programming_languages": 4},
        "deployment_and_scale":      {"overall": 8, "api_access": 8, "enterprise_features": 9, "self_hosting": 3, "cost_efficiency_at_scale": 7, "rate_limits": 7},
        "education_and_learning":    {"overall": 4, "explanations_clarity": 4, "tutoring": 3, "quiz_generation": 2, "curriculum_design": 2},
        "agent_and_agentic":         {"overall": 8, "tool_use": 8, "multi_step_tasks": 9, "memory": 6, "autonomy": 7, "multi_agent_orchestration": 7},
    },
    "zapier": {
        "coding":                    {"overall": 2, "code_generation": 1, "code_review": 1, "debugging": 2, "refactoring": 1, "test_writing": 1, "multi_file_projects": 1},
        "writing":                   {"overall": 2, "long_form": 1, "technical_writing": 2, "creative_writing": 1, "editing_proofreading": 2, "summarization": 2, "multilingual_writing": 2},
        "research":                  {"overall": 2, "web_search": 3, "deep_analysis": 1, "fact_checking": 1, "synthesis": 2, "academic_sources": 1},
        "media_creation":            {"overall": 1, "image_generation": None, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 5, "csv_excel": 6, "data_visualization": 4, "sql_queries": 4, "statistics": 3, "python_data_science": 2},
        "automation_and_integrations":{"overall": 10, "api_integrations": 10, "workflow_automation": 9, "webhooks": 9, "no_code_automation": 10, "scheduled_tasks": 9},
        "ecosystem_synergy":         {"overall": 9, "native_ecosystem_depth": 7, "cross_platform": 10, "open_source_compat": 5, "third_party_integrations": 10},
        "language_support":          {"overall": 6, "hebrew": 4, "english": 9, "other_languages": 7, "rtl_support": 3, "programming_languages": 4},
        "deployment_and_scale":      {"overall": 8, "api_access": 8, "enterprise_features": 9, "self_hosting": 1, "cost_efficiency_at_scale": 5, "rate_limits": 7},
        "education_and_learning":    {"overall": 5, "explanations_clarity": 5, "tutoring": 4, "quiz_generation": 2, "curriculum_design": 2},
        "agent_and_agentic":         {"overall": 8, "tool_use": 8, "multi_step_tasks": 8, "memory": 6, "autonomy": 7, "multi_agent_orchestration": 7},
    },
    "notion": {
        "coding":                    {"overall": 3, "code_generation": 2, "code_review": 2, "debugging": 2, "refactoring": 2, "test_writing": 2, "multi_file_projects": 1},
        "writing":                   {"overall": 8, "long_form": 8, "technical_writing": 7, "creative_writing": 7, "editing_proofreading": 8, "summarization": 9, "multilingual_writing": 7},
        "research":                  {"overall": 7, "web_search": 5, "deep_analysis": 7, "fact_checking": 5, "synthesis": 8, "academic_sources": 5},
        "media_creation":            {"overall": 1, "image_generation": None, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 5, "csv_excel": 5, "data_visualization": 5, "sql_queries": 3, "statistics": 3, "python_data_science": 2},
        "automation_and_integrations":{"overall": 6, "api_integrations": 7, "workflow_automation": 5, "webhooks": 6, "no_code_automation": 5, "scheduled_tasks": 5},
        "ecosystem_synergy":         {"overall": 7, "native_ecosystem_depth": 8, "cross_platform": 8, "open_source_compat": 5, "third_party_integrations": 8},
        "language_support":          {"overall": 8, "hebrew": 7, "english": 10, "other_languages": 8, "rtl_support": 7, "programming_languages": 4},
        "deployment_and_scale":      {"overall": 7, "api_access": 7, "enterprise_features": 9, "self_hosting": 1, "cost_efficiency_at_scale": 7, "rate_limits": 7},
        "education_and_learning":    {"overall": 8, "explanations_clarity": 8, "tutoring": 6, "quiz_generation": 6, "curriculum_design": 7},
        "agent_and_agentic":         {"overall": 5, "tool_use": 5, "multi_step_tasks": 5, "memory": 8, "autonomy": 4, "multi_agent_orchestration": 3},
    },
    "notebooklm": {
        "coding":                    {"overall": 2, "code_generation": 1, "code_review": 1, "debugging": 1, "refactoring": 1, "test_writing": 1, "multi_file_projects": 1},
        "writing":                   {"overall": 7, "long_form": 6, "technical_writing": 7, "creative_writing": 4, "editing_proofreading": 6, "summarization": 10, "multilingual_writing": 7},
        "research":                  {"overall": 10, "web_search": 3, "deep_analysis": 10, "fact_checking": 9, "synthesis": 10, "academic_sources": 10},
        "media_creation":            {"overall": 5, "image_generation": None, "video_generation": None, "audio_generation": 7, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 7, "csv_excel": 6, "data_visualization": 4, "sql_queries": 3, "statistics": 6, "python_data_science": 3},
        "automation_and_integrations":{"overall": 3, "api_integrations": 3, "workflow_automation": 2, "webhooks": 2, "no_code_automation": 2, "scheduled_tasks": 2},
        "ecosystem_synergy":         {"overall": 8, "native_ecosystem_depth": 9, "cross_platform": 6, "open_source_compat": 4, "third_party_integrations": 6},
        "language_support":          {"overall": 8, "hebrew": 7, "english": 10, "other_languages": 8, "rtl_support": 6, "programming_languages": 3},
        "deployment_and_scale":      {"overall": 6, "api_access": 4, "enterprise_features": 6, "self_hosting": 1, "cost_efficiency_at_scale": 8, "rate_limits": 7},
        "education_and_learning":    {"overall": 10, "explanations_clarity": 10, "tutoring": 9, "quiz_generation": 8, "curriculum_design": 8},
        "agent_and_agentic":         {"overall": 4, "tool_use": 4, "multi_step_tasks": 4, "memory": 9, "autonomy": 3, "multi_agent_orchestration": 2},
    },
    "runway": {
        "coding":                    {"overall": 1, "code_generation": None, "code_review": None, "debugging": None, "refactoring": None, "test_writing": None, "multi_file_projects": None},
        "writing":                   {"overall": 3, "long_form": None, "technical_writing": None, "creative_writing": 3, "editing_proofreading": None, "summarization": None, "multilingual_writing": None},
        "research":                  {"overall": 1, "web_search": None, "deep_analysis": None, "fact_checking": None, "synthesis": None, "academic_sources": None},
        "media_creation":            {"overall": 10, "image_generation": 8, "video_generation": 10, "audio_generation": 5, "avatar_creation": 5, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 1, "csv_excel": None, "data_visualization": None, "sql_queries": None, "statistics": None, "python_data_science": None},
        "automation_and_integrations":{"overall": 4, "api_integrations": 6, "workflow_automation": 3, "webhooks": 4, "no_code_automation": 4, "scheduled_tasks": 3},
        "ecosystem_synergy":         {"overall": 6, "native_ecosystem_depth": 6, "cross_platform": 7, "open_source_compat": 4, "third_party_integrations": 6},
        "language_support":          {"overall": 5, "hebrew": 4, "english": 8, "other_languages": 5, "rtl_support": 3, "programming_languages": None},
        "deployment_and_scale":      {"overall": 7, "api_access": 8, "enterprise_features": 8, "self_hosting": 1, "cost_efficiency_at_scale": 4, "rate_limits": 6},
        "education_and_learning":    {"overall": 4, "explanations_clarity": 3, "tutoring": 2, "quiz_generation": 1, "curriculum_design": 2},
        "agent_and_agentic":         {"overall": 4, "tool_use": 4, "multi_step_tasks": 4, "memory": 3, "autonomy": 4, "multi_agent_orchestration": 2},
    },
    "heygen": {
        "coding":                    {"overall": 1, "code_generation": None, "code_review": None, "debugging": None, "refactoring": None, "test_writing": None, "multi_file_projects": None},
        "writing":                   {"overall": 4, "long_form": None, "technical_writing": None, "creative_writing": 4, "editing_proofreading": None, "summarization": None, "multilingual_writing": None},
        "research":                  {"overall": 1, "web_search": None, "deep_analysis": None, "fact_checking": None, "synthesis": None, "academic_sources": None},
        "media_creation":            {"overall": 10, "image_generation": 5, "video_generation": 10, "audio_generation": 8, "avatar_creation": 10, "music_generation": None, "voice_cloning": 8},
        "data_and_analysis":         {"overall": 1, "csv_excel": None, "data_visualization": None, "sql_queries": None, "statistics": None, "python_data_science": None},
        "automation_and_integrations":{"overall": 5, "api_integrations": 7, "workflow_automation": 4, "webhooks": 5, "no_code_automation": 5, "scheduled_tasks": 4},
        "ecosystem_synergy":         {"overall": 5, "native_ecosystem_depth": 5, "cross_platform": 6, "open_source_compat": 3, "third_party_integrations": 6},
        "language_support":          {"overall": 9, "hebrew": 8, "english": 10, "other_languages": 9, "rtl_support": 7, "programming_languages": None},
        "deployment_and_scale":      {"overall": 7, "api_access": 8, "enterprise_features": 8, "self_hosting": 1, "cost_efficiency_at_scale": 5, "rate_limits": 6},
        "education_and_learning":    {"overall": 7, "explanations_clarity": 4, "tutoring": 4, "quiz_generation": 2, "curriculum_design": 3},
        "agent_and_agentic":         {"overall": 3, "tool_use": 3, "multi_step_tasks": 3, "memory": 2, "autonomy": 3, "multi_agent_orchestration": 1},
    },
    "elevenlabs": {
        "coding":                    {"overall": 1, "code_generation": None, "code_review": None, "debugging": None, "refactoring": None, "test_writing": None, "multi_file_projects": None},
        "writing":                   {"overall": 2, "long_form": None, "technical_writing": None, "creative_writing": 3, "editing_proofreading": None, "summarization": None, "multilingual_writing": None},
        "research":                  {"overall": 1, "web_search": None, "deep_analysis": None, "fact_checking": None, "synthesis": None, "academic_sources": None},
        "media_creation":            {"overall": 10, "image_generation": None, "video_generation": None, "audio_generation": 10, "avatar_creation": None, "music_generation": None, "voice_cloning": 10},
        "data_and_analysis":         {"overall": 1, "csv_excel": None, "data_visualization": None, "sql_queries": None, "statistics": None, "python_data_science": None},
        "automation_and_integrations":{"overall": 6, "api_integrations": 8, "workflow_automation": 5, "webhooks": 6, "no_code_automation": 5, "scheduled_tasks": 4},
        "ecosystem_synergy":         {"overall": 6, "native_ecosystem_depth": 6, "cross_platform": 7, "open_source_compat": 5, "third_party_integrations": 7},
        "language_support":          {"overall": 9, "hebrew": 8, "english": 10, "other_languages": 9, "rtl_support": 7, "programming_languages": None},
        "deployment_and_scale":      {"overall": 8, "api_access": 10, "enterprise_features": 8, "self_hosting": 3, "cost_efficiency_at_scale": 6, "rate_limits": 7},
        "education_and_learning":    {"overall": 6, "explanations_clarity": 3, "tutoring": 4, "quiz_generation": 2, "curriculum_design": 3},
        "agent_and_agentic":         {"overall": 5, "tool_use": 5, "multi_step_tasks": 4, "memory": 2, "autonomy": 3, "multi_agent_orchestration": 2},
    },
    "suno": {
        "coding":                    {"overall": 1, "code_generation": None, "code_review": None, "debugging": None, "refactoring": None, "test_writing": None, "multi_file_projects": None},
        "writing":                   {"overall": 5, "long_form": None, "technical_writing": None, "creative_writing": 7, "editing_proofreading": None, "summarization": None, "multilingual_writing": None},
        "research":                  {"overall": 1, "web_search": None, "deep_analysis": None, "fact_checking": None, "synthesis": None, "academic_sources": None},
        "media_creation":            {"overall": 10, "image_generation": None, "video_generation": None, "audio_generation": 9, "avatar_creation": None, "music_generation": 10, "voice_cloning": None},
        "data_and_analysis":         {"overall": 1, "csv_excel": None, "data_visualization": None, "sql_queries": None, "statistics": None, "python_data_science": None},
        "automation_and_integrations":{"overall": 3, "api_integrations": 4, "workflow_automation": 2, "webhooks": 3, "no_code_automation": 3, "scheduled_tasks": 2},
        "ecosystem_synergy":         {"overall": 4, "native_ecosystem_depth": 4, "cross_platform": 5, "open_source_compat": 3, "third_party_integrations": 4},
        "language_support":          {"overall": 7, "hebrew": 5, "english": 9, "other_languages": 7, "rtl_support": 4, "programming_languages": None},
        "deployment_and_scale":      {"overall": 6, "api_access": 6, "enterprise_features": 5, "self_hosting": 1, "cost_efficiency_at_scale": 7, "rate_limits": 6},
        "education_and_learning":    {"overall": 5, "explanations_clarity": 2, "tutoring": 2, "quiz_generation": 1, "curriculum_design": 2},
        "agent_and_agentic":         {"overall": 2, "tool_use": 2, "multi_step_tasks": 2, "memory": 1, "autonomy": 2, "multi_agent_orchestration": 1},
    },
    "midjourney": {
        "coding":                    {"overall": 1, "code_generation": None, "code_review": None, "debugging": None, "refactoring": None, "test_writing": None, "multi_file_projects": None},
        "writing":                   {"overall": 2, "long_form": None, "technical_writing": None, "creative_writing": 3, "editing_proofreading": None, "summarization": None, "multilingual_writing": None},
        "research":                  {"overall": 1, "web_search": None, "deep_analysis": None, "fact_checking": None, "synthesis": None, "academic_sources": None},
        "media_creation":            {"overall": 10, "image_generation": 10, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 1, "csv_excel": None, "data_visualization": None, "sql_queries": None, "statistics": None, "python_data_science": None},
        "automation_and_integrations":{"overall": 4, "api_integrations": 5, "workflow_automation": 3, "webhooks": 4, "no_code_automation": 3, "scheduled_tasks": 2},
        "ecosystem_synergy":         {"overall": 4, "native_ecosystem_depth": 4, "cross_platform": 5, "open_source_compat": 3, "third_party_integrations": 5},
        "language_support":          {"overall": 6, "hebrew": 4, "english": 9, "other_languages": 6, "rtl_support": 3, "programming_languages": None},
        "deployment_and_scale":      {"overall": 6, "api_access": 5, "enterprise_features": 6, "self_hosting": 1, "cost_efficiency_at_scale": 6, "rate_limits": 6},
        "education_and_learning":    {"overall": 4, "explanations_clarity": 2, "tutoring": 2, "quiz_generation": 1, "curriculum_design": 2},
        "agent_and_agentic":         {"overall": 2, "tool_use": 2, "multi_step_tasks": 2, "memory": 1, "autonomy": 2, "multi_agent_orchestration": 1},
    },
    "canva": {
        "coding":                    {"overall": 1, "code_generation": None, "code_review": None, "debugging": None, "refactoring": None, "test_writing": None, "multi_file_projects": None},
        "writing":                   {"overall": 6, "long_form": 3, "technical_writing": 4, "creative_writing": 6, "editing_proofreading": 5, "summarization": 5, "multilingual_writing": 6},
        "research":                  {"overall": 2, "web_search": 2, "deep_analysis": 1, "fact_checking": 1, "synthesis": 2, "academic_sources": 1},
        "media_creation":            {"overall": 9, "image_generation": 7, "video_generation": 7, "audio_generation": 5, "avatar_creation": 4, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 4, "csv_excel": 3, "data_visualization": 7, "sql_queries": None, "statistics": 3, "python_data_science": None},
        "automation_and_integrations":{"overall": 6, "api_integrations": 6, "workflow_automation": 5, "webhooks": 5, "no_code_automation": 6, "scheduled_tasks": 4},
        "ecosystem_synergy":         {"overall": 7, "native_ecosystem_depth": 8, "cross_platform": 8, "open_source_compat": 4, "third_party_integrations": 7},
        "language_support":          {"overall": 9, "hebrew": 9, "english": 10, "other_languages": 9, "rtl_support": 9, "programming_languages": None},
        "deployment_and_scale":      {"overall": 8, "api_access": 7, "enterprise_features": 9, "self_hosting": 1, "cost_efficiency_at_scale": 8, "rate_limits": 8},
        "education_and_learning":    {"overall": 7, "explanations_clarity": 5, "tutoring": 4, "quiz_generation": 5, "curriculum_design": 7},
        "agent_and_agentic":         {"overall": 4, "tool_use": 4, "multi_step_tasks": 4, "memory": 3, "autonomy": 3, "multi_agent_orchestration": 2},
    },
    "google-ai-studio": {
        "coding":                    {"overall": 8, "code_generation": 8, "code_review": 8, "debugging": 7, "refactoring": 7, "test_writing": 7, "multi_file_projects": 7},
        "writing":                   {"overall": 8, "long_form": 8, "technical_writing": 8, "creative_writing": 7, "editing_proofreading": 8, "summarization": 9, "multilingual_writing": 9},
        "research":                  {"overall": 8, "web_search": 7, "deep_analysis": 8, "fact_checking": 7, "synthesis": 8, "academic_sources": 7},
        "media_creation":            {"overall": 6, "image_generation": 7, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 8, "csv_excel": 7, "data_visualization": 7, "sql_queries": 8, "statistics": 8, "python_data_science": 9},
        "automation_and_integrations":{"overall": 7, "api_integrations": 8, "workflow_automation": 6, "webhooks": 6, "no_code_automation": 5, "scheduled_tasks": 5},
        "ecosystem_synergy":         {"overall": 9, "native_ecosystem_depth": 10, "cross_platform": 7, "open_source_compat": 7, "third_party_integrations": 8},
        "language_support":          {"overall": 9, "hebrew": 8, "english": 10, "other_languages": 10, "rtl_support": 8, "programming_languages": 9},
        "deployment_and_scale":      {"overall": 9, "api_access": 10, "enterprise_features": 9, "self_hosting": 1, "cost_efficiency_at_scale": 9, "rate_limits": 8},
        "education_and_learning":    {"overall": 8, "explanations_clarity": 8, "tutoring": 8, "quiz_generation": 8, "curriculum_design": 7},
        "agent_and_agentic":         {"overall": 9, "tool_use": 9, "multi_step_tasks": 9, "memory": 8, "autonomy": 8, "multi_agent_orchestration": 9},
    },
    "base44": {
        "coding":                    {"overall": 7, "code_generation": 8, "code_review": 5, "debugging": 6, "refactoring": 5, "test_writing": 4, "multi_file_projects": 6},
        "writing":                   {"overall": 3, "long_form": 2, "technical_writing": 4, "creative_writing": 2, "editing_proofreading": 3, "summarization": 3, "multilingual_writing": 5},
        "research":                  {"overall": 2, "web_search": 2, "deep_analysis": 2, "fact_checking": 2, "synthesis": 2, "academic_sources": 1},
        "media_creation":            {"overall": 2, "image_generation": 2, "video_generation": None, "audio_generation": None, "avatar_creation": None, "music_generation": None, "voice_cloning": None},
        "data_and_analysis":         {"overall": 5, "csv_excel": 4, "data_visualization": 5, "sql_queries": 5, "statistics": 4, "python_data_science": 4},
        "automation_and_integrations":{"overall": 7, "api_integrations": 7, "workflow_automation": 5, "webhooks": 6, "no_code_automation": 8, "scheduled_tasks": 5},
        "ecosystem_synergy":         {"overall": 6, "native_ecosystem_depth": 7, "cross_platform": 6, "open_source_compat": 5, "third_party_integrations": 6},
        "language_support":          {"overall": 8, "hebrew": 10, "english": 9, "other_languages": 5, "rtl_support": 10, "programming_languages": 7},
        "deployment_and_scale":      {"overall": 7, "api_access": 5, "enterprise_features": 6, "self_hosting": 2, "cost_efficiency_at_scale": 8, "rate_limits": 8},
        "education_and_learning":    {"overall": 5, "explanations_clarity": 5, "tutoring": 4, "quiz_generation": 3, "curriculum_design": 2},
        "agent_and_agentic":         {"overall": 7, "tool_use": 7, "multi_step_tasks": 7, "memory": 5, "autonomy": 6, "multi_agent_orchestration": 4},
    },
}


# ── Main ──────────────────────────────────────────────────────────────────────

def merge_scores(base: dict, override: dict) -> dict:
    """Deep-merge override into base (only fills non-null → leave existing nulls if override is missing)."""
    result = {}
    for category, sub in base.items():
        result[category] = dict(sub)  # copy nulls
        if category in override:
            for field, val in override[category].items():
                if field in result[category]:
                    result[category][field] = val
    return result


def main():
    data = json.loads(TOOLS_FILE.read_text(encoding="utf-8"))
    tools = data["tools"]

    updated = 0
    skipped = 0

    for tool in tools:
        tid = tool["id"]
        base = null_scores()

        if tid in SCORES:
            tool["task_scores"] = merge_scores(base, SCORES[tid])
            updated += 1
        else:
            tool["task_scores"] = base
            skipped += 1

    TOOLS_FILE.write_text(
        json.dumps(data, ensure_ascii=False, indent=2),
        encoding="utf-8"
    )

    print(f"Done -- {updated} tools with verified scores, {skipped} tools set to null")
    print(f"  Total: {updated + skipped} tools updated in {TOOLS_FILE}")


if __name__ == "__main__":
    main()
