"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";

// ─── Types ─────────────────────────────────────────────────────────────────────

type ResearchStatus =
  | "inventory_only" | "research_in_progress" | "deep_research_complete"
  | "update_pending" | "needs_review" | "deprecated";

interface ToolRecord {
  id: string; name: string; vendor: string; category: string; ecosystem: string;
  description: string; surfaces: string[]; relations: { tool_id: string; type: string; note?: string }[];
  subscription_tiers: { level: string; price: string; access_key: string; features?: string[] }[];
  primary_access_key: string; tags: string[]; use_cases: string[];
  wiki_file?: string | null; research_status: ResearchStatus;
  last_research_date: string | null; has_pending_updates: boolean;
  research_record_ids: string[];
  deep_research_status: string;
  freshness: { score?: number; freshness_score?: number; confidence?: number; last_verified?: string; last_checked?: string };
}

interface EcosystemBranch {
  id: string; name: string; description: string; color: string;
  vendor?: string; tool_ids: string[];
}

interface DeepResearchRecord {
  id: string; tool_id: string; ecosystem_id: string; research_date: string;
  researcher: string; sources_used: string[]; summary: string;
  key_findings: string[]; confidence: number; notebooklm_url?: string | null; version: number;
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

// ─── Helpers ───────────────────────────────────────────────────────────────────

const STATUS_CFG: Record<ResearchStatus, { label: string; icon: string; color: string; bg: string; border: string; priority: number }> = {
  needs_review:           { label: "דורש בדיקה",        icon: "🔴", color: "text-red-300",    bg: "bg-red-950/50",    border: "border-red-700/60",    priority: 5 },
  update_pending:         { label: "עדכון ממתין",        icon: "⚠️", color: "text-amber-300",  bg: "bg-amber-950/50",  border: "border-amber-700/60",  priority: 4 },
  research_in_progress:   { label: "בתהליך מחקר",       icon: "🔬", color: "text-blue-300",   bg: "bg-blue-950/50",   border: "border-blue-700/60",   priority: 3 },
  deep_research_complete: { label: "מחקר עמוק הושלם",   icon: "✅", color: "text-green-300",  bg: "bg-green-950/50",  border: "border-green-700/60",  priority: 2 },
  inventory_only:         { label: "ממתין למחקר עמוק",  icon: "📦", color: "text-gray-400",   bg: "bg-gray-800/50",   border: "border-gray-700/60",   priority: 1 },
  deprecated:             { label: "מיושן / Legacy",     icon: "⚰️", color: "text-gray-600",   bg: "bg-gray-900/50",   border: "border-gray-800/60",   priority: 0 },
};

// Tag prefix definitions
const TAG_PREFIX_CFG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  "type":       { label: "סוג",              color: "text-violet-300",  bg: "bg-violet-950/40",  border: "border-violet-700/50" },
  "capability": { label: "יכולת",            color: "text-blue-300",    bg: "bg-blue-950/40",    border: "border-blue-700/50" },
  "audience":   { label: "קהל יעד",          color: "text-green-300",   bg: "bg-green-950/40",   border: "border-green-700/50" },
  "access":     { label: "גישה",             color: "text-cyan-300",    bg: "bg-cyan-950/40",    border: "border-cyan-700/50" },
  "compare":    { label: "מקבילים",          color: "text-amber-300",   bg: "bg-amber-950/40",   border: "border-amber-700/50" },
  "misc":       { label: "תגיות",            color: "text-gray-400",    bg: "bg-gray-800/40",    border: "border-gray-700/50" },
};

const TAG_VALUE_LABELS: Record<string, string> = {
  "llm-model": "מודל שפה", "assistant-app": "אפליקציית עוזר", "api": "API", "sdk": "SDK",
  "connector": "חיבור", "developer-platform": "פלטפורמת פיתוח", "workspace-app": "כלי Workspace",
  "browser-extension": "הרחבת דפדפן", "desktop-app": "דסקטופ", "mobile-app": "אפליקציית מובייל",
  "marketplace": "Marketplace", "protocol": "פרוטוקול", "no-code-platform": "No-Code",
  "automation-tool": "אוטומציה", "research-tool": "כלי מחקר", "storage-service": "אחסון",
  "experiment-lab": "ניסויי", "framework": "Framework", "subscription": "מנוי",
  "text-generation": "יצירת טקסט", "code-generation": "יצירת קוד", "image-generation": "יצירת תמונות",
  "video-generation": "יצירת וידאו", "audio-generation": "יצירת אודיו", "image-analysis": "ניתוח תמונות",
  "document-analysis": "ניתוח מסמכים", "web-search": "חיפוש ווב", "long-context": "הקשר ארוך",
  "agents": "Agents", "memory-persistent": "זיכרון מתמיד", "knowledge-base": "בסיס ידע",
  "function-calling": "Function Calling", "batch-processing": "עיבוד אצווה", "scheduling": "תזמון",
  "browser-automation": "אוטומציית דפדפן", "on-device": "On-Device", "reasoning": "חשיבה",
  "multimodal": "Multimodal", "real-time-streaming": "Streaming בזמן אמת",
  "workspace-integration": "אינטגרציית Workspace", "data-analysis": "ניתוח נתונים",
  "consumer": "צרכן", "developer": "מפתח", "enterprise": "ארגון", "researcher": "חוקר",
  "data-scientist": "מדען נתונים", "content-creator": "יוצר תוכן",
  "free-tier": "חינמי", "api-key": "מפתח API", "subscription": "מנוי", "enterprise-only": "Enterprise בלבד",
  "open-source": "קוד פתוח", "device-bundled": "מובנה במכשיר",
};

function parseTagGroups(tags: string[]) {
  const groups: Record<string, string[]> = {};
  for (const tag of tags) {
    const idx = tag.indexOf(":");
    const prefix = idx > 0 ? tag.slice(0, idx) : "misc";
    const value  = idx > 0 ? tag.slice(idx + 1) : tag;
    groups[prefix] = [...(groups[prefix] ?? []), value];
  }
  return Object.entries(groups).sort(([a], [b]) => {
    const order = ["type","capability","audience","access","compare","misc"];
    return order.indexOf(a) - order.indexOf(b);
  });
}

