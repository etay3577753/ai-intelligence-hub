"use client";

import { useState } from "react";
import {
  ChevronRight, ChevronDown, ChevronUp, Copy, Check,
  Loader2, Workflow, Zap, ArrowRight, RefreshCw, ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { RouteResult, DecisionReceipt, ContradictionResult } from "@/app/api/task-router/route";
import { getUserAccessMap, getUserPreferences, type AccessMap } from "@/lib/user-profile";

// ─── Access Guard ─────────────────────────────────────────────────────────────
/**
 * Tools that require a paid web subscription to be useful.
 * Free tiers do NOT count — these are the paid/pro versions only.
 */
const REQUIRES_WEB_SUB = new Set([
  "claude pro", "claude.ai pro", "chatgpt plus", "chatgpt pro",
  "gemini advanced", "copilot pro", "perplexity pro",
]);

/**
 * Tools that require a local runtime (Ollama / LM Studio / llama.cpp).
 */
const REQUIRES_LOCAL_RUNTIME = new Set([
  "gemma 4", "gemma 4 (local)", "gemma4", "ollama", "lm studio",
  "llama.cpp", "jan.ai", "localai",
]);

/**
 * Tools that require an API key (pay-per-use, not a chat subscription).
 */
const REQUIRES_API_KEY = new Set([
  "claude code", "anthropic api", "openai api", "openai assistants api",
  "aider", "cline", "aider/cline",
]);

function toolBlocked(toolName: string, map: AccessMap): string | null {
  const lower = toolName.toLowerCase();

  if (REQUIRES_LOCAL_RUNTIME.has(lower) && map.local_runtime !== "yes") {
    return `${toolName} מצריך Runtime מקומי (Ollama/LM Studio) — לא הוגדר`;
  }
  if (REQUIRES_WEB_SUB.has(lower) && map.web_sub === "no") {
    return `${toolName} מצריך מנוי בתשלום — לא הוגדר`;
  }
  if (REQUIRES_API_KEY.has(lower) && map.api_key === "no") {
    return `${toolName} מצריך API Key — לא הוגדר`;
  }
  return null;
}

function filterRoutes(routes: RouteResult[], map: AccessMap): RouteResult[] {
  return routes.filter((route) => {
    // Block "Already-Paid" when user has no paid access at all
    if (route.routeType === "Already-Paid") {
      const hasPaidAccess =
        map.web_sub !== "no" ||
        map.api_key !== "no" ||
        map.org_access === "yes" ||
        map.student_access === "yes";
      if (!hasPaidAccess) return false;
    }

    // Block "Local-only" when user has no local runtime
    if (route.routeType === "Local-only" && map.local_runtime !== "yes") {
      return false;
    }

    // Block specific tools the user cannot access
    if (toolBlocked(route.toolName, map)) return false;

    return true;
  });
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PROJECT_TYPES = [
  "אתר / אפליקציה Web",
  "אפליקציית Mobile",
  "סקריפט / אוטומציה",
  "בוט / API",
  "מחקר / כתיבה",
  "עיצוב / UI",
  "ניתוח נתונים",
  "אחר",
];

const EXPERIENCE_LEVELS = [
  { label: "מתחיל", sub: "ללא ניסיון בקוד" },
  { label: "בינוני", sub: "קצת ניסיון" },
  { label: "מנוסה", sub: "מפתח/ת אקטיבי/ת" },
];

const PRIVACY_OPTIONS = [
  { label: "ענן — בסדר", sub: "קוד ונתונים יכולים לעלות לשרת", icon: "☁️" },
  { label: "מקומי בלבד", sub: "הכל נשאר על המחשב שלי", icon: "🔒" },
];

const PRIORITY_OPTIONS = [
  { label: "מהירות", sub: "רוצה תוצאה מהר", icon: "⚡" },
  { label: "עלות נמוכה", sub: "מינימום הוצאות", icon: "💰" },
  { label: "איכות גבוהה", sub: "לא מתפשר/ת", icon: "⭐" },
  { label: "שליטה מלאה", sub: "רוצה להבין כל שלב", icon: "🎛️" },
];

const ROUTE_TYPE_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  "Quality-first":  { label: "איכות מקסימלית", color: "text-purple-300",  bg: "bg-purple-500/10",  border: "border-purple-500/30" },
  "Cheapest":       { label: "הזול ביותר",      color: "text-green-300",   bg: "bg-green-500/10",   border: "border-green-500/30"  },
  "Already-Paid":   { label: "כבר שילמת",       color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/30" },
  "Local-only":     { label: "מקומי בלבד",      color: "text-orange-300",  bg: "bg-orange-500/10",  border: "border-orange-500/30" },
  "Fastest":        { label: "הכי מהיר",        color: "text-yellow-300",  bg: "bg-yellow-500/10",  border: "border-yellow-500/30" },
};

type Stage = "input" | "filters" | "loading" | "clarification" | "results";

interface Answers {
  type:       string;
  experience: string;
  privacy:    string;
  priority:   string;
  freeText:   string;   // WP5 — optional free-text context
}

interface TaskResult {
  summary: string;
  routes: RouteResult[];
  decisionReceipt: DecisionReceipt;
  model: string;
}

// ─── CopyButton ───────────────────────────────────────────────────────────────
function CopyButton({ text, label = "העתק פרומפט" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      }}
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
        copied
          ? "bg-green-500/20 text-green-300 border border-green-500/30"
          : "bg-secondary text-muted-foreground hover:text-foreground border border-border hover:border-primary/40"
      )}
    >
      {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
      {copied ? "הועתק!" : label}
    </button>
  );
}

