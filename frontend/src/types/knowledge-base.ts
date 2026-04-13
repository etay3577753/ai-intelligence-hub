/**
 * knowledge-base.ts  —  v2.0
 * Source-of-truth schema for the AI Intelligence Hub knowledge base.
 *
 * Architecture layers:
 *   Internal KB (this schema)  ← source of truth
 *   DeepResearchRecord[]       ← per-session research snapshots
 *   UpdateRecord[]             ← change log from monitoring
 *   SourceRecord[]             ← monitored blogs/changelogs per tool
 *   ReviewItem[]               ← manual review queue
 *   NotebookLM notebooks       ← deep analysis layer (future)
 *   Wiki markdown files        ← human-readable detail per tool
 *   YouTube research           ← community knowledge layer
 *
 * Research lifecycle:
 *   1. Tool added to inventory  → research_status = "inventory_only"
 *   2. Initial scan done        → research_status = "research_in_progress"
 *   3. Full deep-research done  → research_status = "deep_research_complete"
 *   4. Monitor detects update   → research_status = "update_pending"
 *   5. Auto-flag conflict       → research_status = "needs_review"
 *   6. Tool retired             → research_status = "deprecated"
 *
 * Update workflow (PART 4):
 *   Monitor source → detect change → classify (pricing/feature/model/etc.)
 *   → compare to existing deep research
 *   → decision:
 *       append_update    → add UpdateRecord, keep deep research
 *       update_research  → add UpdateRecord + new DeepResearchRecord
 *       new_tool         → add BackfillItem
 *       manual_review    → add ReviewItem + set status = "needs_review"
 */

// ─── PART 1: Enums / Literals ─────────────────────────────────────────────────

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
  | "included";

export type RecommendationTag =
  | "beginner-friendly"
  | "code-required"
  | "no-code"
  | "visual-first"
  | "privacy-safe"
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
  | "native"
  | "plugin"
  | "mcp"
  | "api"
  | "webhook"
  | "extension"
  | "sdk";

export type RelationType =
  | "related"
  | "parallel"
  | "competing"
  | "parent"
  | "child"
  | "unlocks";

// ─── PART 2: Research status logic ────────────────────────────────────────────

/**
 * ResearchStatus — the lifecycle state of a tool in the knowledge base.
 *
 * inventory_only         → tool added to KB, metadata only, no deep research
 * research_in_progress   → active research session underway (partial data)
 * deep_research_complete → full deep-research session completed ✅
 * update_pending         → monitor detected a change; research may be stale ⚠️
 * needs_review           → auto-flagged conflict or stale confidence 🔴
 * deprecated             → tool no longer active, kept for historical reference
 *
 * Derivation rules (evaluated in order):
 *   1. has open ReviewItem           → needs_review
 *   2. has pending UpdateRecord      → update_pending
 *   3. has ≥1 DeepResearchRecord     → deep_research_complete
 *   4. deep_research_status=partial  → research_in_progress
 *   5. otherwise                     → inventory_only
 */
export type ResearchStatus =
  | "inventory_only"
  | "research_in_progress"
  | "deep_research_complete"
  | "update_pending"
  | "needs_review"
  | "deprecated";

/** Legacy — kept for backward compatibility. Prefer ResearchStatus. */
export type DeepResearchStatus = "none" | "partial" | "complete";
export type BackfillStatus     = "pending" | "added" | "rejected";

// ─── Sub-structures ───────────────────────────────────────────────────────────

export interface ToolRelation {
  tool_id: string;
  type:    RelationType;
  note?:   string;
}

export interface ConnectorRef {
  tool_id:        string;
  connector_type: ConnectorType;
  description:    string;
  url?:           string;
}

export interface SubscriptionTier {
  level:      SubscriptionTierLevel;
  price:      string;
  access_key: AccessKey;
  features:   string[];
  unlocks?:   string[];
  model?:     string;
}

export interface FreshnessInfo {
  last_verified:   string;   // ISO 8601
  confidence:      number;   // 0-100 (set at verification time)
  freshness_score: number;   // derived: confidence × decay
  notes?:          string;
}

export interface NotebookLMRef {
  notebook_url:  string | null;
  notebook_name: string;
  ecosystem:     EcosystemId;
  status:        "not_created" | "created" | "populated" | "synced";
}

