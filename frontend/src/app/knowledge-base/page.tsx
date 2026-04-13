"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

// ─── Types (mirrored from knowledge-base.ts for client use) ──────────────────

interface ToolRelation   { tool_id: string; type: string; note?: string }
interface ConnectorRef   { tool_id: string; connector_type: string; description: string }
interface SubscriptionTier { level: string; price: string; access_key: string; features: string[] }
interface FreshnessInfo  { last_verified: string; confidence: number; freshness_score: number; notes?: string }

interface ToolRecord {
  id:                  string;
  name:                string;
  vendor:              string;
  category:            string;
  ecosystem:           string;
  description:         string;
  surfaces:            string[];
  relations:           ToolRelation[];
  connectors:          ConnectorRef[];
  subscription_tiers:  SubscriptionTier[];
  primary_access_key:  string;
  tags:                string[];
  use_cases:           string[];
  wiki_file?:          string;
  deep_research_status: string;
  freshness:           FreshnessInfo;
}

interface EcosystemBranch {
  id:          string;
  name:        string;
  description: string;
  color:       string;
  vendor:      string;
  tool_ids:    string[];
}

interface BackfillItem {
  id:                   string;
  tool_name:            string;
  suggested_ecosystem:  string;
  suggested_category:   string;
  status:               string;
  discovery_source:     string;
  discovered_during:    string;
}

interface KBStats {
  total_tools:       number;
  total_ecosystems:  number;
  last_updated:      string;
}

interface KBInventory {
  version:        string;
  last_updated:   string;
  ecosystems:     EcosystemBranch[];
  tools:          ToolRecord[];
  backfill_queue: BackfillItem[];
  stats:          KBStats;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
  chat_assistant:   "🤖 Chat",
  code_assistant:   "💻 Code",
  ide:              "🖥️ IDE",
  web_builder:      "🌐 Web Builder",
  automation:       "⚙️ Automation",
  agent_framework:  "🤝 Agents",
  image_generation: "🖼️ Image",
  video_generation: "🎬 Video",
  voice_generation: "🎙️ Voice",
  music_generation: "🎵 Music",
  research:         "🔬 Research",
  writing:          "✍️ Writing",
  data_analysis:    "📊 Data",
  local_model:      "🏠 Local",
  browser_agent:    "🌍 Browser",
  protocol:         "🔗 Protocol",
  platform:         "🏗️ Platform",
  company:          "🏢 Company",
};

const TAG_COLORS: Record<string, string> = {
  "beginner-friendly":  "bg-green-900/50 text-green-300 border-green-700",
  "code-required":      "bg-purple-900/50 text-purple-300 border-purple-700",
  "no-code":            "bg-cyan-900/50 text-cyan-300 border-cyan-700",
  "visual-first":       "bg-blue-900/50 text-blue-300 border-blue-700",
  "privacy-safe":       "bg-emerald-900/50 text-emerald-300 border-emerald-700",
  "hebrew-support":     "bg-yellow-900/50 text-yellow-300 border-yellow-700",
  "israeli-product":    "bg-amber-900/50 text-amber-300 border-amber-700",
  "fast-iteration":     "bg-orange-900/50 text-orange-300 border-orange-700",
  "production-ready":   "bg-indigo-900/50 text-indigo-300 border-indigo-700",
  "experimental":       "bg-red-900/50 text-red-300 border-red-700",
  "terminal-required":  "bg-gray-800/70 text-gray-400 border-gray-600",
  "gpu-recommended":    "bg-pink-900/50 text-pink-300 border-pink-700",
  "free-tier-strong":   "bg-teal-900/50 text-teal-300 border-teal-700",
  "api-heavy":          "bg-violet-900/50 text-violet-300 border-violet-700",
  "team-collaboration": "bg-sky-900/50 text-sky-300 border-sky-700",
};

const RESEARCH_STATUS: Record<string, { label: string; color: string }> = {
  none:     { label: "לא נחקר",    color: "text-gray-500" },
  partial:  { label: "חקירה חלקית", color: "text-yellow-400" },
  complete: { label: "✅ מלא",      color: "text-green-400" },
};

const ACCESS_KEY_LABELS: Record<string, string> = {
  web_sub:        "🌐 מינוי web",
  api_key:        "🔑 API key",
  local_runtime:  "🏠 Local runtime",
  org_access:     "🏢 ארגוני",
  student_access: "🎓 סטודנט",
  free:           "🆓 חינם",
};

// ─── Freshness bar ────────────────────────────────────────────────────────────

