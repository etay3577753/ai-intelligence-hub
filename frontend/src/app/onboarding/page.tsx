"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  scopedWrite, getUserPreferences,
  type UserPreferences, type AccessMap,
  NEUTRAL_PREFERENCES, NEUTRAL_ACCESS_MAP,
} from "@/lib/user-profile";

// ─── שלב 1: רמת ניסיון ───────────────────────────────────────────────────────
const LEVELS = [
  { value: "מתחיל",  emoji: "🌱", desc: "אני לא מפתח — רוצה שהמערכת תסביר בפשטות" },
  { value: "בינוני", emoji: "🔧", desc: "יש לי קצת ניסיון — מכיר כלים בסיסיים" },
  { value: "מנוסה",  emoji: "🚀", desc: "מפתח/ת פעיל/ה — רוצה תשובות ישירות" },
] as const;

// ─── שלב 2: כלים שיש לי ──────────────────────────────────────────────────────
const COMMON_TOOLS = [
  { id: "chatgpt_plus",   label: "ChatGPT Plus",      icon: "💬" },
  { id: "claude_pro",     label: "Claude Pro",         icon: "🤖" },
  { id: "gemini_adv",     label: "Gemini Advanced",    icon: "✨" },
  { id: "copilot_free",   label: "GitHub Copilot",     icon: "🐙" },
  { id: "cursor",         label: "Cursor IDE",         icon: "🖱️" },
  { id: "anthropic_api",  label: "Anthropic API Key",  icon: "🔑" },
  { id: "openai_api",     label: "OpenAI API Key",     icon: "🔑" },
  { id: "ollama",         label: "Ollama (מקומי)",     icon: "💻" },
  { id: "none",           label: "עדיין אין לי כלום",  icon: "0️⃣" },
] as const;

// ─── שלב 3: מה הכי חשוב ──────────────────────────────────────────────────────
const PRIORITIES = [
  { value: "מהירות",       emoji: "⚡", desc: "רוצה תוצאה מהר ככל האפשר" },
  { value: "עלות נמוכה",   emoji: "💰", desc: "מינימום הוצאות — עדיף חינמי" },
  { value: "איכות גבוהה",  emoji: "⭐", desc: "לא מתפשר/ת על האיכות" },
  { value: "שליטה מלאה",   emoji: "🎛️", desc: "רוצה להבין כל שלב, לא רק לקבל תוצאה" },
] as const;

type Level    = typeof LEVELS[number]["value"];
type Priority = typeof PRIORITIES[number]["value"];

export default function OnboardingPage() {
  const router  = useRouter();
  const [step,     setStep]     = useState(1);
  const [level,    setLevel]    = useState<Level | "">("");
  const [tools,    setTools]    = useState<Set<string>>(new Set());
  const [priority, setPriority] = useState<Priority | "">("");

  function toggleTool(id: string) {
    setTools(prev => {
      const next = new Set(prev);
      if (id === "none") return new Set(["none"]);
      next.delete("none");
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function finish() {
    // שמור preferences
    const prefs: UserPreferences = {
      ...NEUTRAL_PREFERENCES,
      knowledge_level: (level || "מתחיל") as UserPreferences["knowledge_level"],
      preferred_priority: (priority || "מהירות") as UserPreferences["preferred_priority"],
      onboarding_done: true,
    };
    scopedWrite("user_preferences", prefs);

    // שמור access map על בסיס הכלים שנבחרו
    const accessMap: AccessMap = { ...NEUTRAL_ACCESS_MAP };
    if (tools.has("chatgpt_plus") || tools.has("claude_pro") || tools.has("gemini_adv")) {
      accessMap.web_sub = "yes";
    }
    if (tools.has("anthropic_api") || tools.has("openai_api")) {
      accessMap.api_key = "yes";
    }
    if (tools.has("ollama")) {
      accessMap.local_runtime = "yes";
    }
    scopedWrite("user_access_map", accessMap);

    router.push("/");
  }

  const TOTAL = 3;
  const progress = (step / TOTAL) * 100;

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-6">

        {/* Header */}
        <div className="text-center space-y-2">
          <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Brain className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-lg font-bold">הגדרה ראשונית</h1>
          <p className="text-xs text-muted-foreground">3 שאלות קצרות · כדי שהמלצות יהיו מדויקות עבורך</p>
        </div>

        {/* Progress */}
        <div className="space-y-1">
          <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-[10px] text-muted-foreground text-end">שלב {step} מתוך {TOTAL}</p>
        </div>

        {/* ── שלב 1 ── */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-center">מה רמת הניסיון הטכני שלך?</h2>
            <div className="space-y-2">
              {LEVELS.map(({ value, emoji, desc }) => (
                <button
                  key={value}
                  onClick={() => setLevel(value)}
                  className={cn(
                    "w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-start transition-all",
                    level === value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  )}
                >
                  <span className="text-xl">{emoji}</span>
                  <div>
                    <p className="text-sm font-semibold">{value}</p>
                    <p className="text-xs">{desc}</p>
                  </div>
                  {level === value && <CheckCircle className="h-4 w-4 text-primary ms-auto shrink-0 mt-0.5" />}
                </button>
              ))}
            </div>
            <Button onClick={() => setStep(2)} disabled={!level} className="w-full gap-2">
              המשך <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        )}

        {/* ── שלב 2 ── */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-center">אילו כלי AI יש לך כרגע?</h2>
            <p className="text-xs text-muted-foreground text-center">בחר הכל שרלוונטי — זה משפיע ישירות על ההמלצות</p>
            <div className="grid grid-cols-2 gap-2">
              {COMMON_TOOLS.map(({ id, label, icon }) => (
                <button
                  key={id}
                  onClick={() => toggleTool(id)}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-start text-xs transition-all",
                    tools.has(id)
                      ? "border-primary bg-primary/10 text-foreground font-medium"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                  {tools.has(id) && <CheckCircle className="h-3 w-3 text-primary ms-auto shrink-0" />}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)} className="flex-1">חזור</Button>
              <Button onClick={() => setStep(3)} disabled={tools.size === 0} className="flex-1 gap-2">
                המשך <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* ── שלב 3 ── */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-center">מה הכי חשוב לך בכלי AI?</h2>
            <div className="space-y-2">
              {PRIORITIES.map(({ value, emoji, desc }) => (
                <button
                  key={value}
                  onClick={() => setPriority(value)}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl border px-4 py-3 text-start transition-all",
                    priority === value
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-primary/30 hover:text-foreground"
                  )}
                >
                  <span className="text-xl">{emoji}</span>
                  <div>
                    <p className="text-sm font-semibold">{value}</p>
                    <p className="text-xs">{desc}</p>
                  </div>
                  {priority === value && <CheckCircle className="h-4 w-4 text-primary ms-auto shrink-0" />}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)} className="flex-1">חזור</Button>
              <Button onClick={finish} disabled={!priority} className="flex-1 gap-2">
                <CheckCircle className="h-4 w-4" />
                כנס למערכת
              </Button>
            </div>
          </div>
        )}

        <p className="text-center text-[10px] text-muted-foreground/50">
          ניתן לשנות הכל בהגדרות בכל עת
        </p>
      </div>
    </div>
  );
}