// ─── PART 1: Deep Research Record ─────────────────────────────────────────────

/**
 * A snapshot of one complete deep-research session for a tool.
 * Multiple records = re-research over time (version increments).
 * The highest version is the "current" research.
 */
export interface DeepResearchRecord {
  id:             string;         // "dr-001"
  tool_id:        string;
  ecosystem_id:   EcosystemId;
  research_date:  string;         // ISO 8601
  researcher:     "manual" | "youtube_researcher" | "web_scraper" | "notebooklm" | "ai_assisted";
  sources_used:   string[];       // URLs, wiki filenames, YouTube IDs
  summary:        string;         // 1-2 sentence summary of findings
  key_findings:   string[];       // bullet list of important discoveries
  confidence:     number;         // 0-100 — researcher's confidence level
  notebooklm_url?: string;        // if uploaded to NotebookLM notebook
  version:        number;         // 1, 2, 3… — increments with each re-research
  superseded_by?: string;         // id of newer DeepResearchRecord if outdated
}

// ─── PART 1: Update Record ────────────────────────────────────────────────────

/**
 * A change detected by monitoring (blog, release notes, YouTube, manual).
 * Created automatically by future monitoring scripts or manually.
 *
 * PART 4 — Update workflow decision:
 *   after classification → decide action:
 *   "append_update"    → status=applied, no new DeepResearchRecord needed
 *   "update_research"  → status=applied + create new DeepResearchRecord
 *   "new_tool"         → status=dismissed + create BackfillItem
 *   "manual_review"    → status=pending_review + create ReviewItem
 */
export type UpdateClassification =
  | "pricing_change"
  | "new_feature"
  | "model_update"
  | "api_change"
  | "deprecation"
  | "new_tool"
  | "security_update"
  | "acquisition"
  | "rebranding"
  | "other";

export type UpdateAction =
  | "append_update"     // minor — add record, keep deep research valid
  | "update_research"   // significant — requires new DeepResearchRecord
  | "new_tool"          // creates a BackfillItem
  | "manual_review";    // ambiguous — route to human review

export interface UpdateRecord {
  id:                    string;    // "upd-001"
  tool_id:               string;
  detected_at:           string;    // ISO 8601
  source_url:            string;
  source_type:           "blog" | "release_notes" | "youtube" | "manual" | "news" | "github" | "rss";
  title:                 string;    // headline of the update
  summary:               string;    // brief description
  classification:        UpdateClassification;
  recommended_action:    UpdateAction;
  status:                "pending_review" | "applied" | "dismissed";
  affects_deep_research: boolean;   // true = current deep research may be wrong
  applied_at?:           string;
  applied_by?:           string;    // "manual" | "auto"
  resolution_notes?:     string;
}

// ─── PART 1: Source Record ─────────────────────────────────────────────────────

/**
 * A monitored source for a tool — blog, RSS, YouTube channel, GitHub releases.
 * Future monitoring scripts will check these and create UpdateRecords automatically.
 *
 * PART 4 — source lifecycle:
 *   1. Add SourceRecord for a tool
 *   2. Monitoring script reads source on schedule
 *   3. Detects change → creates UpdateRecord (status=pending_review)
 *   4. Classification engine suggests action
 *   5. Human (or auto) applies or dismisses
 */
export interface SourceRecord {
  id:                 string;   // "src-001"
  tool_id:            string;
  source_type:        "rss" | "web_page" | "youtube_channel" | "github_releases" | "twitter" | "manual";
  url:                string;
  label:              string;   // "Anthropic Blog", "Cursor Changelog"
  last_checked:       string;   // ISO 8601
  check_frequency:    "daily" | "weekly" | "monthly";
  is_active:          boolean;
  last_found_update?: string;   // date of last successful detection
  total_updates_found: number;  // running counter
}

// ─── PART 1: Review Item ──────────────────────────────────────────────────────

/**
 * An item flagged for manual review by the system manager.
 * Created when:
 *   - UpdateRecord classification is ambiguous
 *   - Tool freshness_score drops below threshold (< 40)
 *   - DeepResearchRecord confidence < 50
 *   - BackfillItem has been pending > 30 days
 */