function tagLabel(value: string) {
  return TAG_VALUE_LABELS[value] ?? value.replace(/-/g, " ");
}

// Ecosystem → branch mapping
function getToolBranch(tool: ToolRecord): string {
  const id  = tool.id;
  const eco = tool.ecosystem;

  if (eco === "google") {
    if (id.startsWith("firebase-") || ["cloud-firestore","firebase-realtime-database","firebase-analytics","firebase-ab-testing"].includes(id))
      return "🔥 Firebase";
    if (["gmail","google-drive","google-docs","google-sheets","google-slides","google-chat",
         "google-calendar","google-forms","google-keep","google-tasks","google-sites","google-vault",
         "google-vids","google-workspace-suite","google-docs-suite","workspace-admin-console",
         "google-meet","google-appsheet","google-apps-script","google-voice"].includes(id))
      return "💼 Google Workspace";
    if (id.startsWith("gemini") || id === "google-ai-studio" || id.startsWith("notebooklm") || id === "notebooks-in-gemini")
      return "🤖 Gemini & AI";
    if (id.startsWith("vertex") || id === "gemini-api" || ["vision-ai-api","cloud-translation-api","speech-to-text-api","text-to-speech-api"].includes(id))
      return "☁️ Vertex AI & APIs";
    if (["gemma-family","gemma4-local","gemini-nano","ml-kit-genai","paligemma","medgemma"].includes(id))
      return "🔓 מודלים פתוחים";
    if (id.startsWith("google-cloud") || id.startsWith("cloud-") || ["bigquery","google-colab","kaggle","vertex-automl","vertex-workbench","vertex-mlops"].includes(id))
      return "🏗️ Cloud Infrastructure";
    if (["android-os","chrome-browser","chromeos","pixel-phones","nest-devices"].includes(id))
      return "📱 OS & מכשירים";
    if (["google-ads","google-adsense","google-admob","google-analytics-4","google-tag-manager","google-merchant-center","google-analytics-suite"].includes(id))
      return "📢 פרסום & Analytics";
    if (["imagefx-google","videofx-google","musicfx-google","flow-google","whisk-google","synthed-google","google-experiments-portal","google-labs-hub","workspace-studio-google"].includes(id))
      return "🧪 Labs & ניסויים";
    if (["google-search","youtube-google","google-maps","google-earth","google-photos","google-news","youtube-music","youtube-tv"].includes(id))
      return "🌐 מדיה & Geo";
    return "🗂️ אחר";
  }

  if (eco === "openai") {
    if (["gpt-4o","gpt-4-1","gpt-4-1-mini","gpt-4-1-nano","o-series-reasoning",
         "gpt-3-5-legacy","gpt-4-legacy","embeddings-api","embeddings-api-openai",
         "dall-e","sora-model","whisper-api","tts-api","moderation-api","codex-legacy"].includes(id))
      return "🧠 מודלים";
    if (["chatgpt-web","chatgpt-mobile","chatgpt-deep-research","chatgpt-voice",
         "chatgpt-search","chatgpt-memory","chatgpt-atlas","sora-ui",
         "code-interpreter-openai"].includes(id))
      return "💬 ChatGPT Apps";
    if (["gpt-store","custom-gpts","gpt-builder","gpt-actions","chatgpt-plugins-legacy"].includes(id))
      return "🏪 GPT Store & Custom GPTs";
    if (id.startsWith("openai-plan-"))
      return "💳 תוכניות & מחיר";
    if (["openai-plan-free","openai-plan-plus","openai-plan-pro","openai-plan-team","openai-plan-enterprise","openai-plan-edu"].includes(id))
      return "💳 תוכניות & מחיר";
    if (["responses-api","realtime-api","assistants-api-legacy","images-api","audio-api",
         "video-api-sora","fine-tuning-api","batch-api-openai","files-api-openai",
         "vector-stores-openai","moderations-api-openai","models-api-openai",
         "function-calling-openai","file-search-openai"].includes(id))
      return "🔌 API & Endpoints";
    if (["openai-platform","openai-playground","openai-dashboard","openai-agents-sdk",
         "openai-mcp-support"].includes(id))
      return "🛠️ Developer Platform";
    if (["chatgpt-enterprise-analytics","chatgpt-admin-security"].includes(id))
      return "🔒 Enterprise";
    if (["openai-gym-legacy","openai-status"].includes(id))
      return "🗂️ אחר";
    return "🗂️ אחר";
  }

  if (eco === "anthropic") {
    if (["claude-3-opus","claude-3-sonnet","claude-3-haiku","claude-35-sonnet","claude-2-legacy","constitutional-ai"].includes(id))
      return "🧠 מודלי Claude";
    if (id.startsWith("connector-"))
      return "🔌 Connectors";
    if (id.startsWith("marketplace-") || id === "claude-marketplace")
      return "🏪 Marketplace";
    if (id.startsWith("claude-plan-"))
      return "💳 תוכניות & מחיר";
    if (["claude-code","claude-code-vscode","claude-code-chrome-integration","claude-plan-mode",
         "claude-checkpoints","claude-claude-md","claude-agent-sdk"].includes(id))
      return "⌨️ Claude Code";
    if (["anthropic-sdk-python","anthropic-sdk-typescript","anthropic-sdk-go","anthropic-sdk-java","anthropic-sdk-ruby",
         "anthropic-api","message-batches-api","tool-use-api","prompt-caching-api","anthropic-console",
         "claude-workbench","mcp-protocol","anthropic-academy"].includes(id))
      return "🛠️ Developer Platform";
    if (["claude-workspaces","claude-projects","claude-knowledge-base","contextual-retriever",
         "claude-memory-enterprise","claude-memory-consumer","claude-artifacts"].includes(id))
      return "💾 Storage & Memory";
    if (["claude-zero-retention","claude-enterprise-sso","claude-on-bedrock","claude-on-vertex"].includes(id))
      return "🔒 Enterprise & Cloud";
    if (["claude-ai-web","claude-ios-app","claude-desktop","claude-in-chrome","claude-cowork",
         "claude-for-excel","claude-for-powerpoint","claude-computer-use","claude-projects"].includes(id))
      return "💬 Claude Apps";
    return "🗂️ אחר";
  }

  return tool.category;
}