// ─── ConfidenceBar ────────────────────────────────────────────────────────────
function ConfidenceBar({ value }: { value: number }) {
  const color = value >= 80 ? "bg-green-500" : value >= 60 ? "bg-yellow-500" : "bg-orange-500";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all", color)} style={{ width: `${value}%` }} />
      </div>
      <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">{value}%</span>
    </div>
  );
}

// ─── HandoffSection (WP4) ─────────────────────────────────────────────────────
function HandoffSection({ steps, defaultOpen }: { steps: string[]; defaultOpen: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  if (!steps || steps.length === 0) return null;

  return (
    <div className="border-t border-border/50 pt-3 space-y-2">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
      >
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        📋 איך מתחילים עכשיו
      </button>

      {open && (
        <ol className="space-y-2 ps-1">
          {steps.map((step, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-foreground/80">
              <span className="shrink-0 h-4 w-4 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

// ─── RouteCard ────────────────────────────────────────────────────────────────
function RouteCard({ route, isPrimary }: { route: RouteResult; isPrimary: boolean }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const cfg = ROUTE_TYPE_CONFIG[route.routeType] ?? ROUTE_TYPE_CONFIG["Quality-first"];

  return (
    <div className={cn(
      "rounded-2xl border p-5 space-y-4 transition-all",
      isPrimary ? "border-primary/40 bg-primary/5" : "border-border bg-card"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            {isPrimary && (
              <span className="text-[10px] font-bold bg-primary text-primary-foreground px-2 py-0.5 rounded-full">
                המלצה ראשית
              </span>
            )}
            <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", cfg.color, cfg.bg, cfg.border)}>
              {cfg.label}
            </span>
          </div>
          <h3 className="text-lg font-bold">{route.toolName}</h3>
        </div>
        <div className="text-end shrink-0">
          {/* WP3: "מתאים לך" instead of bare "%" */}
          <p className="text-xs text-muted-foreground">מתאים לך</p>
          <p className="text-xl font-bold text-primary">{route.confidence}%</p>
        </div>
      </div>

      {/* Confidence bar */}
      <ConfidenceBar value={route.confidence} />

      {/* Why */}
      <p className="text-sm text-foreground/80 leading-relaxed">{route.why}</p>

      {/* Pros / Cons */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          {route.pros.map((p, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-green-300">
              <span className="shrink-0 mt-0.5">✅</span><span>{p}</span>
            </div>
          ))}
        </div>
        <div className="space-y-1.5">
          {route.cons.map((c, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs text-orange-300">
              <span className="shrink-0 mt-0.5">⚠️</span><span>{c}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Meta */}
      <div className="flex gap-3 flex-wrap text-xs text-muted-foreground border-t border-border/50 pt-3">
        <span>💰 {route.estimatedCost}</span>
        <span><ShieldCheck className="inline h-3 w-3 me-0.5" />{route.privacyNote}</span>
      </div>

      {/* Prompt */}
      <div className="space-y-2">
        <button
          onClick={() => setShowPrompt(s => !s)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showPrompt ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          {showPrompt ? "הסתר פרומפט" : "הצג פרומפט מוכן לשימוש"}
        </button>

        {showPrompt && (
          <div className="space-y-2">
            <pre className="bg-secondary rounded-lg p-3 text-xs font-mono text-foreground overflow-x-auto whitespace-pre-wrap border border-border leading-relaxed">
              {route.prompt}
            </pre>
            <CopyButton text={route.prompt} />
          </div>
        )}
      </div>

      {/* WP4: Guided handoff — open by default for primary route */}
      <HandoffSection steps={route.handoff_steps} defaultOpen={isPrimary} />
    </div>
  );
}

// ─── DecisionReceiptCard ──────────────────────────────────────────────────────
function DecisionReceiptCard({ receipt }: { receipt: DecisionReceipt }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm hover:bg-accent/30 transition-colors"
      >
        <span className="font-medium flex items-center gap-2">
          📋 קבלת החלטה — שקיפות מלאה על הבחירה
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-border">
          <div className="pt-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">מה הובן</p>
            <p className="text-sm">{receipt.understood}</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">פקטורים שנשקלו</p>
            <div className="flex flex-wrap gap-1.5">
              {receipt.factors.map((f, i) => (
                <span key={i} className="text-xs bg-secondary px-2 py-1 rounded-full border border-border">{f}</span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">למה נבחרה ההמלצה הראשית</p>
            <p className="text-sm">{receipt.primaryChoice}</p>
          </div>

          {receipt.rejected.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">מסלולים שנפסלו</p>
              <div className="space-y-1">
                {receipt.rejected.map((r, i) => (
                  <p key={i} className="text-xs text-muted-foreground">❌ {r}</p>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs text-muted-foreground">רמת ביטחון:</span>
            <span className={cn(
              "text-xs font-semibold px-2 py-0.5 rounded-full",
              receipt.confidence === "גבוה" ? "bg-green-500/20 text-green-300" :
              receipt.confidence === "בינוני" ? "bg-yellow-500/20 text-yellow-300" :
              "bg-orange-500/20 text-orange-300"
            )}>
              {receipt.confidence}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TaskRouterPage() {
  const [stage, setStage]   = useState<Stage>("input");
  const [task, setTask]     = useState("");
  const [answers, setAnswers] = useState<Answers>({
    type:       "",
    experience: "",
    privacy:    "",
    priority:   "",
    freeText:   "",
  });
  const [result, setResult]             = useState<TaskResult | null>(null);
  const [error, setError]               = useState<string | null>(null);
  const [clarification, setClarification] = useState<ContradictionResult | null>(null);

  function setAnswer(key: keyof Answers, val: string) {
    setAnswers(prev => ({ ...prev, [key]: val }));
  }

  const answersComplete = answers.type && answers.experience && answers.privacy && answers.priority;

  /**
   * Core fetch function — accepts explicit answers/accessMap overrides so we can
   * apply clarification decisions without waiting for state to flush.
   */
  async function runWithAnswers(
    finalAnswers:     Answers,
    accessMapOverride?: Partial<ReturnType<typeof getUserAccessMap>>,
    skipContradictionCheck = false,
  ) {
    setStage("loading");
    setError(null);
    try {
      const baseMap   = getUserAccessMap();
      const accessMap = accessMapOverride ? { ...baseMap, ...accessMapOverride } : baseMap;
      const prefs     = getUserPreferences();
      const res = await fetch("/api/task-router", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          task,
          answers:      finalAnswers,
          accessMap,
          knowledgeLevel: prefs.knowledge_level,
          freeText:       finalAnswers.freeText,
          skipContradictionCheck,
        }),
      });
      const data = await res.json();

      // IP1: Server detected a contradiction → show clarification UI
      if (data.clarification_needed) {
        setClarification(data as ContradictionResult);
        setStage("clarification");
        return;
      }

      if (data.error) { setError(data.error); setStage("filters"); return; }
      setResult(data as TaskResult);
      setStage("results");
    } catch (e) {
      setError(String(e));
      setStage("filters");
    }
  }

  function runRecommendation() {
    return runWithAnswers(answers);
  }

  /**
   * IP1: Handles user's selection in the clarification stage.
   * Applies the chosen action (update answers / override access map) then re-runs.
   */
  function handleClarificationAction(action: string) {
    setClarification(null);

    switch (action) {
      case "set_privacy_cloud": {
        const updated = { ...answers, privacy: "ענן — בסדר" };
        setAnswers(updated);
        runWithAnswers(updated);
        break;
      }
      case "set_experience_intermediate": {
        const updated = { ...answers, experience: "בינוני" };
        setAnswers(updated);
        runWithAnswers(updated);
        break;
      }
      case "install_ollama": {
        // Treat runtime as available + inject installation instruction into freeText
        const ollamaNote = "[המשתמש רוצה להתקין Ollama — כלול מדריך התקנה מפורט ב-handoff steps: הורדה מ-ollama.com, הפעלה, הורדת מודל]";
        const updated = {
          ...answers,
          freeText: answers.freeText ? `${answers.freeText}\n${ollamaNote}` : ollamaNote,
        };
        setAnswers(updated);
        // Override local_runtime to "yes" so the AI recommends local tools + generates install guide
        runWithAnswers(updated, { local_runtime: "yes" }, true);
        break;
      }
      case "keep_experience":
      case "proceed_limited":
      default:
        // User confirmed their choice as-is — skip the check this time
        runWithAnswers(answers, undefined, true);
        break;
    }
  }

  function reset() {
    setStage("input");
    setTask("");
    setAnswers({ type: "", experience: "", privacy: "", priority: "", freeText: "" });
    setResult(null);
    setError(null);
    setClarification(null);
  }

  // ── Stage: Clarification (IP1) ────────────────────────────────────────────
  const ClarificationStage = clarification && (
    <div className="flex flex-col h-full overflow-auto px-6 py-8 gap-6 max-w-2xl mx-auto w-full">
      {/* Back button */}
      <button
        onClick={() => { setClarification(null); setStage("filters"); }}
        className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start"
      >
        <ChevronRight className="h-4 w-4" />
        חזור לשאלות
      </button>

      {/* Icon + Title */}
      <div className="text-center space-y-3">
        <div className="h-14 w-14 rounded-2xl bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto text-2xl">
          🤔
        </div>
        <div className="space-y-1">
          <h2 className="text-base font-bold">{clarification.question}</h2>
          <p className="text-sm text-muted-foreground leading-relaxed max-w-sm mx-auto">
            {clarification.context}
          </p>
        </div>
      </div>

      {/* Task preview */}
      <div className="rounded-xl bg-secondary border border-border px-4 py-3 text-xs text-muted-foreground italic line-clamp-2">
        &ldquo;{task}&rdquo;
      </div>

      {/* Options */}
      <div className="space-y-3">
        {clarification.options.map((opt) => (
          <button
            key={opt.action}
            onClick={() => handleClarificationAction(opt.action)}
            className={cn(
              "w-full rounded-xl border px-4 py-4 text-start transition-all group",
              "bg-secondary border-border hover:border-primary/50 hover:bg-primary/5",
            )}
          >
            <p className="text-sm font-semibold group-hover:text-foreground">{opt.label}</p>
            {opt.sub && (
              <p className="text-xs text-muted-foreground mt-0.5">{opt.sub}</p>
            )}
          </button>
        ))}
      </div>

      {/* Contradiction badge */}
      <div className="flex items-center gap-2 justify-center text-xs text-muted-foreground/60">
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-semibold border",
          clarification.contradictionCase === "A"
            ? "bg-orange-500/10 text-orange-400 border-orange-500/20"
            : "bg-blue-500/10 text-blue-400 border-blue-500/20",
        )}>
          {clarification.contradictionCase === "A" ? "סתירה: פרטיות ↔ גישה" : "סתירה: ניסיון ↔ תיאור"}
        </span>
      </div>
    </div>
  );

  // ── Stage: Input ──────────────────────────────────────────────────────────
  const InputStage = (
    <div className="flex flex-col items-center justify-center h-full px-6 py-10 gap-8">
      <div className="text-center space-y-2">
        <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
          <Workflow className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-xl font-bold">מנתב משימות AI</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          תאר את מה שתרצה לבנות או לעשות — אנחנו נשאל כמה שאלות קצרות ונמליץ על הכלים הנכונים עם פרומפטים מוכנים
        </p>
      </div>

      <div className="w-full max-w-2xl space-y-4">
        <textarea
          value={task}
          onChange={e => setTask(e.target.value)}
          placeholder="לדוגמה: רוצה לבנות אתר לעסק קטן שמציג שירותים ויש בו טופס יצירת קשר ופאנל ניהול פשוט..."
          dir="rtl"
          rows={5}
          className="w-full resize-none rounded-xl border border-input bg-secondary px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button
          onClick={() => task.trim() && setStage("filters")}
          disabled={!task.trim()}
          className="w-full gap-2"
          size="lg"
        >
          המשך לכוונון
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // ── Stage: Filters ────────────────────────────────────────────────────────
  const FilterStage = (
    <div className="flex flex-col h-full overflow-auto px-6 py-6 gap-6 max-w-3xl mx-auto w-full">
      <div className="flex items-center gap-2">
        <button onClick={() => setStage("input")} className="text-muted-foreground hover:text-foreground transition-colors">
          <ChevronRight className="h-5 w-5" />
        </button>
        <div>
          <h2 className="text-base font-bold">כוונון מהיר</h2>
          <p className="text-xs text-muted-foreground">4 שאלות → 30 שניות → המלצה מדויקת</p>
        </div>
      </div>

      {/* Task preview */}
      <div className="rounded-xl bg-secondary border border-border px-4 py-3 text-sm text-muted-foreground line-clamp-2 italic">
        &ldquo;{task}&rdquo;
      </div>

      {error && (
        <div className="rounded-xl bg-destructive/20 border border-destructive/40 px-4 py-3 text-sm text-destructive">
          ❌ {error}
        </div>
      )}

      {/* Filter 1: Project type */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">1. מה אתה רוצה לבנות או לעשות?</p>
        <div className="flex flex-wrap gap-2">
          {PROJECT_TYPES.map(t => (
            <button
              key={t}
              onClick={() => setAnswer("type", t)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium border transition-all",
                answers.type === t
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-secondary text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Filter 2: Experience */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">2. כמה אתה מכיר קוד ו-AI?</p>
        <div className="grid grid-cols-3 gap-2">
          {EXPERIENCE_LEVELS.map(({ label, sub }) => (
            <button
              key={label}
              onClick={() => setAnswer("experience", label)}
              className={cn(
                "rounded-xl border px-3 py-3 text-start transition-all",
                answers.experience === label
                  ? "bg-primary/10 border-primary text-foreground"
                  : "bg-secondary border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-[11px]">{sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Filter 3: Privacy */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">3. האם המידע רגיש?</p>
        <div className="grid grid-cols-2 gap-2">
          {PRIVACY_OPTIONS.map(({ label, sub, icon }) => (
            <button
              key={label}
              onClick={() => setAnswer("privacy", label)}
              className={cn(
                "rounded-xl border px-3 py-3 text-start transition-all",
                answers.privacy === label
                  ? "bg-primary/10 border-primary text-foreground"
                  : "bg-secondary border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              <p className="text-base">{icon}</p>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-[11px]">{sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Filter 4: Priority */}
      <div className="space-y-2">
        <p className="text-sm font-semibold">4. מה העדיפות העיקרית?</p>
        <div className="grid grid-cols-2 gap-2">
          {PRIORITY_OPTIONS.map(({ label, sub, icon }) => (
            <button
              key={label}
              onClick={() => setAnswer("priority", label)}
              className={cn(
                "rounded-xl border px-3 py-3 text-start transition-all",
                answers.priority === label
                  ? "bg-primary/10 border-primary text-foreground"
                  : "bg-secondary border-border text-muted-foreground hover:border-primary/40 hover:text-foreground"
              )}
            >
              <p className="text-base">{icon}</p>
              <p className="text-sm font-semibold">{label}</p>
              <p className="text-[11px]">{sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* WP5: Free-text clarification */}
      <div className="space-y-2">
        <p className="text-sm font-semibold text-muted-foreground">5. משהו נוסף? <span className="font-normal">(אופציונלי)</span></p>
        <textarea
          value={answers.freeText}
          onChange={e => setAnswer("freeText", e.target.value)}
          placeholder="לדוגמה: אני עובד בחברה עם Microsoft 365 / יש לי Mac / אני לא מתכנת / הפרויקט לשימוש פנימי בלבד..."
          dir="rtl"
          rows={2}
          className="w-full resize-none rounded-xl border border-input bg-secondary/60 px-4 py-2.5 text-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <Button
        onClick={runRecommendation}
        disabled={!answersComplete}
        className="w-full gap-2"
        size="lg"
      >
        <Workflow className="h-4 w-4" />
        קבל המלצות מותאמות אישית
        <ArrowRight className="h-4 w-4" />
      </Button>
    </div>
  );

  // ── Stage: Loading ────────────────────────────────────────────────────────
  const LoadingStage = (
    <div className="flex flex-col items-center justify-center h-full gap-6 text-center">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 text-primary animate-spin" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-base font-bold">מנתח ומתאים המלצות…</h3>
        <p className="text-sm text-muted-foreground">בודק את הכלים בוויקי מול הפרויקט שלך</p>
      </div>
      <div className="flex gap-1.5">
        {[0,1,2].map(i => (
          <div key={i} className="h-2 w-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
        ))}
      </div>
    </div>
  );

  // ── Stage: Results ────────────────────────────────────────────────────────
  const ResultsStage = result && (() => {
    // Deterministic access guard — runs once per render, pure function
    const userAccessMap = getUserAccessMap();
    const visibleRoutes = filterRoutes(result.routes, userAccessMap);
    const blockedCount  = result.routes.length - visibleRoutes.length;

    return (
    <div className="flex flex-col h-full overflow-auto px-6 py-6 gap-6 max-w-3xl mx-auto w-full">
      {/* Top bar */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-base font-bold">המלצות מותאמות אישית</h2>
          <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
            <Zap className="h-2.5 w-2.5 text-primary" />{result.model}
          </div>
        </div>
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          פרויקט חדש
        </button>
      </div>

      {/* Summary */}
      <div className="rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 space-y-1">
        <p className="text-xs font-semibold text-primary uppercase tracking-wide">✅ הבנתי</p>
        <p className="text-sm leading-relaxed">{result.summary}</p>
      </div>

      {/* Filtered notice */}
      {blockedCount > 0 && (
        <div className="rounded-xl bg-yellow-500/5 border border-yellow-500/20 px-4 py-2.5 flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-yellow-400 shrink-0" />
          <p className="text-xs text-yellow-300/80">
            {blockedCount} המלצה{blockedCount > 1 ? "ות" : ""} הוסרה{blockedCount > 1 ? "ו" : ""} — מצריכה כלים שלא הוגדרו במפת הגישה שלך
          </p>
        </div>
      )}

      {/* Routes */}
      <div className="space-y-4">
        {visibleRoutes.length > 0
          ? visibleRoutes.map((route, i) => (
              <RouteCard key={i} route={route} isPrimary={i === 0} />
            ))
          : (
            <div className="rounded-xl border border-border bg-secondary/40 px-5 py-8 text-center space-y-2">
              <p className="text-sm font-semibold">אין המלצות זמינות עם הגישה הנוכחית שלך</p>
              <p className="text-xs text-muted-foreground">
                עדכן את מפת הגישה שלך ← הוסף כלים שברשותך ← חזור ונסה שוב
              </p>
            </div>
          )
        }
      </div>

      {/* Decision Receipt */}
      <DecisionReceiptCard receipt={result.decisionReceipt} />

      {/* Footer: go to chat */}
      <div className="rounded-xl bg-secondary border border-border px-4 py-3 flex items-center justify-between gap-3 shrink-0">
        <p className="text-xs text-muted-foreground">
          בחרת כלי? כנס לצ׳אט לקבל ליווי מדויק ושאלות המשך
        </p>
        <Link href="/chat">
          <Button size="sm" variant="outline" className="gap-1.5 text-xs shrink-0">
            פתח יועץ AI
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </div>
    );
  })();

  // ─── Render ───────────────────────────────────────────────────────────────
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
          <Workflow className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">מנתב משימות</span>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1.5">
          {(["input", "filters", "results"] as const).map((s, i) => (
            <div
              key={s}
              className={cn(
                "h-1.5 rounded-full transition-all",
                stage === s || (stage === "loading" && s === "filters")
                  ? "w-6 bg-primary"
                  : stage === "results" || (i < ["input","filters","loading"].indexOf(stage))
                    ? "w-3 bg-primary/40"
                    : "w-3 bg-border"
              )}
            />
          ))}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {stage === "input"         && InputStage}
        {stage === "filters"       && FilterStage}
        {stage === "loading"       && LoadingStage}
        {stage === "clarification" && ClarificationStage}
        {stage === "results"       && ResultsStage}
      </div>
    </div>
  );
}
