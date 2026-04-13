"use client";

import { useState, useEffect, useCallback } from "react";
import {
  ChevronRight, ShieldCheck, Wifi, WifiOff, Cpu, Globe,
  Building2, GraduationCap, Key, CheckCircle, XCircle, Save,
  Scan, Loader2, AlertCircle, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { scopedRead, scopedWrite } from "@/lib/user-profile";

// ─── Types ─────────────────────────────────────────────────────────────────────
type AccessLevel = "yes" | "no" | "partial";

interface AccessMap {
  web_sub:       AccessLevel;
  api_key:       AccessLevel;
  local_runtime: AccessLevel;
  org_access:    AccessLevel;
  student_access:AccessLevel;
  notes:         string;
}

const DEFAULT_MAP: AccessMap = {
  web_sub: "no", api_key: "no", local_runtime: "no",
  org_access: "no", student_access: "no", notes: "",
};

const BASE_KEY = "user_access_map";

// ─── Ollama detection ─────────────────────────────────────────────────────────
interface OllamaDetection {
  running:  boolean;
  models:   string[];
  error?:   string;
}

async function detectOllama(): Promise<OllamaDetection> {
  try {
    const res = await fetch("http://localhost:11434/api/tags", {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) return { running: false, models: [], error: `שגיאה ${res.status}` };
    const data = await res.json();
    const models: string[] = (data.models ?? []).map((m: { name: string }) => m.name);
    return { running: true, models };
  } catch (e) {
    const msg = String(e);
    if (msg.includes("AbortError") || msg.includes("timeout")) {
      return { running: false, models: [], error: "timeout — Ollama לא מגיב" };
    }
    return { running: false, models: [], error: "Ollama לא רץ על localhost:11434" };
  }
}

// ─── Level config ─────────────────────────────────────────────────────────────
const LEVEL_CFG: Record<AccessLevel, {
  label: string; icon: React.ElementType;
  color: string; bg: string; border: string;
}> = {
  yes:     { label: "יש לי",  icon: CheckCircle, color: "text-green-300",          bg: "bg-green-500/10",   border: "border-green-500/30"  },
  partial: { label: "חלקי",   icon: ShieldCheck, color: "text-yellow-300",         bg: "bg-yellow-500/10",  border: "border-yellow-500/30" },
  no:      { label: "אין לי", icon: XCircle,     color: "text-muted-foreground",   bg: "bg-secondary",      border: "border-border"        },
};

// ─── Access type definitions ──────────────────────────────────────────────────
interface AccessEntry {
  id:       keyof Omit<AccessMap, "notes">;
  label:    string;
  sub:      string;
  icon:     React.ElementType;
  color:    string;
  examples: string[];
  tip?:     string;
}

const ACCESS_TYPES: AccessEntry[] = [
  {
    id:       "web_sub",
    label:    "מנויי Web (Chat)",
    sub:      "גישה דרך ממשק אינטרנטי — תשלום חודשי",
    icon:     Globe,
    color:    "text-blue-400",
    examples: ["Claude Pro ($20/m)", "ChatGPT Plus ($20/m)", "Gemini Advanced ($20/m)", "Cursor Pro ($20/m)"],
    tip:      "אם יש לך אחד מאלה — בחר 'יש לי'. אם יש חלק — 'חלקי'.",
  },
  {
    id:       "api_key",
    label:    "API Keys",
    sub:      "גישה תכנותית — תשלום לפי שימוש",
    icon:     Key,
    color:    "text-orange-400",
    examples: ["Anthropic API", "OpenAI API", "Gemini API", "Groq API (חינמי)"],
    tip:      "API key ≠ מנוי Web. Claude Code דורש Anthropic API key.",
  },
  {
    id:       "local_runtime",
    label:    "Runtime מקומי (Ollama)",
    sub:      "מודלים שרצים על המחשב שלך — פרטיות מלאה",
    icon:     Cpu,
    color:    "text-green-400",
    examples: ["Ollama + Gemma 4", "LM Studio", "llama.cpp", "Jan.ai"],
    tip:      "לחץ על 'בדוק אוטומטית' — המערכת תזהה את Ollama אם הוא רץ.",
  },
  {
    id:       "org_access",
    label:    "גישה ארגונית",
    sub:      "דרך מקום העבודה / מוסד לימודים",
    icon:     Building2,
    color:    "text-purple-400",
    examples: ["Microsoft 365 Copilot", "Google Workspace AI", "GitHub Copilot for Teams"],
  },
  {
    id:       "student_access",
    label:    "גישת סטודנט",
    sub:      "הטבות אקדמיות — לרוב חינמיות",
    icon:     GraduationCap,
    color:    "text-yellow-400",
    examples: ["GitHub Student Pack", "OpenAI for Education", "Notion AI חינמי"],
  },
];

// ─── Route availability summary ───────────────────────────────────────────────
function deriveRoutes(map: AccessMap) {
  return [
    {
      type:      "Cheapest",
      label:     "הזול ביותר",
      available: true,
      reason:    "תמיד — Free tier, Gemini Flash, Copilot Free",
      color:     "text-green-400",
    },
    {
      type:      "Already-Paid",
      label:     "כבר שילמת",
      available: map.web_sub === "yes" || map.web_sub === "partial" || map.org_access === "yes" || map.student_access === "yes",
      reason:    (map.web_sub === "yes" || map.org_access === "yes") ? "מנוי קיים" : "אין מנוי פעיל",
      color:     "text-emerald-400",
    },
    {
      type:      "Quality-first",
      label:     "איכות מקסימלית",
      available: map.api_key === "yes" || map.web_sub === "yes",
      reason:    (map.api_key === "yes" || map.web_sub === "yes") ? "API/Pro קיים" : "צריך API key או Pro",
      color:     "text-purple-400",
    },
    {
      type:      "Local-only",
      label:     "מקומי בלבד",
      available: map.local_runtime === "yes",
      reason:    map.local_runtime === "yes" ? "Ollama / LM Studio קיים" : "צריך Ollama + מודל",
      color:     "text-orange-400",
    },
    {
      type:      "Org Route",
      label:     "ערוץ ארגוני",
      available: map.org_access === "yes",
      reason:    map.org_access === "yes" ? "גישה ארגונית פעילה" : "אין גישה ארגונית",
      color:     "text-blue-400",
    },
  ];
}

// ─── OllamaPanel (IP2) ────────────────────────────────────────────────────────
function OllamaPanel({
  currentLevel,
  onDetected,
}: {
  currentLevel: AccessLevel;
  onDetected:   (level: AccessLevel) => void;
}) {
  const [status, setStatus] = useState<"idle" | "scanning" | "found" | "not-found">("idle");
  const [models, setModels]  = useState<string[]>([]);
  const [errMsg, setErrMsg]  = useState<string>("");

  const scan = useCallback(async () => {
    setStatus("scanning");
    const result = await detectOllama();
    if (result.running) {
      setModels(result.models);
      setStatus("found");
      onDetected("yes");
    } else {
      setErrMsg(result.error ?? "Ollama לא נמצא");
      setStatus("not-found");
    }
  }, [onDetected]);

  // Auto-scan on mount if local_runtime is already "no" (first time)
  useEffect(() => {
    if (currentLevel === "no") scan();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className={cn(
      "mt-2.5 rounded-xl border px-4 py-3 space-y-2.5 text-sm transition-all",
      status === "found" ? "bg-green-500/5 border-green-500/25" : "bg-secondary/50 border-border/60"
    )}>
      {/* Scan trigger */}
      {status === "idle" && (
        <button
          onClick={scan}
          className="flex items-center gap-2 text-xs font-medium text-primary hover:text-primary/80 transition-colors"
        >
          <Scan className="h-3.5 w-3.5" />
          בדוק אוטומטית — זהה Ollama על המחשב
        </button>
      )}

      {/* Scanning */}
      {status === "scanning" && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          סורק localhost:11434…
        </div>
      )}

      {/* Found */}
      {status === "found" && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-green-400">
            <CheckCircle className="h-3.5 w-3.5" />
            Ollama רץ! {models.length > 0 ? `${models.length} מודלים מותקנים` : ""}
          </div>
          {models.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {models.map(m => (
                <span key={m} className="text-[10px] bg-green-500/10 border border-green-500/20 rounded-full px-2 py-0.5 text-green-300 font-mono">
                  {m}
                </span>
              ))}
            </div>
          )}
          <button
            onClick={scan}
            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
          >
            סרוק מחדש
          </button>
        </div>
      )}

      {/* Not found */}
      {status === "not-found" && (
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <AlertCircle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
            <span>{errMsg}</span>
          </div>
          <div className="rounded-lg bg-secondary border border-border p-2.5 space-y-1.5 text-[11px] text-muted-foreground">
            <p className="font-semibold text-foreground/70">להתקין Ollama:</p>
            <ol className="space-y-1 ps-3 list-decimal">
              <li>הורד מ-<span className="font-mono text-primary/80">ollama.com</span></li>
              <li>הרץ: <span className="font-mono text-primary/80">ollama pull gemma3:4b</span></li>
              <li>חזור ולחץ "סרוק מחדש"</li>
            </ol>
          </div>
          <button
            onClick={scan}
            className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
          >
            <Scan className="h-3 w-3" />
            סרוק מחדש
          </button>
        </div>
      )}
    </div>
  );
}

