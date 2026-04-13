"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

type ResearchStatus =
  | "inventory_only" | "research_in_progress" | "deep_research_complete"
  | "update_pending" | "needs_review" | "deprecated";

interface FreshnessInfo  { last_verified: string; confidence: number; freshness_score: number; notes?: string }
interface ToolRelation   { tool_id: string; type: string; note?: string }
interface SubscriptionTier { level: string; price: string; access_key: string; features: string[] }

interface ToolRecord {
  id: string; name: string; vendor: string; category: string; ecosystem: string;
  description: string; surfaces: string[]; relations: ToolRelation[];
  subscription_tiers: SubscriptionTier[]; primary_access_key: string;
  tags: string[]; use_cases: string[]; wiki_file?: string | null;
  research_status: ResearchStatus; last_research_date: string | null;
  has_pending_updates: boolean; research_record_ids: string[];
  deep_research_status: string; freshness: FreshnessInfo;
}

interface EcosystemBranch {
  id: string; name: string; description: string; color: string;
  vendor?: string; tool_ids: string[];
}

interface DeepResearchRecord {
  id: string; tool_id: string; ecosystem_id: string; research_date: string;
  researcher: string; sources_used: string[]; summary: string;
  key_findings: string[]; confidence: number; notebooklm_url?: string | null;
  version: number;
}

interface UpdateRecord {
  id: string; tool_id: string; detected_at: string; source_url: string;
  source_type: string; title: string; summary: string; classification: string;
  recommended_action: string; status: string; affects_deep_research: boolean;
  applied_at?: string; applied_by?: string; resolution_notes?: string;
}

interface SourceRecord {
  id: string; tool_id: string; source_type: string; url: string; label: string;
  last_checked: string; check_frequency: string; is_active: boolean;
  last_found_update?: string; total_updates_found: number;
}

interface ReviewItem {
  id: string; tool_id: string; flagged_at: string; reason: string;
  severity: "low" | "medium" | "high"; category: string;
  status: "open" | "resolved" | "dismissed";
  resolved_at?: string; resolution_notes?: string; linked_update_id?: string;
}

interface BackfillItem {
  id: string; tool_name: string; suggested_ecosystem: string;
  suggested_category: string; status: string; discovery_source: string;
  discovered_during: string; notes: string; discovered_at: string;
}

interface KBStats {
  total_tools: number; total_ecosystems: number; tools_with_wiki: number;
  tools_researched: number; tools_update_pending: number; tools_needs_review: number;
  tools_inventory_only: number; pending_backfill: number; open_review_items: number;
  active_sources: number; last_wiki_sync: string; last_updated: string;
}

interface KBInventory {
  version: string; last_updated: string; description: string;
  ecosystems: EcosystemBranch[]; tools: ToolRecord[];
  deep_research_records: DeepResearchRecord[]; update_records: UpdateRecord[];
  source_records: SourceRecord[]; review_queue: ReviewItem[];
  backfill_queue: BackfillItem[]; stats: KBStats;
}

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ResearchStatus, { label: string; icon: string; color: string; bg: string; border: string; priority: number }> = {
  needs_review:           { label: "דורש בדיקה",    icon: "🔴", color: "text-red-300",    bg: "bg-red-950/50",    border: "border-red-700/60",    priority: 5 },
  update_pending:         { label: "עדכון ממתין",   icon: "⚠️", color: "text-amber-300",  bg: "bg-amber-950/50",  border: "border-amber-700/60",  priority: 4 },
  research_in_progress:   { label: "בתהליך מחקר",  icon: "🔬", color: "text-blue-300",   bg: "bg-blue-950/50",   border: "border-blue-700/60",   priority: 3 },
  deep_research_complete: { label: "מחקר עמוק",     icon: "✅", color: "text-green-300",  bg: "bg-green-950/50",  border: "border-green-700/60",  priority: 2 },
  inventory_only:         { label: "מלאי בלבד",     icon: "📦", color: "text-gray-400",   bg: "bg-gray-800/50",   border: "border-gray-700/60",   priority: 1 },
  deprecated:             { label: "מיושן",         icon: "⚰️", color: "text-gray-600",   bg: "bg-gray-900/50",   border: "border-gray-800/60",   priority: 0 },
};

