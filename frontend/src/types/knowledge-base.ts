/**
 * knowledge-base.ts
 * Source-of-truth schema for the AI Intelligence Hub knowledge base.
 *
 * Architecture:
 *   Internal KB (this schema) ← source of truth
 *   NotebookLM notebooks      ← deep research / analysis layer per ecosystem
 *   Wiki markdown files       ← human-readable detail per tool
 *   YouTube research          ← community knowledge layer
 *
 * Workflow:
 *   1. Ecosystem master inventory holds all known tools + their relationships
 *   2. Deep research on a tool may discover NEW tools/connectors not yet in inventory
 *   3. Discovered items go into backfill_queue for review + insertion
 *   4. NotebookLM notebook links stored per tool (future integration)
 */

// ─── Enums / Literals ────────────────────────────────────────────────────────

export type EcosystemId =
  | "anthropic"
  | "google"
  | "openai"
  | "microsoft"
  | "local"
  | "web-builders"
  | "ide-code"
  | "automation"
  | "research-writing"
  | "creative"
  | "israeli"
  | "data-analysis"
  | "other";

export type ToolCategory =
  | "chat_assistant"
  | "code_assistant"
  | "ide"
  | "web_builder"
  | "automation"
  | "agent_framework"
  | "image_generation"
  | "video_generation"
  | "voice_generation"
  | "music_generation"
  | "research"
  | "writing"
  | "data_analysis"
  | "local_model"
  | "browser_agent"
  | "protocol"
  | "platform"
  | "company";

export type Surface =
  | "web"
  | "desktop_app"
  | "mobile"
  | "api"
  | "cli"
  | "ide_plugin"
  | "browser_extension"
  | "mcp_server"
  | "local_server";

export type AccessKey =
  | "web_sub"
  | "api_key"
  | "local_runtime"
  | "org_access"
  | "student_access"
  | "free";

export type SubscriptionTierLevel =
  | "free"
  | "pro"
  | "team"
  | "enterprise"
  | "api_payg"
  | "student"
  | "included";   // included in another subscription (e.g. DALL-E via ChatGPT Plus)

export type RecommendationTag =
  | "beginner-friendly"
  | "code-required"
  | "no-code"
  | "visual-first"
  | "privacy-safe"           // local / no data sent
  | "hebrew-support"
  | "israeli-product"
  | "fast-iteration"
  | "production-ready"
  | "experimental"
  | "terminal-required"
  | "gpu-recommended"
  | "free-tier-strong"
  | "api-heavy"
  | "team-collaboration";

export type ConnectorType =
  | "native"          // built-in integration
  | "plugin"          // marketplace plugin
  | "mcp"             // Model Context Protocol
  | "api"             // REST/GraphQL API
  | "webhook"
  | "extension"       // browser extension
  | "sdk";

export type RelationType =
  | "related"         // works well together
  | "parallel"        // similar tool, same job, different approach
  | "competing"       // direct competitor
  | "parent"          // this tool contains/owns the other
  | "child"           // this tool is part of the other
  | "unlocks";        // having subscription A unlocks tool B

export type DeepResearchStatus = "none" | "partial" | "complete";
export type BackfillStatus     = "pending" | "added" | "rejected";

// ─── Sub-structures ───────────────────────────────────────────────────────────

export interface ToolRelation {
  tool_id:   string;
  type:      RelationType;
  note?:     string;       // why they're related / how they interact
}

export interface ConnectorRef {
  tool_id:        string;       // target tool/service being connected to
  connector_type: ConnectorType;
  description:    string;
  url?:           string;       // connector marketplace or docs link
}

export interface SubscriptionTier {
  level:       SubscriptionTierLevel;
  price:       string;           // "$20/month" | "free" | "~$0.003/1K tokens"
  access_key:  AccessKey;        // maps to AccessMap field
  features:    string[];
  unlocks?:    string[];         // tool_ids or feature names this tier unlocks
  model?:      string;           // specific model for this tier, if applicable
}

export interface FreshnessInfo {
  last_verified: string;         // ISO 8601 date
  confidence:    number;         // 0-100 (set at verification time)
  freshness_score: number;       // derived: confidence * decay — recalculated at read time
  notes?:        string;         // "pricing changed in Q1 2025"
}