// ─── AccessCard ───────────────────────────────────────────────────────────────
function AccessCard({
  entry,
  value,
  onChange,
}: {
  entry:    AccessEntry;
  value:    AccessLevel;
  onChange: (level: AccessLevel) => void;
}) {
  const [showTip, setShowTip] = useState(false);
  const Icon    = entry.icon;
  const cfg     = LEVEL_CFG[value];
  const LvlIcon = cfg.icon;
  const isLocal = entry.id === "local_runtime";

  return (
    <div className={cn(
      "rounded-xl border p-4 space-y-3 transition-all",
      value !== "no" ? cn(cfg.bg, cfg.border) : "border-border bg-card"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0 bg-secondary">
            <Icon className={cn("h-4 w-4", entry.color)} />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-semibold">{entry.label}</p>
              {entry.tip && (
                <button onClick={() => setShowTip(s => !s)}>
                  <Info className={cn("h-3.5 w-3.5 transition-colors", showTip ? "text-primary" : "text-muted-foreground/50 hover:text-muted-foreground")} />
                </button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">{entry.sub}</p>
          </div>
        </div>
        <div className={cn("flex items-center gap-1 text-xs font-medium shrink-0", cfg.color)}>
          <LvlIcon className="h-3.5 w-3.5" />
          <span>{cfg.label}</span>
        </div>
      </div>

      {/* Tip */}
      {showTip && entry.tip && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary/80 leading-relaxed">
          💡 {entry.tip}
        </div>
      )}

      {/* Level selector */}
      <div className="flex gap-1.5">
        {(["yes", "partial", "no"] as AccessLevel[]).map((level) => {
          const lc = LEVEL_CFG[level];
          return (
            <button
              key={level}
              onClick={() => onChange(level)}
              className={cn(
                "flex-1 py-1.5 rounded-lg text-xs font-medium border transition-all",
                value === level
                  ? cn(lc.bg, lc.border, lc.color)
                  : "bg-secondary border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
              )}
            >
              {lc.label}
            </button>
          );
        })}
      </div>

      {/* Examples (when active) */}
      {value !== "no" && !isLocal && (
        <div className="flex flex-wrap gap-1">
          {entry.examples.map(ex => (
            <span key={ex} className="text-[10px] bg-secondary border border-border rounded-full px-2 py-0.5 text-muted-foreground">
              {ex}
            </span>
          ))}
        </div>
      )}

      {/* Ollama panel — only for local_runtime */}
      {isLocal && (
        <OllamaPanel
          currentLevel={value}
          onDetected={onChange}
        />
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function AccessMapPage() {
  const [map, setMap]     = useState<AccessMap>(DEFAULT_MAP);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const persisted = scopedRead<AccessMap>(BASE_KEY);
    if (persisted) setMap({ ...DEFAULT_MAP, ...persisted });
  }, []);

  function update(key: keyof AccessMap, value: AccessLevel | string) {
    setMap(prev => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  function save() {
    scopedWrite(BASE_KEY, map);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  }

  const routes        = deriveRoutes(map);
  const availableCount = routes.filter(r => r.available).length;

  return (
    <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
      {/* Header */}
      <header className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
            דשבורד
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">מפת גישה</span>
        </div>

        <Button
          onClick={save}
          size="sm"
          className="gap-2 min-w-[90px]"
          variant={saved ? "secondary" : "default"}
        >
          {saved
            ? <><CheckCircle className="h-3.5 w-3.5 text-green-400" />נשמר!</>
            : <><Save className="h-3.5 w-3.5" />שמור</>
          }
        </Button>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">

          {/* Intro */}
          <div className="space-y-1">
            <h1 className="text-base font-bold">מה יש לך גישה אליו?</h1>
            <p className="text-xs text-muted-foreground leading-relaxed">
              סמן מה ברשותך — המנתב ישתמש בזה כדי להמליץ רק על כלים שתוכל להשתמש בהם.
              <span className="text-muted-foreground/50"> · נשמר מקומית בלבד</span>
            </p>
          </div>

          {/* Route availability — prominent, at top */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-secondary/30 flex items-center justify-between">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">מסלולים פתוחים</h3>
              <span className={cn(
                "text-xs font-semibold px-2 py-0.5 rounded-full",
                availableCount >= 3 ? "bg-green-500/15 text-green-300" :
                availableCount >= 2 ? "bg-yellow-500/15 text-yellow-300" :
                "bg-orange-500/15 text-orange-300"
              )}>
                {availableCount}/{routes.length} זמינים
              </span>
            </div>
            <div className="divide-y divide-border/50">
              {routes.map(route => (
                <div key={route.type} className="flex items-center justify-between px-4 py-2 gap-3">
                  <div className="flex items-center gap-2">
                    {route.available
                      ? <Wifi    className={cn("h-3.5 w-3.5 shrink-0", route.color)} />
                      : <WifiOff className="h-3.5 w-3.5 shrink-0 text-muted-foreground/30" />
                    }
                    <span className={cn("text-xs font-medium", route.available ? "text-foreground" : "text-muted-foreground/40")}>
                      {route.label}
                    </span>
                  </div>
                  <span className={cn("text-[10px] shrink-0", route.available ? route.color : "text-muted-foreground/30")}>
                    {route.reason}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Access cards */}
          <div className="space-y-3">
            {ACCESS_TYPES.map(entry => (
              <AccessCard
                key={entry.id}
                entry={entry}
                value={map[entry.id] as AccessLevel}
                onChange={level => update(entry.id, level)}
              />
            ))}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground">הערות / פרטים (אופציונלי)</label>
            <textarea
              value={map.notes}
              onChange={e => update("notes", e.target.value)}
              placeholder="לדוגמה: יש לי Claude Pro + OpenAI API. המחשב שלי GTX 1070 Ti."
              dir="rtl" rows={2}
              className="w-full resize-none rounded-xl border border-input bg-secondary px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          {/* Save */}
          <Button onClick={save} className="w-full gap-2" size="lg">
            {saved
              ? <><CheckCircle className="h-4 w-4" />הגישה נשמרה!</>
              : <><Save className="h-4 w-4" />שמור מפת גישה</>
            }
          </Button>

          <p className="text-xs text-center text-muted-foreground/50 pb-2">
            נשמר רק על המחשב הזה · אחרי שמירה המנתב ישקול את הגישה שלך
          </p>
        </div>
      </div>
    </div>
  );
}
