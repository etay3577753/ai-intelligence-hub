"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  User, Wrench, MessageSquare, Save, RotateCcw,
  CheckCircle, Loader2, ChevronRight, Brain, Sparkles,
  SlidersHorizontal, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type TechLevel  = "low" | "medium" | "high" | "dev";
type Budget     = "free" | "low" | "medium" | "high";
type Lang       = "he" | "en";
type DetailPref = "quick" | "recommended" | "full_guide";
type ClarifyPref= "always" | "complex_only" | "never";
type ToolPlan   = "free" | "pro" | "api" | "enterprise";

interface SubscribedTool {
  id: string;
  plan: ToolPlan;
}

interface ProfileState {
  name:              string;
  tech_level:        TechLevel;
  monthly_budget:    Budget;
  language:          Lang;
  detail_level:      DetailPref;
  ask_clarification: ClarifyPref;
  include_prompts:   boolean;
  subscriptions:     SubscribedTool[];
  last_updated:      string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Popular tools per ecosystem
// ─────────────────────────────────────────────────────────────────────────────

const ECOSYSTEM_TOOLS: { ecosystem: string; color: string; dot: string; tools: { id: string; name: string; link: string }[] }[] = [
  {
    ecosystem: "Anthropic",
    color: "border-orange-400/30 bg-orange-400/5",
    dot: "bg-orange-400",
    tools: [
      { id: "claude",      name: "Claude",      link: "https://claude.ai" },
      { id: "claude-code", name: "Claude Code", link: "https://claude.ai/claude-code" },
    ],
  },
  {
    ecosystem: "Google",
    color: "border-blue-400/30 bg-blue-400/5",
    dot: "bg-blue-400",
    tools: [
      { id: "gemini",           name: "Gemini",           link: "https://gemini.google.com" },
      { id: "google-ai-studio", name: "Google AI Studio", link: "https://aistudio.google.com" },
      { id: "notebooklm",       name: "NotebookLM",       link: "https://notebooklm.google.com" },
      { id: "gemma4",           name: "Gemma (מקומי)",    link: "https://ai.google.dev/gemma" },
    ],
  },
  {
    ecosystem: "OpenAI",
    color: "border-green-400/30 bg-green-400/5",
    dot: "bg-green-400",
    tools: [
      { id: "chatgpt", name: "ChatGPT", link: "https://chatgpt.com" },
      { id: "sora",    name: "Sora",    link: "https://sora.com" },
    ],
  },
  {
    ecosystem: "Microsoft",
    color: "border-sky-400/30 bg-sky-400/5",
    dot: "bg-sky-400",
    tools: [
      { id: "microsoft-copilot",  name: "Microsoft Copilot",  link: "https://copilot.microsoft.com" },
    ],
  },
  {
    ecosystem: "xAI / Other",
    color: "border-purple-400/30 bg-purple-400/5",
    dot: "bg-purple-400",
    tools: [
      { id: "grok",       name: "Grok",       link: "https://grok.com" },
      { id: "perplexity", name: "Perplexity", link: "https://perplexity.ai" },
      { id: "deepseek",   name: "DeepSeek",   link: "https://chat.deepseek.com" },
    ],
  },
  {
    ecosystem: "פיתוח / Coding",
    color: "border-yellow-400/30 bg-yellow-400/5",
    dot: "bg-yellow-400",
    tools: [
      { id: "cursor",   name: "Cursor",   link: "https://cursor.sh" },
      { id: "windsurf", name: "Windsurf", link: "https://windsurf.ai" },
      { id: "lovable",  name: "Lovable",  link: "https://lovable.dev" },
      { id: "bolt",     name: "Bolt",     link: "https://bolt.new" },
      { id: "replit",   name: "Replit",   link: "https://replit.com" },
    ],
  },
  {
    ecosystem: "אוטומציה",
    color: "border-pink-400/30 bg-pink-400/5",
    dot: "bg-pink-400",
    tools: [
      { id: "n8n",    name: "n8n",    link: "https://n8n.io" },
      { id: "make",   name: "Make",   link: "https://make.com" },
      { id: "zapier", name: "Zapier", link: "https://zapier.com" },
    ],
  },
  {
    ecosystem: "מדיה / יצירה",
    color: "border-rose-400/30 bg-rose-400/5",
    dot: "bg-rose-400",
    tools: [
      { id: "midjourney", name: "Midjourney",  link: "https://midjourney.com" },
      { id: "elevenlabs", name: "ElevenLabs",  link: "https://elevenlabs.io" },
      { id: "runway",     name: "Runway ML",   link: "https://runwayml.com" },
      { id: "suno",       name: "Suno",        link: "https://suno.com" },
      { id: "heygen",     name: "HeyGen",      link: "https://heygen.com" },
    ],
  },
  {
    ecosystem: "פרודוקטיביות",
    color: "border-teal-400/30 bg-teal-400/5",
    dot: "bg-teal-400",
    tools: [
      { id: "notion",   name: "Notion",   link: "https://notion.so" },
      { id: "canva",    name: "Canva",    link: "https://canva.com" },
      { id: "gamma",    name: "Gamma",    link: "https://gamma.app" },
      { id: "genspark", name: "GenSpark", link: "https://genspark.ai" },
    ],
  },
];

const PLAN_OPTIONS: { value: ToolPlan; label: string; color: string }[] = [
  { value: "free",       label: "חינם",       color: "text-muted-foreground" },
  { value: "pro",        label: "Pro",        color: "text-primary" },
  { value: "api",        label: "API",        color: "text-orange-400" },
  { value: "enterprise", label: "Enterprise", color: "text-yellow-400" },
];

const DEFAULTS: ProfileState = {
  name:              "Admin",
  tech_level:        "low",
  monthly_budget:    "low",
  language:          "he",
  detail_level:      "recommended",
  ask_clarification: "complex_only",
  include_prompts:   true,
  subscriptions:     [],
  last_updated:      "",
};

// ─────────────────────────────────────────────────────────────────────────────
// Small helper components
// ─────────────────────────────────────────────────────────────────────────────

function SegmentControl<T extends string>({
  options, value, onChange, cols = 2,
}: {
  options: { value: T; label: string; desc?: string }[];
  value: T;
  onChange: (v: T) => void;
  cols?: number;
}) {
  return (
    <div className={cn("grid gap-2", cols === 2 ? "grid-cols-2" : cols === 3 ? "grid-cols-3" : "grid-cols-4")}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-xl border px-3 py-2.5 text-sm transition-all text-start",
            value === o.value
              ? "border-primary bg-primary/10 text-primary font-medium"
              : "border-border text-muted-foreground hover:border-border/80 hover:bg-accent/40"
          )}
        >
          <div className="font-medium text-xs">{o.label}</div>
          {o.desc && <div className="text-[11px] mt-0.5 opacity-70 leading-tight">{o.desc}</div>}
        </button>
      ))}
    </div>
  );
}