export interface ReviewItem {
  id:               string;   // "rev-001"
  tool_id:          string;
  flagged_at:       string;   // ISO 8601
  reason:           string;   // human-readable reason for review
  severity:         "low" | "medium" | "high";
  category:         "stale_research" | "conflicting_update" | "low_confidence" | "pending_backfill" | "manual_flag";
  status:           "open" | "resolved" | "dismissed";
  resolved_at?:     string;
  resolution_notes?: string;
  linked_update_id?: string;   // UpdateRecord that triggered this review
}

// ─── Core: ToolRecord ─────────────────────────────────────────────────────────

export interface ToolRecord {
  id:          string;
  name:        string;
  vendor:      string;
  category:    ToolCategory;
  ecosystem:   EcosystemId;
  description: string;

  surfaces:            Surface[];
  relations:           ToolRelation[];
  connectors:          ConnectorRef[];
  subscription_tiers:  SubscriptionTier[];
  primary_access_key:  AccessKey;
  tags:                RecommendationTag[];
  use_cases:           string[];

  // Knowledge layer
  wiki_file:             string | null;
  notebooklm_ref:        NotebookLMRef | null;
  youtube_video_ids:     string[];

  // ── Research tracking (v2) ──────────────────────────────────────────────────
  /** Current lifecycle state — see ResearchStatus docs above */
  research_status:     ResearchStatus;
  /** Date of the most recent completed DeepResearchRecord (null if none) */
  last_research_date:  string | null;
  /** True if there are pending UpdateRecords not yet applied */
  has_pending_updates: boolean;
  /** IDs of all DeepResearchRecord entries for this tool */
  research_record_ids: string[];

  // ── Legacy (kept for backward compat) ──────────────────────────────────────
  deep_research_status: DeepResearchStatus;

  freshness: FreshnessInfo;
}

// ─── Core: EcosystemBranch ────────────────────────────────────────────────────

export interface EcosystemBranch {
  id:          EcosystemId;
  name:        string;
  description: string;
  color:       string;
  vendor?:     string;
  tool_ids:    string[];
  sub_branches?: { id: string; name: string; tool_ids: string[] }[];
}

// ─── Core: BackfillItem ───────────────────────────────────────────────────────

export interface BackfillItem {
  id:                  string;
  discovered_during:   string;
  discovery_source:    "wiki" | "youtube" | "notebooklm" | "manual" | "monitor";
  tool_name:           string;
  suggested_ecosystem: EcosystemId;
  suggested_category:  ToolCategory;
  suggested_relations: Omit<ToolRelation, "tool_id">[];
  url?:                string;
  notes:               string;
  discovered_at:       string;
  status:              BackfillStatus;
  resolved_tool_id?:   string;
}

// ─── Root: EcosystemInventory ─────────────────────────────────────────────────

export interface EcosystemInventory {
  version:      string;
  last_updated: string;
  description:  string;

  ecosystems:   EcosystemBranch[];
  tools:        ToolRecord[];

  // Research management layer (v2)
  deep_research_records: DeepResearchRecord[];
  update_records:        UpdateRecord[];
  source_records:        SourceRecord[];
  review_queue:          ReviewItem[];
  backfill_queue:        BackfillItem[];

  stats: {
    total_tools:             number;
    total_ecosystems:        number;
    tools_with_wiki:         number;
    tools_researched:        number;      // research_status = deep_research_complete
    tools_update_pending:    number;      // research_status = update_pending
    tools_needs_review:      number;      // research_status = needs_review
    tools_inventory_only:    number;      // research_status = inventory_only
    pending_backfill:        number;
    open_review_items:       number;
    active_sources:          number;      // is_active SourceRecords
    last_wiki_sync:          string;
    last_updated:            string;
  };
}

// ─── Helper: Research status display config ───────────────────────────────────