const CLASSIFICATION_COLORS: Record<string, string> = {
  pricing_change:  "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  new_feature:     "bg-blue-900/50 text-blue-300 border-blue-700",
  model_update:    "bg-purple-900/50 text-purple-300 border-purple-700",
  api_change:      "bg-orange-900/50 text-orange-300 border-orange-700",
  deprecation:     "bg-red-900/50 text-red-300 border-red-700",
  new_tool:        "bg-cyan-900/50 text-cyan-300 border-cyan-700",
  security_update: "bg-red-900/70 text-red-200 border-red-600",
  acquisition:     "bg-pink-900/50 text-pink-300 border-pink-700",
  other:           "bg-gray-800/50 text-gray-400 border-gray-600",
};

const SEVERITY_COLORS: Record<string, string> = {
  low:    "text-yellow-400 bg-yellow-950/40 border-yellow-700/50",
  medium: "text-orange-400 bg-orange-950/40 border-orange-700/50",
  high:   "text-red-400 bg-red-950/40 border-red-700/50",
};

const CATEGORY_ICONS: Record<string, string> = {
  chat_assistant: "🤖", code_assistant: "💻", ide: "🖥️", web_builder: "🌐",
  automation: "⚙️", agent_framework: "🤝", image_generation: "🖼️",
  video_generation: "🎬", voice_generation: "🎙️", music_generation: "🎵",
  research: "🔬", writing: "✍️", data_analysis: "📊", local_model: "🏠",
  browser_agent: "🌍", protocol: "🔗", platform: "🏗️", company: "🏢",
};

const TAG_COLORS: Record<string, string> = {
  "beginner-friendly": "bg-green-900/50 text-green-300 border-green-700",
  "code-required":     "bg-purple-900/50 text-purple-300 border-purple-700",
  "no-code":           "bg-cyan-900/50 text-cyan-300 border-cyan-700",
  "privacy-safe":      "bg-emerald-900/50 text-emerald-300 border-emerald-700",
  "hebrew-support":    "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  "israeli-product":   "bg-amber-900/50 text-amber-300 border-amber-700",
  "free-tier-strong":  "bg-teal-900/50 text-teal-300 border-teal-700",
  "production-ready":  "bg-indigo-900/50 text-indigo-300 border-indigo-700",
  "experimental":      "bg-red-900/50 text-red-300 border-red-700",
  "terminal-required": "bg-gray-800/70 text-gray-400 border-gray-600",
};

// ─── Reusable atoms ───────────────────────────────────────────────────────────

function StatusBadge({ status, small }: { status: ResearchStatus; small?: boolean }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.inventory_only;
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full px-2 py-0.5 ${cfg.bg} ${cfg.border} ${cfg.color} ${small ? "text-xs" : "text-xs"}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

function FreshnessBar({ score }: { score: number }) {
  const pct   = Math.min(100, Math.max(0, Math.round(score)));
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-8 text-left">{pct}%</span>
    </div>
  );
}

// ─── TAB 1: Overview ──────────────────────────────────────────────────────────