const ECO_COLORS: Record<string, string> = {
  anthropic:      "border-orange-500/40 bg-orange-950/20",
  google:         "border-blue-500/40 bg-blue-950/20",
  openai:         "border-green-500/40 bg-green-950/20",
  microsoft:      "border-sky-500/40 bg-sky-950/20",
  "web-builders": "border-purple-500/40 bg-purple-950/20",
  "ide-code":     "border-cyan-500/40 bg-cyan-950/20",
  automation:     "border-yellow-500/40 bg-yellow-950/20",
  "research-writing": "border-teal-500/40 bg-teal-950/20",
  creative:       "border-pink-500/40 bg-pink-950/20",
  israeli:        "border-blue-400/40 bg-blue-900/20",
  local:          "border-gray-500/40 bg-gray-900/30",
};

const ECO_ICON: Record<string, string> = {
  anthropic: "🟠", google: "🔵", openai: "🟢", microsoft: "🔷",
  "web-builders": "🟣", "ide-code": "💻", automation: "⚙️",
  "research-writing": "📚", creative: "🎨", israeli: "🇮🇱", local: "🏠",
};

function freshnessScore(t: ToolRecord) {
  return t.freshness?.freshness_score ?? t.freshness?.score ?? t.freshness?.confidence ?? 0;
}

function FreshnessBar({ score }: { score: number }) {
  const pct   = Math.min(100, Math.max(0, Math.round(score * (score > 1 ? 1 : 100))));
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

function StatusBadge({ status, small }: { status: ResearchStatus; small?: boolean }) {
  const c = STATUS_CFG[status] ?? STATUS_CFG.inventory_only;
  return (
    <span className={`inline-flex items-center gap-1 border rounded-full ${small ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"} ${c.bg} ${c.border} ${c.color}`}>
      {c.icon} {c.label}
    </span>
  );
}

// ─── Tag Badge ─────────────────────────────────────────────────────────────────

function TagBadge({ prefix, value, onClick }: { prefix: string; value: string; onClick?: () => void }) {
  const cfg = TAG_PREFIX_CFG[prefix] ?? TAG_PREFIX_CFG.misc;
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`inline-flex items-center gap-1 text-xs border rounded-full px-2.5 py-1 ${cfg.bg} ${cfg.border} ${cfg.color} ${onClick ? "cursor-pointer hover:brightness-125 transition-all" : "cursor-default"}`}
    >
      <span className="opacity-60">{prefix}:</span>
      <span>{tagLabel(value)}</span>
    </button>
  );
}

// ─── Tool Detail Panel ─────────────────────────────────────────────────────────