export const RESEARCH_STATUS_CONFIG: Record<ResearchStatus, {
  label:    string;
  color:    string;           // tailwind text color
  bg:       string;           // tailwind bg color
  border:   string;           // tailwind border color
  icon:     string;
  priority: number;           // for sorting (higher = more urgent)
}> = {
  needs_review:           { label: "דורש בדיקה",      color: "text-red-300",    bg: "bg-red-950/40",     border: "border-red-700/50",    icon: "🔴", priority: 5 },
  update_pending:         { label: "עדכון ממתין",     color: "text-amber-300",  bg: "bg-amber-950/40",   border: "border-amber-700/50",  icon: "⚠️", priority: 4 },
  research_in_progress:   { label: "מחקר בתהליך",    color: "text-blue-300",   bg: "bg-blue-950/40",    border: "border-blue-700/50",   icon: "🔬", priority: 3 },
  deep_research_complete: { label: "מחקר עמוק ✅",    color: "text-green-300",  bg: "bg-green-950/40",   border: "border-green-700/50",  icon: "✅", priority: 2 },
  inventory_only:         { label: "מלאי בלבד",       color: "text-gray-400",   bg: "bg-gray-800/40",    border: "border-gray-700/50",   icon: "📦", priority: 1 },
  deprecated:             { label: "מיושן",           color: "text-gray-600",   bg: "bg-gray-900/40",    border: "border-gray-800/50",   icon: "⚰️", priority: 0 },
};

// ─── Helper types for API / frontend consumption ───────────────────────────────

export interface ToolSummary {
  id:              string;
  name:            string;
  ecosystem:       EcosystemId;
  category:        ToolCategory;
  tags:            RecommendationTag[];
  freshness_score: number;
  research_status: ResearchStatus;
  last_research_date: string | null;
  has_pending_updates: boolean;
}

// ─── PART 2: Research status derivation ───────────────────────────────────────

/**
 * Derive the current ResearchStatus for a tool given its related records.
 * Call this to recompute status dynamically instead of trusting the stored value.
 */
export function deriveResearchStatus(
  tool: Pick<ToolRecord, "deep_research_status" | "research_record_ids" | "freshness">,
  options: {
    hasOpenReview:   boolean;
    hasPendingUpdate: boolean;
  }
): ResearchStatus {
  if (options.hasOpenReview)           return "needs_review";
  if (options.hasPendingUpdate)        return "update_pending";
  if (tool.research_record_ids.length > 0) return "deep_research_complete";
  if (tool.deep_research_status === "partial") return "research_in_progress";
  return "inventory_only";
}

// ─── Freshness decay formula ──────────────────────────────────────────────────

export function calcFreshnessScore(confidence: number, lastVerified: string): number {
  const days = Math.floor((Date.now() - new Date(lastVerified).getTime()) / 86_400_000);
  const decay = days <= 30 ? 1.0
    : days <= 90  ? 0.85
    : days <= 180 ? 0.65
    : days <= 365 ? 0.40
    : 0.20;
  return Math.round(confidence * decay);
}

// ─── PART 4: Update workflow classification ───────────────────────────────────

/**
 * Rules for auto-classifying an UpdateRecord and deciding action.
 * Used by future monitoring scripts.
 *
 * Priority order:
 *   1. Contains "deprecated" / "sunset" / "shutting down"  → deprecation   → manual_review
 *   2. Contains "acqui" / "merge" / "acquired by"          → acquisition   → manual_review
 *   3. Contains new model name / "model" + version number  → model_update  → update_research
 *   4. Contains "price" / "pricing" / "$" change           → pricing_change → append_update
 *   5. Contains "new feature" / "introducing" / "launch"   → new_feature   → append_update
 *   6. Contains "api" + "breaking" / "v2" / "migration"    → api_change    → update_research
 *   7. Unknown tool name mentioned prominently              → new_tool      → new_tool (BackfillItem)
 *   8. Default                                              → other         → manual_review
 */
export const UPDATE_CLASSIFICATION_RULES: Array<{
  keywords:    string[];
  classification: UpdateClassification;
  action:         UpdateAction;
}> = [
  { keywords: ["deprecated", "sunset", "shutting down", "end of life"],  classification: "deprecation",    action: "manual_review"    },
  { keywords: ["acquired", "acquisition", "merge", "merger"],            classification: "acquisition",    action: "manual_review"    },
  { keywords: ["model", "claude", "gpt", "gemini", "sonnet", "opus"],   classification: "model_update",   action: "update_research"  },
  { keywords: ["breaking", "migration guide", "api v2", "v3"],          classification: "api_change",     action: "update_research"  },
  { keywords: ["price", "pricing", "cost", "plan change", "$"],         classification: "pricing_change", action: "append_update"    },
  { keywords: ["new feature", "introducing", "launch", "announcing"],   classification: "new_feature",    action: "append_update"    },
  { keywords: ["security", "vulnerability", "patch", "cve"],            classification: "security_update", action: "manual_review"   },
];