function OverviewTab({ inv, toolById }: { inv: KBInventory; toolById: Map<string, ToolRecord> }) {
  const s = inv.stats;

  // Ecosystem research progress
  const ecoProgress = inv.ecosystems.map(eco => {
    const tools = eco.tool_ids.map(id => toolById.get(id)).filter(Boolean) as ToolRecord[];
    const researched = tools.filter(t => t.research_status === "deep_research_complete").length;
    const pending    = tools.filter(t => t.research_status === "update_pending" || t.research_status === "needs_review").length;
    const pct        = tools.length ? Math.round((researched / tools.length) * 100) : 0;
    return { eco, tools: tools.length, researched, pending, pct };
  });

  const recentUpdates = [...inv.update_records]
    .sort((a, b) => b.detected_at.localeCompare(a.detected_at))
    .slice(0, 5);

  const recentResearch = [...inv.deep_research_records]
    .sort((a, b) => b.research_date.localeCompare(a.research_date))
    .slice(0, 4);

  return (
    <div className="space-y-8">
      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "סה״כ כלים",       value: s.total_tools,           color: "text-blue-400",   icon: "🗂️" },
          { label: "נחקרו לעומק",      value: s.tools_researched,      color: "text-green-400",  icon: "✅" },
          { label: "עדכון ממתין",      value: (s.tools_update_pending ?? 0) + (s.tools_needs_review ?? 0), color: "text-amber-400", icon: "⚠️" },
          { label: "מלאי בלבד",        value: s.tools_inventory_only ?? (s.total_tools - s.tools_researched), color: "text-gray-400", icon: "📦" },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{stat.icon}</div>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Secondary stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "פריטים לבדיקה",  value: s.open_review_items,   color: "text-red-400",    icon: "🔴" },
          { label: "מקורות פעילים",  value: s.active_sources,      color: "text-cyan-400",   icon: "📡" },
          { label: "ממתינים ל-Backfill", value: s.pending_backfill, color: "text-orange-400", icon: "📥" },
        ].map(stat => (
          <div key={stat.label} className="bg-gray-900/40 border border-gray-800 rounded-lg p-3 flex items-center gap-3">
            <span className="text-xl">{stat.icon}</span>
            <div>
              <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ecosystem research progress */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
            <span>📊</span> התקדמות מחקר לפי אקוסיסטם
          </h2>
          <div className="space-y-3">
            {ecoProgress.map(({ eco, tools, researched, pending, pct }) => (
              <div key={eco.id}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-gray-300 truncate">{eco.name.replace(" Ecosystem","").replace(" AI","")}</span>
                  <div className="flex items-center gap-2 text-xs text-gray-500 shrink-0">
                    {pending > 0 && <span className="text-amber-400">⚠️ {pending}</span>}
                    <span>{researched}/{tools}</span>
                  </div>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${pct === 100 ? "bg-green-500" : pct > 50 ? "bg-blue-500" : pct > 0 ? "bg-blue-700" : "bg-gray-700"}`}
                    style={{ width: `${Math.max(pct, pct > 0 ? 3 : 0)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent activity */}
        <div className="space-y-4">
          {/* Recent deep research */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <span>🔬</span> מחקר עמוק אחרון
            </h2>
            <div className="space-y-2">
              {recentResearch.map(dr => {
                const tool = toolById.get(dr.tool_id);
                return (
                  <div key={dr.id} className="flex items-center justify-between py-1 border-b border-gray-800/60 last:border-0">
                    <div>
                      <p className="text-sm text-white">{tool?.name ?? dr.tool_id}</p>
                      <p className="text-xs text-gray-500">אמון: {dr.confidence}% · v{dr.version}</p>
                    </div>
                    <span className="text-xs text-gray-500">{dr.research_date}</span>
                  </div>
                );
              })}
              {recentResearch.length === 0 && (
                <p className="text-xs text-gray-600">אין רשומות מחקר עמוק עדיין</p>
              )}
            </div>
          </div>

          {/* Recent updates */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
              <span>📡</span> עדכונים שזוהו לאחרונה
            </h2>
            <div className="space-y-2">
              {recentUpdates.map(upd => {
                const tool = toolById.get(upd.tool_id);
                const cls  = CLASSIFICATION_COLORS[upd.classification] ?? CLASSIFICATION_COLORS.other;
                return (
                  <div key={upd.id} className="flex items-start gap-2 py-1 border-b border-gray-800/60 last:border-0">
                    <span className={`text-xs border rounded px-1.5 py-0.5 shrink-0 mt-0.5 ${cls}`}>
                      {upd.classification.replace(/_/g," ")}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300 truncate">{tool?.name ?? upd.tool_id}</p>
                      <p className="text-xs text-gray-500 truncate">{upd.title}</p>
                    </div>
                    <span className={`text-xs shrink-0 ${upd.status === "pending_review" ? "text-amber-400" : "text-gray-500"}`}>
                      {upd.status === "pending_review" ? "⏳" : "✅"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Missing deep research — what needs work */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
          <span>📋</span> חסר מחקר עמוק ({inv.tools.filter(t => t.research_status === "inventory_only").length} כלים)
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {inv.tools
            .filter(t => t.research_status === "inventory_only")
            .sort((a, b) => (b.freshness?.freshness_score ?? 0) - (a.freshness?.freshness_score ?? 0))
            .slice(0, 12)
            .map(tool => (
              <div key={tool.id} className="flex items-center gap-2 bg-gray-800/40 rounded-lg px-3 py-2 text-xs">
                <span>{CATEGORY_ICONS[tool.category] ?? "🔧"}</span>
                <span className="text-gray-300 truncate">{tool.name}</span>
              </div>
            ))}
          {inv.tools.filter(t => t.research_status === "inventory_only").length > 12 && (
            <div className="flex items-center justify-center bg-gray-800/20 rounded-lg px-3 py-2 text-xs text-gray-600">
              +{inv.tools.filter(t => t.research_status === "inventory_only").length - 12} נוספים
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── TAB 2: Ecosystem browser ─────────────────────────────────────────────────

function EcosystemTab({ inv, toolById }: { inv: KBInventory; toolById: Map<string, ToolRecord> }) {
  const [selectedEco, setSelectedEco]     = useState<string | null>(null);
  const [selectedTool, setSelectedTool]   = useState<ToolRecord | null>(null);
  const [searchQuery,  setSearchQuery]    = useState("");
  const [filterStatus, setFilterStatus]  = useState<ResearchStatus | "">("");

  const filteredTools = useMemo(() => {
    let tools = inv.tools;
    if (selectedEco) {
      const eco = inv.ecosystems.find(e => e.id === selectedEco);
      if (eco) tools = tools.filter(t => eco.tool_ids.includes(t.id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tools = tools.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.vendor.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q))
      );
    }
    if (filterStatus) tools = tools.filter(t => t.research_status === filterStatus);
    return tools;
  }, [inv, selectedEco, searchQuery, filterStatus]);

  return (
    <div className="flex gap-5">
      {/* Ecosystem sidebar */}
      <aside className="w-52 shrink-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">אקוסיסטמים</p>
        <div className="space-y-0.5">
          <button
            onClick={() => setSelectedEco(null)}
            className={`w-full text-right text-sm px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
              !selectedEco ? "bg-blue-600/20 border border-blue-500/40 text-blue-300" : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-300"
            }`}
          >
            <span>כולם</span>
            <span className="text-xs bg-gray-800 rounded-full px-2 py-0.5">{inv.tools.length}</span>
          </button>
          {inv.ecosystems.map(eco => {
            const tools   = eco.tool_ids.map(id => toolById.get(id)).filter(Boolean) as ToolRecord[];
            const needsAtt = tools.filter(t => t.research_status === "needs_review" || t.research_status === "update_pending").length;
            return (
              <button
                key={eco.id}
                onClick={() => setSelectedEco(eco.id === selectedEco ? null : eco.id)}
                className={`w-full text-right text-sm px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  selectedEco === eco.id ? "bg-blue-600/20 border border-blue-500/40 text-blue-300" : "text-gray-400 hover:bg-gray-800/60"
                }`}
              >
                <span className="truncate">{eco.name.replace(" Ecosystem","").replace(" AI","")}</span>
                <div className="flex items-center gap-1 shrink-0">
                  {needsAtt > 0 && <span className="text-xs text-amber-400">⚠️</span>}
                  <span className="text-xs bg-gray-800 rounded-full px-2 py-0.5">{eco.tool_ids.length}</span>
                </div>
              </button>
            );
          })}
        </div>
      </aside>

      {/* Tools area */}
      <div className="flex-1 min-w-0">
        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <input
            type="text"
            placeholder="חיפוש..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value as ResearchStatus | "")}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">כל הסטטוסים</option>
            {Object.entries(STATUS_CFG).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
        </div>

        <p className="text-xs text-gray-500 mb-3">{filteredTools.length} כלים</p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredTools.map(tool => (
            <button
              key={tool.id}
              onClick={() => setSelectedTool(tool)}
              className="text-left w-full bg-gray-900/60 border border-gray-700/50 rounded-xl p-4 hover:border-blue-500/50 hover:bg-gray-800/60 transition-all group"
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-white text-sm truncate group-hover:text-blue-300 transition-colors">
                    {CATEGORY_ICONS[tool.category] ?? "🔧"} {tool.name}
                  </h3>
                  <p className="text-xs text-gray-500 truncate">{tool.vendor}</p>
                </div>
                <StatusBadge status={tool.research_status} small />
              </div>
              <p className="text-xs text-gray-400 line-clamp-2 mb-2">{tool.description}</p>
              <div className="flex flex-wrap gap-1 mb-2">
                {tool.tags.slice(0, 2).map(tag => (
                  <span key={tag} className={`text-xs border rounded px-1.5 py-0.5 ${TAG_COLORS[tag] ?? "bg-gray-800 text-gray-400 border-gray-600"}`}>{tag}</span>
                ))}
              </div>
              <FreshnessBar score={tool.freshness?.freshness_score ?? tool.freshness?.confidence ?? 0} />
            </button>
          ))}
        </div>
      </div>

      {/* Tool detail modal */}
      {selectedTool && (
        <ToolModal tool={selectedTool} inv={inv} onClose={() => setSelectedTool(null)} />
      )}
    </div>
  );
}

// ─── TAB 3: Research Tracker ──────────────────────────────────────────────────

function ResearchTrackerTab({ inv, toolById }: { inv: KBInventory; toolById: Map<string, ToolRecord> }) {
  const [filterStatus, setFilterStatus] = useState<ResearchStatus | "">("");
  const [sortBy, setSortBy]             = useState<"name" | "status" | "date" | "freshness">("status");

  const rows = useMemo(() => {
    let tools = filterStatus ? inv.tools.filter(t => t.research_status === filterStatus) : inv.tools;
    return [...tools].sort((a, b) => {
      if (sortBy === "name")      return a.name.localeCompare(b.name);
      if (sortBy === "status")    return (STATUS_CFG[b.research_status]?.priority ?? 0) - (STATUS_CFG[a.research_status]?.priority ?? 0);
      if (sortBy === "date")      return (b.last_research_date ?? "0").localeCompare(a.last_research_date ?? "0");
      if (sortBy === "freshness") return (b.freshness?.freshness_score ?? 0) - (a.freshness?.freshness_score ?? 0);
      return 0;
    });
  }, [inv, filterStatus, sortBy]);

  const drByTool = useMemo(() => {
    const m = new Map<string, DeepResearchRecord[]>();
    for (const dr of inv.deep_research_records) {
      if (!m.has(dr.tool_id)) m.set(dr.tool_id, []);
      m.get(dr.tool_id)!.push(dr);
    }
    return m;
  }, [inv]);

  const ThBtn = ({ col, label }: { col: typeof sortBy; label: string }) => (
    <button
      onClick={() => setSortBy(col)}
      className={`text-xs font-semibold uppercase tracking-wide hover:text-white transition-colors ${sortBy === col ? "text-blue-400" : "text-gray-500"}`}
    >
      {label} {sortBy === col ? "↓" : ""}
    </button>
  );

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as ResearchStatus | "")}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
        >
          <option value="">כל הסטטוסים ({inv.tools.length})</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => {
            const count = inv.tools.filter(t => t.research_status === k).length;
            return <option key={k} value={k}>{v.icon} {v.label} ({count})</option>;
          })}
        </select>
        <span className="text-xs text-gray-600">{rows.length} כלים</span>
      </div>

      {/* Table */}
      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-gray-800 bg-gray-900/80">
          <div className="col-span-3"><ThBtn col="name" label="כלי" /></div>
          <div className="col-span-2"><ThBtn col="status" label="סטטוס" /></div>
          <div className="col-span-2"><ThBtn col="date" label="תאריך מחקר" /></div>
          <div className="col-span-2"><ThBtn col="freshness" label="טריות" /></div>
          <div className="col-span-1 text-xs font-semibold text-gray-500 uppercase tracking-wide">אמון</div>
          <div className="col-span-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">מחקרים</div>
        </div>

        <div className="divide-y divide-gray-800/60">
          {rows.map(tool => {
            const drs     = drByTool.get(tool.id) ?? [];
            const latestDr = drs.sort((a, b) => b.version - a.version)[0];

            return (
              <div key={tool.id} className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-gray-800/30 transition-colors items-center">
                {/* Tool name */}
                <div className="col-span-3">
                  <p className="text-sm text-white font-medium truncate">
                    {CATEGORY_ICONS[tool.category] ?? "🔧"} {tool.name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{tool.vendor}</p>
                </div>

                {/* Status */}
                <div className="col-span-2">
                  <StatusBadge status={tool.research_status} small />
                  {tool.has_pending_updates && (
                    <p className="text-xs text-amber-400 mt-1">📬 עדכון ממתין</p>
                  )}
                </div>

                {/* Last research date */}
                <div className="col-span-2 text-xs text-gray-400">
                  {tool.last_research_date ?? <span className="text-gray-700">—</span>}
                </div>

                {/* Freshness bar */}
                <div className="col-span-2">
                  <FreshnessBar score={tool.freshness?.freshness_score ?? tool.freshness?.confidence ?? 0} />
                  <p className="text-xs text-gray-600 mt-0.5">{tool.freshness?.last_verified}</p>
                </div>

                {/* Confidence */}
                <div className="col-span-1">
                  {latestDr ? (
                    <span className={`text-sm font-semibold ${
                      latestDr.confidence >= 80 ? "text-green-400" : latestDr.confidence >= 60 ? "text-yellow-400" : "text-red-400"
                    }`}>{latestDr.confidence}%</span>
                  ) : <span className="text-gray-700 text-sm">—</span>}
                </div>

                {/* Research records */}
                <div className="col-span-2">
                  {drs.length > 0 ? (
                    <div className="flex items-center gap-1 flex-wrap">
                      {drs.map(dr => (
                        <span key={dr.id} className="text-xs bg-green-900/40 border border-green-700/40 text-green-300 rounded px-1.5 py-0.5">
                          v{dr.version}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-700">אין</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── TAB 4: Update Queue ──────────────────────────────────────────────────────

function UpdateQueueTab({ inv, toolById }: { inv: KBInventory; toolById: Map<string, ToolRecord> }) {
  const pendingUpdates  = inv.update_records.filter(u => u.status === "pending_review");
  const appliedUpdates  = inv.update_records.filter(u => u.status === "applied");
  const openReview      = inv.review_queue.filter(r => r.status === "open");
  const pendingBackfill = inv.backfill_queue.filter(b => b.status === "pending");

  const ACTION_LABELS: Record<string, { label: string; color: string }> = {
    append_update:   { label: "הוסף עדכון",       color: "text-blue-300" },
    update_research: { label: "עדכן מחקר",        color: "text-purple-300" },
    new_tool:        { label: "כלי חדש → Backfill", color: "text-cyan-300" },
    manual_review:   { label: "בדיקה ידנית",      color: "text-orange-300" },
  };

  return (
    <div className="space-y-8">

      {/* Review queue (high priority) */}
      {openReview.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-red-300 mb-3 flex items-center gap-2">
            🔴 תור בדיקה ידנית — {openReview.length} פתוחים
          </h2>
          <div className="space-y-3">
            {openReview.map(item => {
              const tool = toolById.get(item.tool_id);
              const linked = inv.update_records.find(u => u.id === item.linked_update_id);
              return (
                <div key={item.id} className={`border rounded-xl p-4 ${SEVERITY_COLORS[item.severity]}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-white">{tool?.name ?? item.tool_id}</span>
                        <span className={`text-xs border rounded-full px-2 py-0.5 ${SEVERITY_COLORS[item.severity]}`}>
                          {item.severity}
                        </span>
                        <span className="text-xs text-gray-500">{item.category.replace(/_/g," ")}</span>
                      </div>
                      <p className="text-sm text-gray-300">{item.reason}</p>
                      {linked && (
                        <p className="text-xs text-gray-500 mt-1">
                          קשור ל: <span className="text-gray-300">{linked.title}</span>
                        </p>
                      )}
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">{item.flagged_at}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Pending update records */}
      <section>
        <h2 className="text-sm font-semibold text-amber-300 mb-3 flex items-center gap-2">
          ⚠️ עדכונים ממתינים לאישור — {pendingUpdates.length}
        </h2>
        {pendingUpdates.length === 0 ? (
          <p className="text-sm text-gray-600">אין עדכונים ממתינים</p>
        ) : (
          <div className="space-y-3">
            {pendingUpdates.map(upd => {
              const tool   = toolById.get(upd.tool_id);
              const cls    = CLASSIFICATION_COLORS[upd.classification] ?? CLASSIFICATION_COLORS.other;
              const action = ACTION_LABELS[upd.recommended_action];
              return (
                <div key={upd.id} className="bg-gray-900/60 border border-amber-800/40 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-semibold text-white text-sm">{tool?.name ?? upd.tool_id}</span>
                        <span className={`text-xs border rounded px-1.5 py-0.5 ${cls}`}>
                          {upd.classification.replace(/_/g," ")}
                        </span>
                        {action && (
                          <span className={`text-xs ${action.color}`}>→ {action.label}</span>
                        )}
                        {upd.affects_deep_research && (
                          <span className="text-xs text-purple-400">🔬 משפיע על מחקר</span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-gray-200">{upd.title}</p>
                      <p className="text-xs text-gray-400 mt-1">{upd.summary}</p>
                      <a href={upd.source_url} target="_blank" rel="noreferrer" className="text-xs text-blue-400 hover:underline mt-1 block">
                        {upd.source_type} — {upd.source_url.replace(/https?:\/\//,"")}
                      </a>
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">{upd.detected_at}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Applied updates (history) */}
      {appliedUpdates.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2">
            ✅ עודכנו לאחרונה — {appliedUpdates.length}
          </h2>
          <div className="space-y-2">
            {appliedUpdates.map(upd => {
              const tool = toolById.get(upd.tool_id);
              const cls  = CLASSIFICATION_COLORS[upd.classification] ?? CLASSIFICATION_COLORS.other;
              return (
                <div key={upd.id} className="bg-gray-900/30 border border-gray-800/50 rounded-lg px-4 py-3 flex items-center gap-3">
                  <span className={`text-xs border rounded px-1.5 py-0.5 ${cls} shrink-0`}>
                    {upd.classification.replace(/_/g," ")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 truncate">{tool?.name ?? upd.tool_id} — {upd.title}</p>
                    {upd.resolution_notes && <p className="text-xs text-gray-500">{upd.resolution_notes}</p>}
                  </div>
                  <span className="text-xs text-gray-600 shrink-0">{upd.applied_at}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Backfill queue */}
      {pendingBackfill.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-orange-300 mb-3 flex items-center gap-2">
            📥 Backfill — כלים שהתגלו, ממתינים לאישור ({pendingBackfill.length})
          </h2>
          <p className="text-xs text-gray-500 mb-3">
            כלים אלה התגלו במהלך מחקר עמוק של כלים אחרים ועדיין לא נכנסו למלאי הראשי.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pendingBackfill.map(item => (
              <div key={item.id} className="bg-gray-900/60 border border-orange-800/30 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-white text-sm">{item.tool_name}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <span>→ {item.suggested_ecosystem}</span>
                      <span>·</span>
                      <span>{item.suggested_category.replace(/_/g," ")}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      מקור: {item.discovery_source} · {item.discovered_during}
                    </p>
                  </div>
                  <span className="text-xs text-gray-500 shrink-0">{item.discovered_at}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Source monitor */}
      <section>
        <h2 className="text-sm font-semibold text-cyan-300 mb-3 flex items-center gap-2">
          📡 מקורות מנוטרים ({inv.source_records.filter(s => s.is_active).length} פעילים)
        </h2>
        <p className="text-xs text-gray-500 mb-3">
          בעתיד: סקריפטים אוטומטיים יבדקו מקורות אלה ויצרו UpdateRecords אוטומטית.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {inv.source_records.map(src => {
            const tool = toolById.get(src.tool_id);
            return (
              <div key={src.id} className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <p className="text-sm font-medium text-white">{src.label}</p>
                    <p className="text-xs text-gray-500">{tool?.name ?? src.tool_id}</p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`w-2 h-2 rounded-full ${src.is_active ? "bg-green-400" : "bg-gray-600"}`} />
                    <span className="text-xs text-gray-500">{src.check_frequency}</span>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{src.source_type.replace(/_/g," ")}</span>
                  <span>🔍 {src.total_updates_found} עדכונים</span>
                  <span>נבדק: {src.last_checked}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

// ─── Tool detail modal ────────────────────────────────────────────────────────

function ToolModal({ tool, inv, onClose }: { tool: ToolRecord; inv: KBInventory; onClose: () => void }) {
  const drs     = inv.deep_research_records.filter(dr => dr.tool_id === tool.id);
  const updates = inv.update_records.filter(u => u.tool_id === tool.id);
  const reviews = inv.review_queue.filter(r => r.tool_id === tool.id && r.status === "open");
  const sources = inv.source_records.filter(s => s.tool_id === tool.id);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/75 backdrop-blur-sm pt-10 px-4 pb-4 overflow-y-auto" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-xl font-bold text-white">{CATEGORY_ICONS[tool.category]} {tool.name}</h2>
              <StatusBadge status={tool.research_status} />
            </div>
            <p className="text-gray-400 text-sm">{tool.vendor} · {tool.category.replace(/_/g," ")}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
        </div>

        <p className="text-gray-300 mb-4">{tool.description}</p>

        {/* Open reviews warning */}
        {reviews.length > 0 && (
          <div className="bg-red-950/30 border border-red-700/40 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-300 font-medium mb-1">⚠️ דורש בדיקה ידנית</p>
            {reviews.map(r => <p key={r.id} className="text-xs text-red-400">{r.reason}</p>)}
          </div>
        )}

        {/* Deep research records */}
        {drs.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">🔬 מחקר עמוק ({drs.length})</h3>
            {drs.sort((a,b) => b.version - a.version).map(dr => (
              <div key={dr.id} className="bg-gray-800/50 rounded-lg p-3 mb-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-green-300">v{dr.version} — {dr.research_date}</span>
                  <span className="text-xs text-gray-500">אמון: {dr.confidence}%</span>
                </div>
                <p className="text-xs text-gray-300 mb-2">{dr.summary}</p>
                <ul className="list-disc list-inside text-xs text-gray-400 space-y-1">
                  {dr.key_findings.map((f, i) => <li key={i}>{f}</li>)}
                </ul>
              </div>
            ))}
          </div>
        )}

        {/* Pending updates */}
        {updates.filter(u => u.status === "pending_review").length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-amber-300 mb-2">⚠️ עדכונים ממתינים</h3>
            {updates.filter(u => u.status === "pending_review").map(upd => (
              <div key={upd.id} className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3 mb-2">
                <p className="text-sm text-gray-200">{upd.title}</p>
                <p className="text-xs text-gray-400 mt-1">{upd.summary}</p>
                <p className="text-xs text-blue-400 mt-1">פעולה מומלצת: {upd.recommended_action.replace(/_/g," ")}</p>
              </div>
            ))}
          </div>
        )}

        {/* Subscription tiers */}
        {tool.subscription_tiers.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">תוכניות</h3>
            <div className="space-y-1.5">
              {tool.subscription_tiers.map((tier, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-lg px-3 py-2 text-sm">
                  <span className="text-gray-300 capitalize">{tier.level}</span>
                  <span className="font-medium text-blue-300">{tier.price}</span>
                  <span className="text-xs text-gray-500">{tier.access_key}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Sources */}
        {sources.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">📡 מקורות מנוטרים</h3>
            {sources.map(s => (
              <div key={s.id} className="flex items-center gap-2 text-xs text-gray-400 py-1">
                <span className={`w-1.5 h-1.5 rounded-full ${s.is_active ? "bg-green-400" : "bg-gray-600"}`} />
                <span className="text-gray-300">{s.label}</span>
                <span>({s.check_frequency})</span>
                <span className="text-gray-600">· נמצאו {s.total_updates_found} עדכונים</span>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-800 text-xs text-gray-500">
          <span>עודכן: {tool.freshness?.last_verified}</span>
          <span>מחקר אחרון: {tool.last_research_date ?? "—"}</span>
          <div className="w-24"><FreshnessBar score={tool.freshness?.freshness_score ?? 0} /></div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

type TabId = "overview" | "ecosystems" | "tracker" | "queue";

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: "overview",    label: "סקירה כללית",    icon: "📊" },
  { id: "ecosystems",  label: "אקוסיסטמים",     icon: "🌐" },
  { id: "tracker",     label: "מעקב מחקר",      icon: "🔬" },
  { id: "queue",       label: "תור עדכונים",     icon: "📥" },
];

export default function KnowledgeBasePage() {
  const [inventory, setInventory] = useState<KBInventory | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  useEffect(() => {
    fetch("/api/knowledge-base")
      .then(r => r.json())
      .then((data: KBInventory) => { setInventory(data); setLoading(false); })
      .catch(() => { setError("שגיאה בטעינת מאגר הידע"); setLoading(false); });
  }, []);

  const toolById = useMemo(() => {
    if (!inventory) return new Map<string, ToolRecord>();
    return new Map(inventory.tools.map(t => [t.id, t]));
  }, [inventory]);

  // Badge counts for tabs
  const queueBadge = inventory
    ? (inventory.review_queue.filter(r => r.status === "open").length +
       inventory.update_records.filter(u => u.status === "pending_review").length)
    : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-3 animate-pulse">🧠</div>
          <p className="text-gray-400">טוען מאגר ידע...</p>
        </div>
      </div>
    );
  }

  if (error || !inventory) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-400 mb-2">{error ?? "שגיאה לא ידועה"}</p>
          <Link href="/" className="text-blue-400 hover:underline text-sm">חזור לראשי</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white" dir="rtl">
      {/* Top nav */}
      <div className="border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">← ראשי</Link>
              <span className="text-gray-700">|</span>
              <h1 className="text-lg font-bold text-white">🧠 מאגר הידע</h1>
              <span className="text-xs text-gray-600 border border-gray-700 rounded px-1.5 py-0.5">v{inventory.version}</span>
            </div>
            <div className="text-xs text-gray-500">
              {inventory.stats.total_tools} כלים · {inventory.stats.total_ecosystems} אקוסיסטמים · {inventory.last_updated}
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id
                    ? "text-white border-blue-500"
                    : "text-gray-500 border-transparent hover:text-gray-300 hover:border-gray-600"
                }`}
              >
                {tab.icon} {tab.label}
                {tab.id === "queue" && queueBadge > 0 && (
                  <span className="absolute -top-1 -left-1 text-xs bg-amber-500 text-black rounded-full w-4 h-4 flex items-center justify-center font-bold">
                    {queueBadge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "overview"   && <OverviewTab        inv={inventory} toolById={toolById} />}
        {activeTab === "ecosystems" && <EcosystemTab       inv={inventory} toolById={toolById} />}
        {activeTab === "tracker"    && <ResearchTrackerTab inv={inventory} toolById={toolById} />}
        {activeTab === "queue"      && <UpdateQueueTab     inv={inventory} toolById={toolById} />}
      </div>
    </div>
  );
}