export interface NotebookLMRef {
  notebook_url:  string | null;  // null until notebook created
  notebook_name: string;
  ecosystem:     EcosystemId;
  status:        "not_created" | "created" | "populated" | "synced";
}

// ─── Core: ToolRecord ─────────────────────────────────────────────────────────

export interface ToolRecord {
  id:          string;            // kebab-case, matches wiki filename without .md
  name:        string;            // display name
  vendor:      string;            // company / org
  category:    ToolCategory;
  ecosystem:   EcosystemId;
  description: string;            // 1-2 sentences

  // Surfaces where tool exists
  surfaces: Surface[];

  // Tool relationships
  relations: ToolRelation[];

  // External integrations
  connectors: ConnectorRef[];

  // Pricing / access
  subscription_tiers: SubscriptionTier[];
  primary_access_key: AccessKey;   // the most common way users access this tool

  // Recommendation engine
  tags:       RecommendationTag[];
  use_cases:  string[];            // short phrases: "בניית אתר", "כתיבת קוד", "אוטומציה"

  // Knowledge layer links
  wiki_file:            string | null;   // relative path from /backend/data/wiki/
  notebooklm_ref:       NotebookLMRef | null;
  deep_research_status: DeepResearchStatus;
  youtube_video_ids:    string[];        // IDs of relevant YouTube shorts in wiki/youtube/

  // Freshness
  freshness: FreshnessInfo;
}

// ─── Core: EcosystemBranch ────────────────────────────────────────────────────

export interface EcosystemBranch {
  id:          EcosystemId;
  name:        string;
  description: string;
  color:       string;           // tailwind color class for UI
  vendor?:     string;           // "Anthropic" | "Google" etc. — null for cross-vendor ecosystems
  tool_ids:    string[];         // ordered list of tool IDs in this ecosystem
  sub_branches?: {
    id:       string;
    name:     string;
    tool_ids: string[];
  }[];
}

// ─── Core: BackfillItem ───────────────────────────────────────────────────────

export interface BackfillItem {
  id:                   string;           // uuid or slug
  discovered_during:    string;           // tool_id of research that found this
  discovery_source:     "wiki" | "youtube" | "notebooklm" | "manual";
  tool_name:            string;
  suggested_ecosystem:  EcosystemId;
  suggested_category:   ToolCategory;
  suggested_relations:  Omit<ToolRelation, "tool_id">[];  // relations to discovered_during tool
  url?:                 string;
  notes:                string;
  discovered_at:        string;           // ISO date
  status:               BackfillStatus;
  resolved_tool_id?:    string;           // set when status = "added"
}

// ─── Root: EcosystemInventory ─────────────────────────────────────────────────

export interface EcosystemInventory {
  version:      string;
  last_updated: string;
  description:  string;
  ecosystems:   EcosystemBranch[];
  tools:        ToolRecord[];            // flat list — indexed by id
  backfill_queue: BackfillItem[];
  stats: {
    total_tools:          number;
    tools_with_wiki:      number;
    tools_with_research:  number;
    pending_backfill:     number;
    last_wiki_sync:       string;
  };
}

// ─── Helper types for API / frontend consumption ───────────────────────────────

/** Lightweight tool card for list views */
export interface ToolSummary {
  id:         string;
  name:       string;
  ecosystem:  EcosystemId;
  category:   ToolCategory;
  tags:       RecommendationTag[];
  freshness_score: number;
  has_wiki:   boolean;
  has_research: boolean;
}

/** Full tool detail for detail view / recommendation engine */
export type ToolDetail = ToolRecord & {
  ecosystem_info: EcosystemBranch;
  related_summaries: ToolSummary[];
};

// ─── Freshness decay formula ──────────────────────────────────────────────────
/**
 * freshness_score = confidence * decay_multiplier
 * decay_multiplier:
 *   0-30 days  → 1.0   (fresh)
 *   31-90 days → 0.85  (aging)
 *   91-180d    → 0.65  (stale)
 *   181-365d   → 0.4   (old)
 *   365+d      → 0.2   (very old)
 */
export function calcFreshnessScore(confidence: number, lastVerified: string): number {
  const days = Math.floor((Date.now() - new Date(lastVerified).getTime()) / 86_400_000);
  const decay = days <= 30 ? 1.0
    : days <= 90  ? 0.85
    : days <= 180 ? 0.65
    : days <= 365 ? 0.40
    : 0.20;
  return Math.round(confidence * decay);
}