function FreshnessBar({ score }: { score: number }) {
  const pct   = Math.round(score);
  const color = pct >= 70 ? "bg-green-500" : pct >= 40 ? "bg-yellow-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500">{pct}%</span>
    </div>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({ tool, onClick }: { tool: ToolRecord; onClick: () => void }) {
  const research  = RESEARCH_STATUS[tool.deep_research_status] ?? RESEARCH_STATUS.none;
  const catLabel  = CATEGORY_LABELS[tool.category] ?? tool.category;
  const competing = tool.relations.filter(r => r.type === "competing").length;
  const related   = tool.relations.filter(r => r.type === "related").length;
  const freeTier  = tool.subscription_tiers.find(t => t.level === "free" || t.price === "free");

  return (
    <button
      onClick={onClick}
      className="text-left w-full bg-gray-900/60 border border-gray-700/60 rounded-xl p-4 hover:border-blue-500/60 hover:bg-gray-800/60 transition-all group"
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white truncate group-hover:text-blue-300 transition-colors">
            {tool.name}
          </h3>
          <p className="text-xs text-gray-400 truncate">{tool.vendor}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs bg-gray-800 border border-gray-700 rounded-md px-1.5 py-0.5 text-gray-300 whitespace-nowrap">
            {catLabel}
          </span>
          {freeTier && (
            <span className="text-xs bg-teal-900/40 border border-teal-700/60 rounded-md px-1.5 py-0.5 text-teal-300 whitespace-nowrap">
              🆓 חינם
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="text-sm text-gray-400 line-clamp-2 mb-3">{tool.description}</p>

      {/* Tags */}
      {tool.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tool.tags.slice(0, 3).map(tag => (
            <span
              key={tag}
              className={`text-xs border rounded px-1.5 py-0.5 ${TAG_COLORS[tag] ?? "bg-gray-800 text-gray-400 border-gray-600"}`}
            >
              {tag}
            </span>
          ))}
          {tool.tags.length > 3 && (
            <span className="text-xs text-gray-500">+{tool.tags.length - 3}</span>
          )}
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-800">
        <span className={research.color}>{research.label}</span>
        <span className="flex gap-3">
          {related > 0 && <span>🔗 {related}</span>}
          {competing > 0 && <span>⚔️ {competing}</span>}
          {tool.connectors.length > 0 && <span>🔌 {tool.connectors.length}</span>}
        </span>
      </div>

      {/* Freshness */}
      <FreshnessBar score={tool.freshness?.freshness_score ?? tool.freshness?.confidence ?? 0} />
    </button>
  );
}

// ─── Tool Detail Modal ────────────────────────────────────────────────────────

function ToolModal({ tool, onClose }: { tool: ToolRecord; onClose: () => void }) {
  const research = RESEARCH_STATUS[tool.deep_research_status] ?? RESEARCH_STATUS.none;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm pt-10 px-4 pb-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-gray-700 rounded-2xl p-6 w-full max-w-2xl shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">{tool.name}</h2>
            <p className="text-gray-400 text-sm">{tool.vendor} · {CATEGORY_LABELS[tool.category] ?? tool.category}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none">×</button>
        </div>

        {/* Description */}
        <p className="text-gray-300 mb-4">{tool.description}</p>

        {/* Use cases */}
        {tool.use_cases.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">שימושים עיקריים</h3>
            <ul className="list-disc list-inside text-sm text-gray-300 space-y-1">
              {tool.use_cases.map((uc, i) => <li key={i}>{uc}</li>)}
            </ul>
          </div>
        )}

        {/* Tags */}
        {tool.tags.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">תגיות</h3>
            <div className="flex flex-wrap gap-2">
              {tool.tags.map(tag => (
                <span key={tag} className={`text-xs border rounded-full px-2.5 py-1 ${TAG_COLORS[tag] ?? "bg-gray-800 text-gray-400 border-gray-600"}`}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Subscription tiers */}
        {tool.subscription_tiers.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">תוכניות</h3>
            <div className="space-y-2">
              {tool.subscription_tiers.map((tier, i) => (
                <div key={i} className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-300 capitalize">{tier.level}</span>
                  <span className="text-sm font-medium text-blue-300">{tier.price}</span>
                  <span className="text-xs text-gray-500">{ACCESS_KEY_LABELS[tier.access_key] ?? tier.access_key}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Relations */}
        {tool.relations.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">קשרים ({tool.relations.length})</h3>
            <div className="space-y-1">
              {tool.relations.slice(0, 8).map((rel, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-gray-400">
                  <span className={`font-medium ${
                    rel.type === "competing" ? "text-red-400" :
                    rel.type === "related"   ? "text-blue-400" :
                    rel.type === "parallel"  ? "text-yellow-400" :
                    rel.type === "child"     ? "text-green-400" :
                    rel.type === "parent"    ? "text-purple-400" : "text-gray-400"
                  }`}>{rel.type}</span>
                  <span className="text-gray-300">{rel.tool_id}</span>
                  {rel.note && <span className="text-gray-500 truncate">— {rel.note}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Surfaces */}
        {tool.surfaces.length > 0 && (
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-gray-400 mb-2">זמין ב</h3>
            <div className="flex flex-wrap gap-2">
              {tool.surfaces.map(s => (
                <span key={s} className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-gray-300">{s}</span>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-800 text-xs text-gray-500">
          <span className={research.color}>מחקר: {research.label}</span>
          <span>עודכן: {tool.freshness?.last_verified ?? "לא ידוע"}</span>
          <FreshnessBar score={tool.freshness?.freshness_score ?? tool.freshness?.confidence ?? 0} />
        </div>
      </div>
    </div>
  );
}

// ─── Backfill Queue Panel ─────────────────────────────────────────────────────

function BackfillPanel({ items }: { items: BackfillItem[] }) {
  if (items.length === 0) return null;
  const pending = items.filter(i => i.status === "pending");
  if (pending.length === 0) return null;

  return (
    <div className="mt-8 bg-orange-950/30 border border-orange-700/40 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-orange-400 text-lg">📥</span>
        <h2 className="text-base font-semibold text-orange-300">תור Backfill — ממתינים לאישור ({pending.length})</h2>
      </div>
      <p className="text-xs text-orange-400/70 mb-4">כלים שהתגלו במחקר עמוק ועדיין לא נכנסו למלאי הראשי</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {pending.map(item => (
          <div key={item.id} className="bg-gray-900/60 border border-orange-800/30 rounded-lg p-3">
            <p className="font-medium text-white text-sm">{item.tool_name}</p>
            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
              <span>אקוסיסטם: <span className="text-orange-300">{item.suggested_ecosystem}</span></span>
              <span>·</span>
              <span>קטגוריה: <span className="text-orange-300">{item.suggested_category}</span></span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              מקור: {item.discovery_source} · התגלה במהלך: {item.discovered_during}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function KnowledgeBasePage() {
  const [inventory,       setInventory]       = useState<KBInventory | null>(null);
  const [loading,         setLoading]         = useState(true);
  const [error,           setError]           = useState<string | null>(null);
  const [selectedEco,     setSelectedEco]     = useState<string | null>(null);
  const [selectedTool,    setSelectedTool]    = useState<ToolRecord | null>(null);
  const [searchQuery,     setSearchQuery]     = useState("");
  const [filterResearch,  setFilterResearch]  = useState<string | null>(null);
  const [filterTag,       setFilterTag]       = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/knowledge-base")
      .then(r => r.json())
      .then((data: KBInventory) => { setInventory(data); setLoading(false); })
      .catch(() => { setError("שגיאה בטעינת מאגר הידע"); setLoading(false); });
  }, []);

  // Derived: tool lookup map
  const toolById = useMemo(() => {
    if (!inventory) return new Map<string, ToolRecord>();
    return new Map(inventory.tools.map(t => [t.id, t]));
  }, [inventory]);

  // Derived: filtered tools
  const filteredTools = useMemo(() => {
    if (!inventory) return [];
    let tools = inventory.tools;

    // Ecosystem filter
    if (selectedEco) {
      const eco = inventory.ecosystems.find(e => e.id === selectedEco);
      if (eco) tools = tools.filter(t => eco.tool_ids.includes(t.id));
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tools = tools.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.vendor.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q)) ||
        t.use_cases.some(uc => uc.toLowerCase().includes(q))
      );
    }

    // Research status filter
    if (filterResearch) {
      tools = tools.filter(t => t.deep_research_status === filterResearch);
    }

    // Tag filter
    if (filterTag) {
      tools = tools.filter(t => t.tags.includes(filterTag));
    }

    return tools;
  }, [inventory, selectedEco, searchQuery, filterResearch, filterTag]);

  // Derived: all unique tags
  const allTags = useMemo(() => {
    if (!inventory) return [];
    const tagSet = new Set<string>();
    inventory.tools.forEach(t => t.tags.forEach(tag => tagSet.add(tag)));
    return Array.from(tagSet).sort();
  }, [inventory]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">טוען מאגר ידע...</div>
      </div>
    );
  }

  if (error || !inventory) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-red-400">{error ?? "שגיאה לא ידועה"}</div>
      </div>
    );
  }

  const stats = inventory.stats;

  return (
    <div className="min-h-screen bg-gray-950 text-white" dir="rtl">
      {/* Top nav */}
      <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
              ← ראשי
            </Link>
            <span className="text-gray-700">|</span>
            <h1 className="text-lg font-bold text-white">🧠 מאגר הידע</h1>
          </div>
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>{stats.total_tools} כלים</span>
            <span>{stats.total_ecosystems} אקוסיסטמים</span>
            <span>עודכן {inventory.last_updated}</span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "סה״כ כלים",        value: stats.total_tools,                                                  color: "text-blue-400"   },
            { label: "אקוסיסטמים",        value: stats.total_ecosystems,                                             color: "text-purple-400" },
            { label: "נחקרו לעומק",       value: inventory.tools.filter(t => t.deep_research_status === "complete").length, color: "text-green-400" },
            { label: "ממתינים לעיון (Backfill)", value: inventory.backfill_queue.filter(i => i.status === "pending").length, color: "text-orange-400" },
          ].map(stat => (
            <div key={stat.label} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-gray-500 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Search + filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <input
            type="text"
            placeholder="חיפוש כלי, vendor, תגית, שימוש..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <select
            value={filterResearch ?? ""}
            onChange={e => setFilterResearch(e.target.value || null)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">כל סטטוסי מחקר</option>
            <option value="none">לא נחקר</option>
            <option value="partial">חקירה חלקית</option>
            <option value="complete">נחקר לעומק</option>
          </select>
          <select
            value={filterTag ?? ""}
            onChange={e => setFilterTag(e.target.value || null)}
            className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="">כל התגיות</option>
            {allTags.map(tag => (
              <option key={tag} value={tag}>{tag}</option>
            ))}
          </select>
        </div>

        <div className="flex gap-6">
          {/* Sidebar — Ecosystems */}
          <aside className="w-56 shrink-0">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
              אקוסיסטמים
            </h2>
            <div className="space-y-1">
              <button
                onClick={() => setSelectedEco(null)}
                className={`w-full text-right text-sm px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                  selectedEco === null
                    ? "bg-blue-600/20 border border-blue-500/40 text-blue-300"
                    : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-300"
                }`}
              >
                <span>כולם</span>
                <span className="text-xs bg-gray-800 rounded-full px-2 py-0.5">{inventory.tools.length}</span>
              </button>

              {inventory.ecosystems.map(eco => {
                const count = eco.tool_ids.length;
                const isActive = selectedEco === eco.id;
                return (
                  <button
                    key={eco.id}
                    onClick={() => setSelectedEco(isActive ? null : eco.id)}
                    className={`w-full text-right text-sm px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
                      isActive
                        ? "bg-blue-600/20 border border-blue-500/40 text-blue-300"
                        : "text-gray-400 hover:bg-gray-800/60 hover:text-gray-300"
                    }`}
                  >
                    <span className="truncate">{eco.name.replace(" Ecosystem", "").replace(" AI", "")}</span>
                    <span className="text-xs bg-gray-800 rounded-full px-2 py-0.5 shrink-0">{count}</span>
                  </button>
                );
              })}
            </div>
          </aside>

          {/* Main — Tools grid */}
          <main className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm text-gray-500">
                {filteredTools.length} כלים
                {selectedEco && inventory.ecosystems.find(e => e.id === selectedEco) && (
                  <span className="text-gray-600"> · {inventory.ecosystems.find(e => e.id === selectedEco)!.name}</span>
                )}
              </p>
              {(searchQuery || filterResearch || filterTag) && (
                <button
                  onClick={() => { setSearchQuery(""); setFilterResearch(null); setFilterTag(null); }}
                  className="text-xs text-red-400 hover:text-red-300 transition-colors"
                >
                  נקה פילטרים ×
                </button>
              )}
            </div>

            {filteredTools.length === 0 ? (
              <div className="text-center py-16 text-gray-600">
                <p className="text-4xl mb-3">🔍</p>
                <p>לא נמצאו כלים התואמים לחיפוש</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {filteredTools.map(tool => (
                  <ToolCard
                    key={tool.id}
                    tool={tool}
                    onClick={() => setSelectedTool(tool)}
                  />
                ))}
              </div>
            )}

            {/* Backfill queue */}
            <BackfillPanel items={inventory.backfill_queue} />
          </main>
        </div>
      </div>

      {/* Tool detail modal */}
      {selectedTool && (
        <ToolModal tool={selectedTool} onClose={() => setSelectedTool(null)} />
      )}
    </div>
  );
}