function ToolDetailPanel({
  tool, inv, toolById, onClose, onCompareClick
}: {
  tool: ToolRecord;
  inv: KBInventory;
  toolById: Map<string, ToolRecord>;
  onClose: () => void;
  onCompareClick: (id: string) => void;
}) {
  const drs     = inv.deep_research_records.filter(d => d.tool_id === tool.id);
  const updates = inv.update_records.filter(u => u.tool_id === tool.id && u.status === "pending_review");
  const eco     = inv.ecosystems.find(e => e.id === tool.ecosystem);
  const tagGroups = parseTagGroups(tool.tags);
  const compareTools = (tagGroups.find(([p]) => p === "compare")?.[1] ?? [])
    .map(v => toolById.get(v) ?? toolById.get(v.replace(/^compare:/,"")))
    .filter(Boolean) as ToolRecord[];

  const statusCfg = STATUS_CFG[tool.research_status] ?? STATUS_CFG.inventory_only;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl h-full bg-gray-950 border-l border-gray-700 overflow-y-auto shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gray-950/95 backdrop-blur border-b border-gray-800 px-6 py-4 z-10">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <span className="text-xl">{ECO_ICON[tool.ecosystem] ?? "🔧"}</span>
                <h2 className="text-lg font-bold text-white">{tool.name}</h2>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-gray-500">{tool.vendor}</span>
                {eco && (
                  <span className={`text-xs border rounded-full px-2 py-0.5 ${ECO_COLORS[eco.id] ?? "border-gray-700 bg-gray-800"} text-gray-300`}>
                    {eco.name.replace(" Ecosystem","")}
                  </span>
                )}
                <span className="text-xs text-gray-600">{getToolBranch(tool)}</span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl leading-none shrink-0">×</button>
          </div>
          <div className="mt-2">
            <StatusBadge status={tool.research_status} small />
          </div>
        </div>

        <div className="px-6 py-5 space-y-6">

          {/* Research needed banner */}
          {tool.research_status === "inventory_only" && (
            <div className="bg-yellow-950/30 border border-yellow-700/40 rounded-xl p-4">
              <p className="text-sm text-yellow-300 font-medium">📦 ממתין למחקר עמוק</p>
              <p className="text-xs text-yellow-500/80 mt-1">
                כלי זה במאגר הידע אך לא עבר מחקר עמוק עדיין. הנתונים מבוססים על מחקר הסקר הראשוני בלבד.
              </p>
            </div>
          )}

          {/* Pending updates */}
          {updates.length > 0 && (
            <div className="bg-amber-950/20 border border-amber-700/30 rounded-xl p-4">
              <p className="text-sm text-amber-300 font-medium mb-2">⚠️ {updates.length} עדכונים ממתינים</p>
              {updates.map(u => (
                <div key={u.id} className="text-xs text-amber-400">{u.title}</div>
              ))}
            </div>
          )}

          {/* Description */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">תיאור</h3>
            <p className="text-gray-200 text-sm leading-relaxed">{tool.description}</p>
          </section>

          {/* Tags grouped by prefix */}
          <section>
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">תגיות ומיון</h3>
            <div className="space-y-3">
              {tagGroups.map(([prefix, values]) => {
                const cfg = TAG_PREFIX_CFG[prefix] ?? TAG_PREFIX_CFG.misc;
                return (
                  <div key={prefix}>
                    <p className={`text-xs font-semibold mb-1.5 ${cfg.color} opacity-70`}>{cfg.label}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {values.map(v => (
                        <TagBadge
                          key={v}
                          prefix={prefix}
                          value={v}
                          onClick={prefix === "compare" ? () => {
                            const t2 = toolById.get(v);
                            if (t2) onCompareClick(t2.id);
                          } : undefined}
                        />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Use cases */}
          {tool.use_cases.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">שימושים עיקריים</h3>
              <ul className="space-y-1.5">
                {tool.use_cases.map((uc, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                    <span className="text-blue-500 mt-0.5 shrink-0">▸</span>
                    {uc}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Compare tools (cross-ecosystem equivalents) */}
          {compareTools.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                🔀 מקבילים מאקוסיסטמים אחרים
              </h3>
              <div className="space-y-2">
                {compareTools.map(ct => (
                  <button
                    key={ct.id}
                    onClick={() => onCompareClick(ct.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all hover:brightness-110 ${ECO_COLORS[ct.ecosystem] ?? "border-gray-700 bg-gray-800/40"}`}
                  >
                    <div className="flex items-center gap-2">
                      <span>{ECO_ICON[ct.ecosystem] ?? "🔧"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white">{ct.name}</p>
                        <p className="text-xs text-gray-400 truncate">{ct.vendor} · {ct.ecosystem}</p>
                      </div>
                      <StatusBadge status={ct.research_status} small />
                    </div>
                    <p className="text-xs text-gray-400 mt-1.5 line-clamp-2">{ct.description}</p>
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Subscription tiers */}
          {tool.subscription_tiers.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">תוכניות & מחיר</h3>
              <div className="space-y-1.5">
                {tool.subscription_tiers.map((tier, i) => (
                  <div key={i} className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-2.5">
                    <span className="text-sm text-gray-200 capitalize font-medium">{tier.level}</span>
                    <span className="text-sm font-semibold text-blue-300">{tier.price}</span>
                    <span className="text-xs text-gray-500">{tier.access_key}</span>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Deep research records */}
          {drs.length > 0 && (
            <section>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">🔬 מחקר עמוק</h3>
              {drs.sort((a,b) => b.version - a.version).map(dr => (
                <div key={dr.id} className="bg-gray-900/60 border border-green-800/30 rounded-xl p-4 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold text-green-300">v{dr.version} — {dr.research_date}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">חוקר: {dr.researcher}</span>
                      <span className={`text-xs font-semibold ${dr.confidence >= 80 ? "text-green-400" : dr.confidence >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                        אמון {dr.confidence}%
                      </span>
                    </div>
                  </div>
                  {dr.summary && <p className="text-sm text-gray-300 mb-3">{dr.summary}</p>}
                  {dr.key_findings.length > 0 && (
                    <ul className="space-y-1.5">
                      {dr.key_findings.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                          <span className="text-green-500 mt-0.5 shrink-0">✓</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                  )}
                  {dr.sources_used.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-800">
                      <p className="text-xs text-gray-600 mb-1">מקורות ({dr.sources_used.length})</p>
                      <div className="flex flex-wrap gap-1">
                        {dr.sources_used.slice(0, 5).map((s, i) => (
                          <span key={i} className="text-xs bg-gray-800 text-gray-500 rounded px-2 py-0.5 truncate max-w-xs">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </section>
          )}

          {/* Footer meta */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-800 text-xs text-gray-600">
            <span>ID: {tool.id}</span>
            <span>מחקר אחרון: {tool.last_research_date ?? "—"}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Overview Tab ──────────────────────────────────────────────────────────────

function OverviewTab({
  inv, toolById, onEcoSelect
}: {
  inv: KBInventory;
  toolById: Map<string, ToolRecord>;
  onEcoSelect: (id: string) => void;
}) {
  const [selectedEcoId, setSelectedEcoId] = useState<string | null>(null);

  const selectedEco   = inv.ecosystems.find(e => e.id === selectedEcoId);
  const selectedTools = selectedEco
    ? selectedEco.tool_ids.map(id => toolById.get(id)).filter(Boolean) as ToolRecord[]
    : [];
  const selectedDRs   = inv.deep_research_records.filter(dr => dr.ecosystem_id === selectedEcoId);

  const ecoStats = inv.ecosystems.map(eco => {
    const tools      = eco.tool_ids.map(id => toolById.get(id)).filter(Boolean) as ToolRecord[];
    const researched = tools.filter(t => t.research_status === "deep_research_complete").length;
    const pending    = tools.filter(t => ["update_pending","needs_review"].includes(t.research_status)).length;
    const inventory  = tools.filter(t => t.research_status === "inventory_only").length;
    return { eco, tools: tools.length, researched, pending, inventory, pct: tools.length ? Math.round((researched / tools.length) * 100) : 0 };
  });

  return (
    <div className="space-y-6">
      {/* Top stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "סה״כ כלים",      value: inv.stats.total_tools,       color: "text-blue-400",   icon: "🗂️" },
          { label: "אקוסיסטמים",     value: inv.stats.total_ecosystems,  color: "text-purple-400", icon: "🌐" },
          { label: "נחקרו לעומק",    value: inv.stats.tools_researched,  color: "text-green-400",  icon: "✅" },
          { label: "ממתינים למחקר",  value: (inv.stats.tools_inventory_only ?? 0) + (inv.stats.tools_update_pending ?? 0), color: "text-amber-400", icon: "📦" },
        ].map(s => (
          <div key={s.label} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Ecosystem cards grid */}
      <div>
        <h2 className="text-sm font-semibold text-gray-400 mb-3">לחץ על אקוסיסטם לפרטים מלאים ומחקר</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {ecoStats.map(({ eco, tools, researched, pending, inventory, pct }) => (
            <button
              key={eco.id}
              onClick={() => setSelectedEcoId(selectedEcoId === eco.id ? null : eco.id)}
              className={`text-left p-4 rounded-xl border transition-all hover:brightness-110 ${
                selectedEcoId === eco.id
                  ? `${ECO_COLORS[eco.id] ?? "border-gray-600 bg-gray-800"} ring-1 ring-blue-500/40`
                  : `${ECO_COLORS[eco.id] ?? "border-gray-700 bg-gray-900/40"}`
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{ECO_ICON[eco.id] ?? "🔧"}</span>
                  <div>
                    <p className="text-sm font-semibold text-white">{eco.name.replace(" Ecosystem","").replace(" AI","")}</p>
                    <p className="text-xs text-gray-500">{eco.vendor ?? ""}</p>
                  </div>
                </div>
                <span className="text-xs font-bold text-gray-300 bg-gray-800/80 rounded-full px-2.5 py-1">{tools}</span>
              </div>
              <p className="text-xs text-gray-400 line-clamp-2 mb-3">{eco.description}</p>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${pct === 100 ? "bg-green-500" : pct > 0 ? "bg-blue-500" : "bg-gray-700"}`}
                    style={{ width: `${Math.max(pct, pct > 0 ? 4 : 0)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-600">{pct}%</span>
              </div>
              <div className="flex gap-3 text-xs">
                <span className="text-green-400">✅ {researched} נחקרו</span>
                <span className="text-gray-500">📦 {inventory} ממתינים</span>
                {pending > 0 && <span className="text-amber-400">⚠️ {pending}</span>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Ecosystem detail panel */}
      {selectedEco && (
        <div className={`border rounded-2xl p-6 ${ECO_COLORS[selectedEco.id] ?? "border-gray-700 bg-gray-900"}`}>
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{ECO_ICON[selectedEco.id]}</span>
              <div>
                <h2 className="text-xl font-bold text-white">{selectedEco.name}</h2>
                <p className="text-sm text-gray-400">{selectedEco.description}</p>
              </div>
            </div>
            <button
              onClick={() => { onEcoSelect(selectedEco.id); }}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors border border-blue-500/30 rounded-lg px-3 py-1.5 hover:bg-blue-500/10"
            >
              צפה בכל הכלים ←
            </button>
          </div>

          {/* DR records for this ecosystem */}
          {selectedDRs.length > 0 && (
            <div className="mb-5">
              <h3 className="text-sm font-semibold text-gray-300 mb-3 flex items-center gap-2">
                🔬 מחקר עמוק שהועלה למערכת ({selectedDRs.length} רשומות)
              </h3>
              <div className="space-y-3">
                {selectedDRs.map(dr => (
                  <div key={dr.id} className="bg-black/30 border border-gray-700/50 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-gray-500">{dr.id}</span>
                        <span className="text-xs text-gray-600">·</span>
                        <span className="text-xs text-gray-400">{dr.research_date}</span>
                        <span className="text-xs text-gray-600">·</span>
                        <span className="text-xs text-gray-400">חוקר: {dr.researcher}</span>
                      </div>
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${dr.confidence >= 80 ? "bg-green-900/50 text-green-400" : dr.confidence >= 60 ? "bg-yellow-900/50 text-yellow-400" : "bg-red-900/50 text-red-400"}`}>
                        אמון {dr.confidence}%
                      </span>
                    </div>
                    {dr.summary && <p className="text-sm text-gray-300 mb-3">{dr.summary}</p>}
                    <ul className="space-y-1.5">
                      {dr.key_findings.map((f, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                          <span className="text-blue-500 mt-0.5 shrink-0">›</span>
                          {f}
                        </li>
                      ))}
                    </ul>
                    {dr.sources_used.length > 0 && (
                      <p className="text-xs text-gray-600 mt-3">{dr.sources_used.length} מקורות מחקר</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tool preview by branch */}
          <div>
            <h3 className="text-sm font-semibold text-gray-300 mb-3">כלים לפי ענף</h3>
            {(() => {
              const byBranch: Record<string, ToolRecord[]> = {};
              for (const t of selectedTools) {
                const b = getToolBranch(t);
                byBranch[b] = [...(byBranch[b] ?? []), t];
              }
              return Object.entries(byBranch).slice(0, 6).map(([branch, tools]) => (
                <div key={branch} className="mb-3">
                  <p className="text-xs font-semibold text-gray-400 mb-1.5">{branch} <span className="text-gray-600">({tools.length})</span></p>
                  <div className="flex flex-wrap gap-1.5">
                    {tools.slice(0, 6).map(t => (
                      <span key={t.id} className={`text-xs border rounded-full px-2.5 py-1 ${STATUS_CFG[t.research_status]?.bg} ${STATUS_CFG[t.research_status]?.border} text-gray-300`}>
                        {STATUS_CFG[t.research_status]?.icon} {t.name}
                      </span>
                    ))}
                    {tools.length > 6 && (
                      <span className="text-xs text-gray-600 px-2 py-1">+{tools.length - 6} נוספים</span>
                    )}
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Ecosystem Tab (with branch grouping) ─────────────────────────────────────

function EcosystemTab({
  inv, toolById, initialEco
}: {
  inv: KBInventory;
  toolById: Map<string, ToolRecord>;
  initialEco?: string;
}) {
  const [selectedEco,  setSelectedEco]  = useState<string | null>(initialEco ?? null);
  const [selectedTool, setSelectedTool] = useState<ToolRecord | null>(null);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [viewMode,     setViewMode]     = useState<"branches" | "grid">("branches");

  const ecoTools = useMemo(() => {
    let tools = inv.tools;
    if (selectedEco) {
      const eco = inv.ecosystems.find(e => e.id === selectedEco);
      if (eco) tools = tools.filter(t => eco.tool_ids.includes(t.id));
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      tools = tools.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.includes(q)) ||
        t.use_cases.some(uc => uc.toLowerCase().includes(q))
      );
    }
    return tools;
  }, [inv, selectedEco, searchQuery]);

  const byBranch = useMemo(() => {
    const map: Record<string, ToolRecord[]> = {};
    for (const t of ecoTools) {
      const b = getToolBranch(t);
      map[b] = [...(map[b] ?? []), t];
    }
    return Object.entries(map).sort(([a], [b]) => a.localeCompare(b));
  }, [ecoTools]);

  const handleCompareClick = (toolId: string) => {
    const t = toolById.get(toolId);
    if (t) setSelectedTool(t);
  };

  return (
    <div className="flex gap-5">
      {/* Sidebar */}
      <aside className="w-52 shrink-0">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1 mb-2">אקוסיסטמים</p>
        <div className="space-y-0.5">
          <button
            onClick={() => { setSelectedEco(null); }}
            className={`w-full text-right text-sm px-3 py-2 rounded-lg transition-colors flex items-center justify-between ${
              !selectedEco ? "bg-blue-600/20 border border-blue-500/40 text-blue-300" : "text-gray-400 hover:bg-gray-800/60"
            }`}
          >
            <span>הכל</span>
            <span className="text-xs bg-gray-800 rounded-full px-2 py-0.5">{inv.tools.length}</span>
          </button>
          {inv.ecosystems.map(eco => (
            <button
              key={eco.id}
              onClick={() => setSelectedEco(eco.id === selectedEco ? null : eco.id)}
              className={`w-full text-right text-sm px-3 py-2 rounded-lg transition-colors flex items-center gap-2 ${
                selectedEco === eco.id ? "bg-blue-600/20 border border-blue-500/40 text-blue-300" : "text-gray-400 hover:bg-gray-800/60"
              }`}
            >
              <span>{ECO_ICON[eco.id] ?? "🔧"}</span>
              <span className="flex-1 truncate">{eco.name.replace(" Ecosystem","").replace(" AI","")}</span>
              <span className="text-xs bg-gray-800 rounded-full px-2 py-0.5 shrink-0">{eco.tool_ids.length}</span>
            </button>
          ))}
        </div>
      </aside>

      {/* Main area */}
      <div className="flex-1 min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-2 mb-4">
          <input
            type="text" placeholder="חפש כלי, יכולת, שימוש..."
            value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
            className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
          />
          <div className="flex border border-gray-700 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("branches")} className={`px-3 py-1.5 text-xs transition-colors ${viewMode === "branches" ? "bg-blue-600/30 text-blue-300" : "text-gray-500 hover:bg-gray-800"}`}>
              עץ
            </button>
            <button onClick={() => setViewMode("grid")} className={`px-3 py-1.5 text-xs transition-colors ${viewMode === "grid" ? "bg-blue-600/30 text-blue-300" : "text-gray-500 hover:bg-gray-800"}`}>
              רשת
            </button>
          </div>
          <span className="text-xs text-gray-600">{ecoTools.length} כלים</span>
        </div>

        {viewMode === "branches" ? (
          /* Branch tree view */
          <div className="space-y-5">
            {byBranch.map(([branch, tools]) => (
              <div key={branch}>
                <div className="flex items-center gap-2 mb-2 pb-1.5 border-b border-gray-800">
                  <h3 className="text-sm font-semibold text-gray-300">{branch}</h3>
                  <span className="text-xs text-gray-600 bg-gray-800 rounded-full px-2 py-0.5">{tools.length}</span>
                  <div className="flex items-center gap-1 ml-1">
                    {Object.entries(
                      tools.reduce((acc, t) => { acc[t.research_status] = (acc[t.research_status] ?? 0) + 1; return acc; }, {} as Record<string, number>)
                    ).map(([s, n]) => (
                      <span key={s} className={`text-xs ${STATUS_CFG[s as ResearchStatus]?.color ?? "text-gray-500"}`}>
                        {STATUS_CFG[s as ResearchStatus]?.icon} {n}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2">
                  {tools.map(tool => (
                    <ToolCard key={tool.id} tool={tool} onClick={() => setSelectedTool(tool)} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Grid view */
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {ecoTools.map(tool => (
              <ToolCard key={tool.id} tool={tool} onClick={() => setSelectedTool(tool)} />
            ))}
          </div>
        )}
      </div>

      {/* Tool detail side panel */}
      {selectedTool && (
        <ToolDetailPanel
          tool={selectedTool}
          inv={inv}
          toolById={toolById}
          onClose={() => setSelectedTool(null)}
          onCompareClick={handleCompareClick}
        />
      )}
    </div>
  );
}

// ─── Tool Card ─────────────────────────────────────────────────────────────────

function ToolCard({ tool, onClick }: { tool: ToolRecord; onClick: () => void }) {
  const sc = STATUS_CFG[tool.research_status] ?? STATUS_CFG.inventory_only;
  const typeTags = tool.tags.filter(t => t.startsWith("type:")).map(t => t.slice(5));
  const capTags  = tool.tags.filter(t => t.startsWith("capability:")).slice(0, 2).map(t => t.slice(11));

  return (
    <button
      onClick={onClick}
      className={`text-left w-full bg-gray-900/60 border rounded-xl p-3.5 hover:border-blue-500/50 hover:bg-gray-800/60 transition-all group ${sc.border}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-white text-sm truncate group-hover:text-blue-300 transition-colors">
            {ECO_ICON[tool.ecosystem] ?? "🔧"} {tool.name}
          </p>
          <p className="text-xs text-gray-500 truncate">{tool.vendor}</p>
        </div>
        <span className={`text-xs shrink-0 ${sc.color}`}>{sc.icon}</span>
      </div>

      <p className="text-xs text-gray-400 line-clamp-2 mb-2">{tool.description}</p>

      {/* Type + capability tags */}
      <div className="flex flex-wrap gap-1">
        {typeTags.slice(0,1).map(v => (
          <span key={v} className="text-xs border rounded-full px-2 py-0.5 bg-violet-950/40 border-violet-700/50 text-violet-300">
            {tagLabel(v)}
          </span>
        ))}
        {capTags.map(v => (
          <span key={v} className="text-xs border rounded-full px-2 py-0.5 bg-blue-950/40 border-blue-700/50 text-blue-300">
            {tagLabel(v)}
          </span>
        ))}
      </div>
    </button>
  );
}

// ─── Research Tracker Tab ──────────────────────────────────────────────────────

function ResearchTrackerTab({ inv, toolById }: { inv: KBInventory; toolById: Map<string, ToolRecord> }) {
  const [filterStatus, setFilterStatus] = useState<ResearchStatus | "">("");
  const [filterEco,    setFilterEco]    = useState("");
  const [sortBy,       setSortBy]       = useState<"name"|"status"|"date"|"freshness">("status");
  const [selectedTool, setSelectedTool] = useState<ToolRecord | null>(null);

  const rows = useMemo(() => {
    let tools = filterStatus ? inv.tools.filter(t => t.research_status === filterStatus) : inv.tools;
    if (filterEco) tools = tools.filter(t => t.ecosystem === filterEco);
    return [...tools].sort((a, b) => {
      if (sortBy === "name")      return a.name.localeCompare(b.name);
      if (sortBy === "status")    return (STATUS_CFG[b.research_status]?.priority ?? 0) - (STATUS_CFG[a.research_status]?.priority ?? 0);
      if (sortBy === "date")      return (b.last_research_date ?? "0").localeCompare(a.last_research_date ?? "0");
      if (sortBy === "freshness") return freshnessScore(b) - freshnessScore(a);
      return 0;
    });
  }, [inv, filterStatus, filterEco, sortBy]);

  const Th = ({ col, label }: { col: typeof sortBy; label: string }) => (
    <button onClick={() => setSortBy(col)} className={`text-xs font-semibold uppercase tracking-wide hover:text-white ${sortBy === col ? "text-blue-400" : "text-gray-500"}`}>
      {label} {sortBy === col ? "↓" : ""}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as ResearchStatus | "")}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none">
          <option value="">כל הסטטוסים ({inv.tools.length})</option>
          {Object.entries(STATUS_CFG).map(([k, v]) => (
            <option key={k} value={k}>{v.icon} {v.label} ({inv.tools.filter(t => t.research_status === k).length})</option>
          ))}
        </select>
        <select value={filterEco} onChange={e => setFilterEco(e.target.value)}
          className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-300 focus:outline-none">
          <option value="">כל האקוסיסטמים</option>
          {inv.ecosystems.map(e => <option key={e.id} value={e.id}>{e.name.replace(" Ecosystem","")}</option>)}
        </select>
        <span className="text-xs text-gray-600">{rows.length} כלים</span>
      </div>

      <div className="bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 border-b border-gray-800 bg-gray-900/80">
          <div className="col-span-4"><Th col="name" label="כלי" /></div>
          <div className="col-span-3"><Th col="status" label="סטטוס" /></div>
          <div className="col-span-2"><Th col="date" label="תאריך" /></div>
          <div className="col-span-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">תגיות מרכזיות</div>
        </div>
        <div className="divide-y divide-gray-800/60 max-h-[600px] overflow-y-auto">
          {rows.map(tool => {
            const typeTags = tool.tags.filter(t => t.startsWith("type:")).slice(0,1).map(t => t.slice(5));
            const capTags  = tool.tags.filter(t => t.startsWith("capability:")).slice(0,2).map(t => t.slice(11));
            return (
              <button
                key={tool.id}
                onClick={() => setSelectedTool(tool)}
                className="w-full grid grid-cols-12 gap-2 px-4 py-3 hover:bg-gray-800/30 transition-colors text-left items-center"
              >
                <div className="col-span-4">
                  <p className="text-sm text-white font-medium truncate">{ECO_ICON[tool.ecosystem] ?? "🔧"} {tool.name}</p>
                  <p className="text-xs text-gray-500 truncate">{tool.vendor}</p>
                </div>
                <div className="col-span-3">
                  <StatusBadge status={tool.research_status} small />
                </div>
                <div className="col-span-2 text-xs text-gray-400">{tool.last_research_date ?? "—"}</div>
                <div className="col-span-3 flex flex-wrap gap-1">
                  {typeTags.map(v => (
                    <span key={v} className="text-xs bg-violet-950/40 border border-violet-700/50 text-violet-300 rounded-full px-2 py-0.5">{tagLabel(v)}</span>
                  ))}
                  {capTags.map(v => (
                    <span key={v} className="text-xs bg-blue-950/40 border border-blue-700/50 text-blue-300 rounded-full px-2 py-0.5">{tagLabel(v)}</span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedTool && (
        <ToolDetailPanel
          tool={selectedTool} inv={inv} toolById={toolById}
          onClose={() => setSelectedTool(null)}
          onCompareClick={id => { const t = toolById.get(id); if (t) setSelectedTool(t); }}
        />
      )}
    </div>
  );
}

// ─── Update Queue Tab (unchanged) ─────────────────────────────────────────────

function UpdateQueueTab({ inv, toolById }: { inv: KBInventory; toolById: Map<string, ToolRecord> }) {
  const pendingUpdates  = inv.update_records.filter(u => u.status === "pending_review");
  const appliedUpdates  = inv.update_records.filter(u => u.status === "applied");
  const openReview      = inv.review_queue.filter(r => r.status === "open");
  const pendingBackfill = inv.backfill_queue.filter(b => b.status === "pending");

  const CLS_COLORS: Record<string, string> = {
    pricing_change: "bg-yellow-900/50 text-yellow-300 border-yellow-700",
    new_feature:    "bg-blue-900/50 text-blue-300 border-blue-700",
    model_update:   "bg-purple-900/50 text-purple-300 border-purple-700",
    api_change:     "bg-orange-900/50 text-orange-300 border-orange-700",
    deprecation:    "bg-red-900/50 text-red-300 border-red-700",
    new_tool:       "bg-cyan-900/50 text-cyan-300 border-cyan-700",
    other:          "bg-gray-800/50 text-gray-400 border-gray-600",
  };

  return (
    <div className="space-y-8">
      {openReview.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-red-300 mb-3">🔴 תור בדיקה — {openReview.length}</h2>
          {openReview.map(r => (
            <div key={r.id} className="bg-red-950/20 border border-red-700/40 rounded-xl p-4 mb-2">
              <p className="text-sm font-semibold text-white">{toolById.get(r.tool_id)?.name ?? r.tool_id}</p>
              <p className="text-xs text-red-400 mt-1">{r.reason}</p>
            </div>
          ))}
        </section>
      )}
      <section>
        <h2 className="text-sm font-semibold text-amber-300 mb-3">⚠️ עדכונים ממתינים — {pendingUpdates.length}</h2>
        {pendingUpdates.length === 0 ? <p className="text-sm text-gray-600">אין עדכונים</p> : pendingUpdates.map(u => (
          <div key={u.id} className="bg-gray-900/60 border border-amber-800/40 rounded-xl p-4 mb-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-sm font-semibold text-white">{toolById.get(u.tool_id)?.name ?? u.tool_id}</p>
              <span className={`text-xs border rounded px-1.5 py-0.5 ${CLS_COLORS[u.classification] ?? CLS_COLORS.other}`}>{u.classification.replace(/_/g," ")}</span>
            </div>
            <p className="text-sm text-gray-200">{u.title}</p>
            <p className="text-xs text-gray-400 mt-1">{u.summary}</p>
          </div>
        ))}
      </section>
      {appliedUpdates.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-400 mb-3">✅ הוחלו — {appliedUpdates.length}</h2>
          {appliedUpdates.map(u => (
            <div key={u.id} className="flex items-center gap-3 bg-gray-900/30 border border-gray-800 rounded-lg px-4 py-2 mb-1">
              <span className={`text-xs border rounded px-1.5 py-0.5 ${CLS_COLORS[u.classification] ?? CLS_COLORS.other} shrink-0`}>{u.classification.replace(/_/g," ")}</span>
              <p className="text-sm text-gray-300 truncate">{toolById.get(u.tool_id)?.name} — {u.title}</p>
              <span className="text-xs text-gray-600 shrink-0">{u.applied_at}</span>
            </div>
          ))}
        </section>
      )}
      {pendingBackfill.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-orange-300 mb-3">📥 Backfill — {pendingBackfill.length}</h2>
          {pendingBackfill.map(b => (
            <div key={b.id} className="bg-gray-900/60 border border-orange-800/30 rounded-xl p-3 mb-2">
              <p className="text-sm font-semibold text-white">{b.tool_name}</p>
              <p className="text-xs text-gray-400">→ {b.suggested_ecosystem} · {b.suggested_category}</p>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────────────

type TabId = "overview" | "ecosystems" | "tracker" | "queue";

export default function KnowledgeBasePage() {
  const [inventory, setInventory] = useState<KBInventory | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [jumpEco,   setJumpEco]   = useState<string | undefined>();

  useEffect(() => {
    fetch("/api/knowledge-base")
      .then(r => r.json())
      .then((d: KBInventory) => { setInventory(d); setLoading(false); })
      .catch(() => { setError("שגיאה בטעינת מאגר הידע"); setLoading(false); });
  }, []);

  const toolById = useMemo(() => {
    if (!inventory) return new Map<string, ToolRecord>();
    return new Map(inventory.tools.map(t => [t.id, t]));
  }, [inventory]);

  const handleEcoSelect = (ecoId: string) => {
    setJumpEco(ecoId);
    setActiveTab("ecosystems");
  };

  const queueBadge = inventory
    ? inventory.review_queue.filter(r => r.status === "open").length
      + inventory.update_records.filter(u => u.status === "pending_review").length
    : 0;

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-center"><div className="text-4xl mb-3 animate-pulse">🧠</div><p className="text-gray-400">טוען מאגר ידע...</p></div>
    </div>
  );

  if (error || !inventory) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <p className="text-red-400">{error ?? "שגיאה"}</p>
    </div>
  );

  const TABS: { id: TabId; label: string; icon: string }[] = [
    { id: "overview",   label: "סקירה כללית",  icon: "📊" },
    { id: "ecosystems", label: "אקוסיסטמים",   icon: "🌐" },
    { id: "tracker",    label: "מעקב מחקר",    icon: "🔬" },
    { id: "queue",      label: "תור עדכונים",  icon: "📥" },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-white" dir="rtl">
      {/* Top nav */}
      <div className="border-b border-gray-800 bg-gray-900/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Link href="/" className="text-gray-500 hover:text-gray-300 text-sm">← ראשי</Link>
              <span className="text-gray-700">|</span>
              <h1 className="text-lg font-bold">🧠 מאגר הידע</h1>
              <span className="text-xs text-gray-600 border border-gray-700 rounded px-1.5 py-0.5">v{inventory.version}</span>
            </div>
            <p className="text-xs text-gray-500">{inventory.stats.total_tools} כלים · {inventory.stats.total_ecosystems} אקוסיסטמים · {inventory.last_updated}</p>
          </div>
          <div className="flex gap-1">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                  activeTab === tab.id ? "text-white border-blue-500" : "text-gray-500 border-transparent hover:text-gray-300"
                }`}
              >
                {tab.icon} {tab.label}
                {tab.id === "queue" && queueBadge > 0 && (
                  <span className="absolute -top-1 -left-1 text-xs bg-amber-500 text-black rounded-full w-4 h-4 flex items-center justify-center font-bold">{queueBadge}</span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {activeTab === "overview"   && <OverviewTab   inv={inventory} toolById={toolById} onEcoSelect={handleEcoSelect} />}
        {activeTab === "ecosystems" && <EcosystemTab  inv={inventory} toolById={toolById} initialEco={jumpEco} />}
        {activeTab === "tracker"    && <ResearchTrackerTab inv={inventory} toolById={toolById} />}
        {activeTab === "queue"      && <UpdateQueueTab    inv={inventory} toolById={toolById} />}
      </div>
    </div>
  );
}
