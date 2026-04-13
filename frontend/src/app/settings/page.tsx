"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import {
  Settings, Save, CheckCircle, Brain, Sparkles,
  ChevronRight, Loader2, Trophy, Search, ChevronDown,
  ChevronUp, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────
type GenericTier = "free" | "pro" | "api";

interface BrandOption {
  id: string;
  label: string;
  maps_to: GenericTier;
  models: string[];
  info_he: string;
  unlocks: string[];
}

interface BrandTierDef {
  provider_label: string;
  tool_ids: string[];
  options: BrandOption[];
}

interface ToolEntry {
  id: string;
  name: string;
  category: string;
  cost: string;
  hebrew_support: string;
  description: string;
}

// ── Category display order ─────────────────────────────────────────────────────
const CATEGORY_ORDER = [
  "מודלי שפה / צ'אטבוטים",
  "וידאו ועריכה",
  "אודיו ומוזיקה",
  "יצירת תמונות",
  "No-Code / פיתוח",
  "אוטומציות",
  "מצגות",
  "פרודוקטיביות",
  "עיצוב גרפי",
  "למידה ומחקר",
  "שיווק",
  "סוכנים",
  "דפדפני AI",
  "כלים בוואטסאפ",
  "אימון מודלים חזותיים",
  "משפטי",
];

// Generic tier config for non-brand tools
const GENERIC_TIER_CFG: Record<GenericTier, { label: string; color: string; dot: string }> = {
  free: { label: "Free",  color: "border-border text-muted-foreground",       dot: "bg-muted-foreground" },
  pro:  { label: "Pro",   color: "border-primary text-primary bg-primary/10", dot: "bg-primary"          },
  api:  { label: "API",   color: "border-orange-400 text-orange-400 bg-orange-400/10", dot: "bg-orange-400" },
};

const TIER_SCORE: Record<GenericTier, number> = { free: 1, pro: 3, api: 5 };