function SectionCard({ icon: Icon, title, children, accent = "primary" }: {
  icon: React.ElementType;
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  const accentMap: Record<string, string> = {
    primary: "text-primary border-primary/20",
    orange:  "text-orange-400 border-orange-400/20",
    blue:    "text-blue-400 border-blue-400/20",
    teal:    "text-teal-400 border-teal-400/20",
  };
  const cls = accentMap[accent] ?? accentMap.primary;
  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className={cn("flex items-center gap-2 px-5 py-3.5 border-b border-border bg-secondary/30", cls.split(" ")[0])}>
        <Icon className={cn("h-4 w-4 shrink-0", cls.split(" ")[0])} />
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="px-5 py-4 space-y-4">{children}</div>
    </div>
  );
}

function FieldLabel({ label, hint }: { label: string; hint?: string }) {
  return (
    <div className="mb-1.5">
      <p className="text-sm font-medium">{label}</p>
      {hint && <p className="text-xs text-muted-foreground mt-0.5">{hint}</p>}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProfileState>(DEFAULTS);
  const [loading, setLoading]   = useState(true);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstLoad = useRef(true);

  // ── Load profile on mount ────────────────────────────────────────────────
  useEffect(() => {
    fetch("/api/user-profile")
      .then((r) => r.json())
      .then((data) => {
        setProfile({
          name:              data.name              ?? DEFAULTS.name,
          tech_level:        (data.tech_level as TechLevel)    ?? DEFAULTS.tech_level,
          monthly_budget:    (data.monthly_budget as Budget)   ?? DEFAULTS.monthly_budget,
          language:          (data.language as Lang)           ?? DEFAULTS.language,
          detail_level:      (data.detail_level as DetailPref) ?? DEFAULTS.detail_level,
          ask_clarification: (data.ask_clarification as ClarifyPref) ?? DEFAULTS.ask_clarification,
          include_prompts:   data.include_prompts  !== false,
          subscriptions:     Array.isArray(data.subscriptions)
            ? (data.subscriptions as SubscribedTool[])
            : [],
          last_updated: data.last_updated ?? "",
        });
        setLoading(false);
        isFirstLoad.current = false;
      })
      .catch(() => { setLoading(false); isFirstLoad.current = false; });
  }, []);

  // ── Autosave — debounced 1.5s after every change ─────────────────────────
  const save = useCallback(async (state: ProfileState) => {
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/user-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name:              state.name,
          tech_level:        state.tech_level,
          monthly_budget:    state.monthly_budget,
          language:          state.language,
          detail_level:      state.detail_level,
          ask_clarification: state.ask_clarification,
          include_prompts:   state.include_prompts,
          subscriptions:     state.subscriptions,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProfile((p) => ({ ...p, last_updated: updated.profile?.last_updated ?? p.last_updated }));
        setSaveStatus("saved");
        setTimeout(() => setSaveStatus("idle"), 2500);
      } else {
        setSaveStatus("error");
      }
    } catch {
      setSaveStatus("error");
    }
  }, []);

  function update<K extends keyof ProfileState>(key: K, value: ProfileState[K]) {
    setProfile((prev) => {
      const next = { ...prev, [key]: value };
      if (isFirstLoad.current) return next;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => save(next), 1500);
      return next;
    });
  }

  // ── Subscription helpers ──────────────────────────────────────────────────
  function isSubscribed(id: string) {
    return profile.subscriptions.some((s) => s.id === id);
  }

  function getToolPlan(id: string): ToolPlan {
    return profile.subscriptions.find((s) => s.id === id)?.plan ?? "free";
  }

  function toggleTool(id: string) {
    setProfile((prev) => {
      let next: SubscribedTool[];
      if (prev.subscriptions.some((s) => s.id === id)) {
        next = prev.subscriptions.filter((s) => s.id !== id);
      } else {
        next = [...prev.subscriptions, { id, plan: "free" }];
      }
      const state = { ...prev, subscriptions: next };
      if (isFirstLoad.current) return state;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => save(state), 1500);
      return state;
    });
  }

  function setToolPlan(id: string, plan: ToolPlan) {
    setProfile((prev) => {
      const next = prev.subscriptions.map((s) =>
        s.id === id ? { ...s, plan } : s
      );
      const state = { ...prev, subscriptions: next };
      if (isFirstLoad.current) return state;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => save(state), 1500);
      return state;
    });
  }

  function handleReset() {
    setProfile(DEFAULTS);
    save(DEFAULTS);
  }

  // ── Formatted date ────────────────────────────────────────────────────────
  const lastUpdatedStr = profile.last_updated
    ? new Date(profile.last_updated).toLocaleString("he-IL", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "—";

  const activeSubCount = profile.subscriptions.filter((s) => s.plan !== "free").length;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden" dir="rtl">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between gap-3 px-5 py-3 border-b border-border bg-card shrink-0">
        <Link href="/">
          <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ChevronRight className="h-4 w-4" />
            חזרה
          </Button>
        </Link>

        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-primary" />
          <h1 className="text-base font-semibold">הגדרות אישיות</h1>
          {activeSubCount > 0 && (
            <span className="bg-primary/10 text-primary border border-primary/30 text-xs px-2 py-0.5 rounded-full font-medium">
              {activeSubCount} מנויים פעילים
            </span>
          )}
        </div>

        {/* Save status indicator */}
        <div className="flex items-center gap-2 min-w-[110px] justify-end">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> שומר…
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1.5 text-xs text-green-400 font-medium">
              <CheckCircle className="h-3.5 w-3.5" /> נשמר ✓
            </span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs text-red-400">שגיאה בשמירה</span>
          )}
          {saveStatus === "idle" && !loading && (
            <span className="text-[11px] text-muted-foreground/50">autosave פעיל</span>
          )}
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────────── */}
      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="flex-1 overflow-auto">
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">

            {/* Intro */}
            <div className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary/5 px-5 py-4">
              <Brain className="h-7 w-7 text-primary shrink-0" />
              <div>
                <p className="text-sm font-semibold">פרופיל המשתמש שלך</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  כל שינוי נשמר אוטומטית • הגדרות אלו משפיעות על כל תשובות הצ׳אט
                </p>
              </div>
            </div>

            {/* ── SECTION 1: פרופיל בסיסי ──────────────────────────────────── */}
            <SectionCard icon={User} title="סעיף 1 — פרופיל בסיסי" accent="primary">

              {/* שם */}
              <div>
                <FieldLabel label="שם תצוגה" hint="כך יפנה אליך הצ׳אט" />
                <input
                  value={profile.name}
                  onChange={(e) => update("name", e.target.value)}
                  placeholder="הכנס שם…"
                  className="w-full rounded-xl border border-input bg-secondary/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {/* רמת טכניות */}
              <div>
                <FieldLabel label="רמת טכניות" hint="משפיעה על רמת ההסברים שתקבל" />
                <SegmentControl
                  cols={4}
                  value={profile.tech_level}
                  onChange={(v) => update("tech_level", v)}
                  options={[
                    { value: "low",    label: "מתחיל",   desc: "ללא קוד" },
                    { value: "medium", label: "בינוני",  desc: "מעט טכני" },
                    { value: "high",   label: "מתקדם",   desc: "מבין קוד" },
                    { value: "dev",    label: "מפתח",    desc: "full-stack" },
                  ]}
                />
              </div>

              {/* תקציב */}
              <div>
                <FieldLabel label="תקציב חודשי לכלי AI" hint="המלצות יתאימו לרמה זו" />
                <SegmentControl
                  cols={4}
                  value={profile.monthly_budget}
                  onChange={(v) => update("monthly_budget", v)}
                  options={[
                    { value: "free",   label: "חינמי בלבד", desc: "$0" },
                    { value: "low",    label: "עד $20",      desc: "Pro tier" },
                    { value: "medium", label: "עד $50",      desc: "כמה מנויים" },
                    { value: "high",   label: "גמיש",        desc: "API + Pro" },
                  ]}
                />
              </div>

              {/* שפה */}
              <div>
                <FieldLabel label="שפת ממשק" />
                <SegmentControl
                  cols={2}
                  value={profile.language}
                  onChange={(v) => update("language", v)}
                  options={[
                    { value: "he", label: "עברית 🇮🇱" },
                    { value: "en", label: "English 🇺🇸" },
                  ]}
                />
              </div>
            </SectionCard>

            {/* ── SECTION 2: מנויים קיימים ─────────────────────────────────── */}
            <SectionCard icon={Wrench} title="סעיף 2 — מנויים קיימים" accent="orange">
              <p className="text-xs text-muted-foreground -mt-1">
                סמן כלים שיש לך גישה אליהם. הצ׳אט יתאים המלצות לפי מה שכבר יש לך.
              </p>

              <div className="space-y-3">
                {ECOSYSTEM_TOOLS.map(({ ecosystem, color, dot, tools }) => (
                  <div key={ecosystem} className={cn("rounded-xl border p-3 space-y-2", color)}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={cn("h-2 w-2 rounded-full shrink-0", dot)} />
                      <span className="text-xs font-semibold text-foreground">{ecosystem}</span>
                    </div>
                    <div className="space-y-1.5">
                      {tools.map((tool) => {
                        const checked = isSubscribed(tool.id);
                        return (
                          <div key={tool.id} className="flex items-center gap-3">
                            {/* Checkbox */}
                            <button
                              type="button"
                              onClick={() => toggleTool(tool.id)}
                              className={cn(
                                "w-4.5 h-4.5 rounded-md border-2 flex items-center justify-center shrink-0 transition-all",
                                checked
                                  ? "bg-primary border-primary"
                                  : "border-border hover:border-primary/60"
                              )}
                              style={{ width: 18, height: 18 }}
                            >
                              {checked && (
                                <svg viewBox="0 0 10 8" fill="none" className="w-2.5 h-2.5">
                                  <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                                </svg>
                              )}
                            </button>

                            {/* Name */}
                            <span className={cn("text-sm flex-1", checked ? "text-foreground" : "text-muted-foreground")}>
                              {tool.name}
                            </span>

                            {/* Plan dropdown — only when checked */}
                            {checked && (
                              <select
                                value={getToolPlan(tool.id)}
                                onChange={(e) => setToolPlan(tool.id, e.target.value as ToolPlan)}
                                dir="ltr"
                                className={cn(
                                  "appearance-none rounded-lg border px-2.5 py-1 text-xs font-medium cursor-pointer transition-all",
                                  "focus:outline-none focus:ring-1 focus:ring-ring bg-card",
                                  getToolPlan(tool.id) === "free"
                                    ? "border-border text-muted-foreground"
                                    : getToolPlan(tool.id) === "pro"
                                    ? "border-primary text-primary"
                                    : getToolPlan(tool.id) === "api"
                                    ? "border-orange-400 text-orange-400"
                                    : "border-yellow-400 text-yellow-400"
                                )}
                              >
                                {PLAN_OPTIONS.map((p) => (
                                  <option key={p.value} value={p.value}>{p.label}</option>
                                ))}
                              </select>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              {activeSubCount > 0 && (
                <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <p className="text-xs text-foreground">
                    <span className="font-semibold text-primary">{activeSubCount} כלים</span> ברמת Pro/API/Enterprise — הצ׳אט ינתב משימות לכלים אלו ראשון
                  </p>
                </div>
              )}
            </SectionCard>

            {/* ── SECTION 3: העדפות תשובה ──────────────────────────────────── */}
            <SectionCard icon={MessageSquare} title="סעיף 3 — העדפות תשובה" accent="teal">

              {/* רמת פירוט */}
              <div>
                <FieldLabel label="רמת פירוט ברירת מחדל" hint="כמה עמוק תרצה שהצ׳אט יענה?" />
                <SegmentControl
                  cols={3}
                  value={profile.detail_level}
                  onChange={(v) => update("detail_level", v)}
                  options={[
                    { value: "quick",       label: "תשובה קצרה",      desc: "מהיר ותמציתי" },
                    { value: "recommended", label: "מנומק",            desc: "עם השוואה" },
                    { value: "full_guide",  label: "מדריך מלא",        desc: "צעד-אחר-צעד" },
                  ]}
                />
              </div>

              {/* שאלות דיוק */}
              <div>
                <FieldLabel label="שאלות דיוק לפני תשובה" hint="האם הצ׳אט ישאל שאלות לפני שיענה?" />
                <SegmentControl
                  cols={3}
                  value={profile.ask_clarification}
                  onChange={(v) => update("ask_clarification", v)}
                  options={[
                    { value: "always",       label: "תמיד",             desc: "לכל שאלה" },
                    { value: "complex_only", label: "רק מורכבות",       desc: "ברירת מחדל" },
                    { value: "never",        label: "לעולם לא",         desc: "ישיר לתשובה" },
                  ]}
                />
              </div>

              {/* פרומפטים */}
              <div>
                <FieldLabel label="פרומפטים מוכנים בתשובות" hint="האם לכלול תבניות copy-paste מוכנות?" />
                <SegmentControl
                  cols={2}
                  value={profile.include_prompts ? "yes" : "no"}
                  onChange={(v) => update("include_prompts", v === "yes")}
                  options={[
                    { value: "yes", label: "כן — כלול פרומפטים",  desc: "מומלץ" },
                    { value: "no",  label: "לא — תשובות בלבד",    desc: "קומפקטי" },
                  ]}
                />
              </div>
            </SectionCard>

            {/* ── SECTION 4: שמירה ─────────────────────────────────────────── */}
            <SectionCard icon={Bell} title="סעיף 4 — שמירה ואיפוס" accent="blue">

              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />
                <span>autosave פעיל — נשמר אוטומטית 1.5 שניות אחרי כל שינוי</span>
              </div>

              {/* Manual save */}
              <Button
                onClick={() => save(profile)}
                disabled={saveStatus === "saving"}
                className="w-full gap-2"
                size="lg"
              >
                {saveStatus === "saving" ? (
                  <><Loader2 className="h-4 w-4 animate-spin" />שומר…</>
                ) : saveStatus === "saved" ? (
                  <><CheckCircle className="h-4 w-4" />נשמר בהצלחה ✓</>
                ) : (
                  <><Save className="h-4 w-4" />שמור הגדרות</>
                )}
              </Button>

              {/* Reset */}
              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full gap-2 text-muted-foreground hover:text-foreground"
                size="sm"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                אפס הכל לברירות מחדל
              </Button>

              {/* Last updated */}
              <div className="text-center text-xs text-muted-foreground/60 pt-1 border-t border-border">
                עודכן לאחרונה: {lastUpdatedStr}
              </div>
            </SectionCard>

            {/* Link to toolbox settings */}
            <div className="rounded-xl border border-border bg-card/50 px-5 py-3.5 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">הגדרות ארגז הכלים</p>
                <p className="text-xs text-muted-foreground mt-0.5">רמות מנוי מפורטות, Master Brain, אקוסיסטמים</p>
              </div>
              <Link href="/settings/tools">
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Wrench className="h-3.5 w-3.5" />
                  פתח
                </Button>
              </Link>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