// ── Info Tooltip ───────────────────────────────────────────────────────────────
function InfoTooltip({ text, models }: { text: string; models?: string[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        className="text-muted-foreground hover:text-primary transition-colors"
        aria-label="מידע נוסף"
      >
        <Info className="h-3.5 w-3.5" />
      </button>
      {open && (
        <div className="absolute start-0 top-6 z-50 w-72 rounded-xl border border-border bg-popover shadow-xl p-3 space-y-2 text-xs">
          <p className="text-foreground leading-relaxed">{text}</p>
          {models && models.length > 0 && (
            <div>
              <p className="text-muted-foreground font-medium mb-1">מודלים זמינים:</p>
              <div className="flex flex-wrap gap-1">
                {models.map((m) => (
                  <span key={m} className="bg-secondary rounded px-1.5 py-0.5 text-xs font-mono">{m}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Brand Tier Dropdown (for major providers) ──────────────────────────────────
function BrandDropdown({
  toolId,
  brandDef,
  selectedBrandTier,
  onChange,
}: {
  toolId: string;
  brandDef: BrandTierDef;
  selectedBrandTier: string;
  onChange: (toolId: string, brandOptionId: string, mapsTo: GenericTier, unlocks: string[]) => void;
}) {
  const selectedOption = brandDef.options.find((o) => o.id === selectedBrandTier) ?? brandDef.options[0];
  const isPaid = selectedOption.maps_to !== "free";

  return (
    <div className="flex items-center gap-2 shrink-0">
      {/* Info about selected tier */}
      <InfoTooltip text={selectedOption.info_he} models={selectedOption.models} />

      {/* Brand-specific dropdown */}
      <div className="relative">
        <select
          value={selectedBrandTier}
          onChange={(e) => {
            const opt = brandDef.options.find((o) => o.id === e.target.value)!;
            onChange(toolId, opt.id, opt.maps_to, opt.unlocks);
          }}
          dir="ltr"
          className={cn(
            "appearance-none rounded-lg border px-3 py-1.5 pe-7 text-xs font-medium cursor-pointer transition-all",
            "focus:outline-none focus:ring-2 focus:ring-ring bg-secondary",
            isPaid
              ? "border-primary text-primary"
              : "border-border text-muted-foreground"
          )}
        >
          {brandDef.options.map((opt) => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
      </div>
    </div>
  );
}

// ── Generic Tier Toggle (for non-brand tools) ──────────────────────────────────
function GenericToggle({ value, onChange }: { value: GenericTier; onChange: (t: GenericTier) => void }) {
  const tiers: GenericTier[] = ["free", "pro", "api"];
  return (
    <div className="flex gap-1 shrink-0">
      {tiers.map((t) => {
        const cfg = GENERIC_TIER_CFG[t];
        const active = value === t;
        return (
          <button
            key={t}
            onClick={() => onChange(t)}
            className={cn(
              "px-2.5 py-1 rounded-md text-xs font-medium border transition-all",
              active ? cfg.color : "border-border text-muted-foreground hover:bg-accent"
            )}
          >
            {active && <span className={cn("inline-block h-1.5 w-1.5 rounded-full me-1.5", cfg.dot)} />}
            {cfg.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Tool Row ───────────────────────────────────────────────────────────────────
function ToolRow({
  tool,
  genericTier,
  brandDef,
  selectedBrandTier,
  isMaster,
  onGenericChange,
  onBrandChange,
}: {
  tool: ToolEntry;
  genericTier: GenericTier;
  brandDef?: BrandTierDef;
  selectedBrandTier?: string;
  isMaster: boolean;
  onGenericChange: (id: string, t: GenericTier) => void;
  onBrandChange: (toolId: string, brandOptionId: string, mapsTo: GenericTier, unlocks: string[]) => void;
}) {
  const isPaid = genericTier !== "free";
  const hebBadge = tool.hebrew_support === "תומך";

  return (
    <div className={cn(
      "flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all",
      isMaster
        ? "border-yellow-400/40 bg-yellow-400/5"
        : isPaid
        ? "border-primary/20 bg-primary/5"
        : "border-transparent hover:border-border hover:bg-accent/30"
    )}>
      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium truncate">{tool.name}</span>
          {isMaster && (
            <span className="inline-flex items-center gap-1 text-xs text-yellow-400 shrink-0">
              <Trophy className="h-3 w-3" />
              Master Brain
            </span>
          )}
          {hebBadge && (
            <span className="text-xs text-green-400 shrink-0">✅ עברית</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">{tool.cost}</p>
      </div>

      {/* Controls */}
      {brandDef && selectedBrandTier !== undefined ? (
        <BrandDropdown
          toolId={tool.id}
          brandDef={brandDef}
          selectedBrandTier={selectedBrandTier}
          onChange={onBrandChange}
        />
      ) : (
        <GenericToggle
          value={genericTier}
          onChange={(t) => onGenericChange(tool.id, t)}
        />
      )}
    </div>
  );
}

// ── Category Section ───────────────────────────────────────────────────────────
function CategorySection({
  category,
  tools,
  genericTiers,
  brandTierDefs,
  userBrandTiers,
  masterBrainId,
  onGenericChange,
  onBrandChange,
}: {
  category: string;
  tools: ToolEntry[];
  genericTiers: Record<string, GenericTier>;
  brandTierDefs: Record<string, BrandTierDef>;
  userBrandTiers: Record<string, string>;
  masterBrainId: string | null;
  onGenericChange: (id: string, t: GenericTier) => void;
  onBrandChange: (toolId: string, brandOptionId: string, mapsTo: GenericTier, unlocks: string[]) => void;
}) {
  const [open, setOpen] = useState(category === "מודלי שפה / צ'אטבוטים");
  const proCount = tools.filter((t) => genericTiers[t.id] !== "free").length;

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-card hover:bg-accent/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{category}</span>
          <Badge variant="secondary" className="text-xs">{tools.length}</Badge>
          {proCount > 0 && (
            <Badge className="text-xs bg-primary/10 text-primary border-primary/30">{proCount} פעילים</Badge>
          )}
        </div>
        {open
          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
          : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-3 py-2 space-y-1 bg-background/40">
          {tools.map((tool) => {
            // Find if this tool has a brand def
            const brandDefEntry = Object.entries(brandTierDefs).find(
              ([, def]) => def.tool_ids.includes(tool.id)
            );
            const brandDef = brandDefEntry ? brandDefEntry[1] : undefined;
            const brandKey = brandDefEntry ? brandDefEntry[0] : undefined;
            const selectedBrandTier = brandKey ? (userBrandTiers[brandKey] ?? "free") : undefined;

            return (
              <ToolRow
                key={tool.id}
                tool={tool}
                genericTier={genericTiers[tool.id] ?? "free"}
                brandDef={brandDef}
                selectedBrandTier={selectedBrandTier}
                isMaster={masterBrainId === tool.id}
                onGenericChange={onGenericChange}
                onBrandChange={onBrandChange}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Ecosystem Banner ───────────────────────────────────────────────────────────
function EcosystemBanner({
  brandTierDefs,
  userBrandTiers,
}: {
  brandTierDefs: Record<string, BrandTierDef>;
  userBrandTiers: Record<string, string>;
}) {
  const active = Object.entries(brandTierDefs).filter(([key, def]) => {
    const sel = userBrandTiers[key] ?? "free";
    const opt = def.options.find((o) => o.id === sel);
    return opt && opt.maps_to !== "free";
  });

  if (!active.length) return null;

  return (
    <div className="rounded-xl border border-blue-400/30 bg-blue-400/5 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-semibold text-blue-400">כיסוי אקוסיסטם פעיל</span>
      </div>
      {active.map(([key, def]) => {
        const sel = userBrandTiers[key] ?? "free";
        const opt = def.options.find((o) => o.id === sel)!;
        return (
          <div key={key} className="flex items-start gap-2 text-xs">
            <span className="text-foreground font-medium shrink-0">{def.provider_label}:</span>
            <span className="text-muted-foreground">{opt.label}</span>
            {opt.unlocks.length > 0 && (
              <span className="text-green-400">→ מפעיל: {opt.unlocks.join(", ")}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [tools, setTools] = useState<ToolEntry[]>([]);
  const [genericTiers, setGenericTiers] = useState<Record<string, GenericTier>>({});
  const [brandTierDefs, setBrandTierDefs] = useState<Record<string, BrandTierDef>>({});
  const [userBrandTiers, setUserBrandTiers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setTools(d.tools ?? []);
        setGenericTiers(d.user_tiers ?? {});
        setBrandTierDefs(d.brand_tiers ?? {});
        setUserBrandTiers(d.user_brand_tiers ?? {});
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Handle brand dropdown change — cascades unlocks
  function handleBrandChange(toolId: string, brandOptionId: string, mapsTo: GenericTier, unlocks: string[]) {
    // Map brand key from toolId
    const brandKey = Object.keys(brandTierDefs).find(
      (k) => brandTierDefs[k].tool_ids.includes(toolId)
    ) ?? toolId;

    setUserBrandTiers((prev) => ({ ...prev, [brandKey]: brandOptionId }));

    // Update the generic tier for the primary tool
    setGenericTiers((prev) => {
      const next = { ...prev, [toolId]: mapsTo };
      // Cascade to unlocked tools — only upgrade never downgrade
      for (const uid of unlocks) {
        const cur = TIER_SCORE[next[uid] ?? "free"];
        if (TIER_SCORE[mapsTo] > cur) next[uid] = mapsTo;
      }
      return next;
    });
  }

  function handleGenericChange(id: string, t: GenericTier) {
    setGenericTiers((prev) => ({ ...prev, [id]: t }));
  }

  // Master Brain — highest scoring tool among generic tiers
  const masterBrainId = useMemo(() => {
    let bestId: string | null = null;
    let bestScore = 0;
    for (const [id, tier] of Object.entries(genericTiers)) {
      const score = TIER_SCORE[tier as GenericTier] ?? 0;
      if (score > bestScore) { bestScore = score; bestId = id; }
    }
    return bestScore > 1 ? bestId : null;
  }, [genericTiers]);

  const masterBrainName = masterBrainId
    ? (tools.find((t) => t.id === masterBrainId)?.name ?? masterBrainId)
    : null;

  // Filter & group
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return !q ? tools : tools.filter(
      (t) => t.name.toLowerCase().includes(q) || t.category.includes(q)
    );
  }, [tools, search]);

  const grouped = useMemo(() => {
    const map: Record<string, ToolEntry[]> = {};
    for (const t of filtered) {
      if (!map[t.category]) map[t.category] = [];
      map[t.category].push(t);
    }
    return CATEGORY_ORDER
      .filter((cat) => map[cat]?.length)
      .map((cat) => ({ category: cat, tools: map[cat] }));
  }, [filtered]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_tiers: genericTiers, user_brand_tiers: userBrandTiers }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  const activeCount = Object.values(genericTiers).filter((t) => t !== "free").length;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0 gap-3">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2">
            <ChevronRight className="h-4 w-4" />
            חזרה לדשבורד
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">הגדרות ארגז הכלים</h1>
          {activeCount > 0 && (
            <Badge className="bg-primary/10 text-primary border-primary/30 text-xs">
              {activeCount} פעילים
            </Badge>
          )}
        </div>
        <Button
          onClick={handleSave}
          disabled={saving || loading}
          size="sm"
          className="gap-2 shrink-0 min-w-[130px]"
        >
          {saving ? (
            <><Loader2 className="h-4 w-4 animate-spin" />שומר…</>
          ) : saved ? (
            <><CheckCircle className="h-4 w-4" />נשמר!</>
          ) : (
            <><Save className="h-4 w-4" />שמור הגדרות</>
          )}
        </Button>
      </header>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

          {/* Intro */}
          <div className="text-center space-y-1">
            <div className="flex items-center justify-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              <h2 className="text-xl font-bold">ארגז הכלים שלי</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              בחר את המנוי הפעיל שלך לכל ספק. לחץ על <Info className="h-3 w-3 inline" /> לפרטים על כל רמה.
            </p>
          </div>

          {/* Master Brain */}
          {!loading && masterBrainName && (
            <div className="rounded-xl border border-yellow-400/40 bg-yellow-400/5 px-4 py-3 flex items-center gap-3">
              <Trophy className="h-5 w-5 text-yellow-400 shrink-0" />
              <div className="text-sm">
                <span className="font-semibold text-yellow-400">Master Brain: </span>
                <span className="text-foreground">{masterBrainName}</span>
                <span className="text-xs text-muted-foreground block mt-0.5">
                  הכלי הכי חזק שיש לך — ישמש כ"מוח" הראשי בכל הפרויקטים
                </span>
              </div>
            </div>
          )}

          {/* Ecosystem banner */}
          {!loading && (
            <EcosystemBanner brandTierDefs={brandTierDefs} userBrandTiers={userBrandTiers} />
          )}

          {/* Legend */}
          {!loading && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground px-1">
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-muted-foreground" />
                Free — חינמי
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Pro — מנוי בתשלום
              </span>
              <span className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-orange-400" />
                API — גישה תכנותית
              </span>
              <span className="flex items-center gap-1.5">
                <Info className="h-3 w-3" />
                — פרטי מנוי
              </span>
            </div>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="absolute end-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="חפש כלי, קטגוריה…"
              className="w-full rounded-xl border border-input bg-card pe-10 ps-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Tool grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : grouped.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">לא נמצאו כלים</p>
          ) : (
            <div className="space-y-3">
              {grouped.map(({ category, tools: catTools }) => (
                <CategorySection
                  key={category}
                  category={category}
                  tools={catTools}
                  genericTiers={genericTiers}
                  brandTierDefs={brandTierDefs}
                  userBrandTiers={userBrandTiers}
                  masterBrainId={masterBrainId}
                  onGenericChange={handleGenericChange}
                  onBrandChange={handleBrandChange}
                />
              ))}
            </div>
          )}

          {/* How tiers affect recommendations */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="font-semibold text-sm">איך הרמה שבחרת משפיעה על ההמלצות?</h3>
            </div>
            <ul className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">1.</span>
                <span><strong className="text-foreground">Gemini Advanced</strong> → המערכת יודעת שיש לך 1.5 Pro ו-Ultra. תמליץ ל"חיפוש + ניתוח" לפני Perplexity.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">2.</span>
                <span><strong className="text-foreground">ChatGPT Plus</strong> → DALL-E 3 מופעל אוטומטית. משימות תמונה ינותבו דרך ChatGPT במקום Midjourney.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">3.</span>
                <span><strong className="text-foreground">Claude Pro</strong> → לניתוח מסמכים ארוכים (200K tokens), כתיבה ואסטרטגיה — Claude יהיה ה-Master Brain.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-primary font-bold shrink-0">4.</span>
                <span><strong className="text-foreground">Copilot Free</strong> → עדיין מומלץ לחיפוש רשת מהיר, אבל לא לניתוח עמוק שבו Claude מנצח.</span>
              </li>
            </ul>
          </div>

          {/* Bottom save */}
          <Button onClick={handleSave} disabled={saving || loading} className="w-full gap-2" size="lg">
            {saving ? (
              <><Loader2 className="h-4 w-4 animate-spin" />שומר הגדרות…</>
            ) : saved ? (
              <><CheckCircle className="h-4 w-4" />הגדרות נשמרו בהצלחה!</>
            ) : (
              <><Save className="h-4 w-4" />שמור הגדרות</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
