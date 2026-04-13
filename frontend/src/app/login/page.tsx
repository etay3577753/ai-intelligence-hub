"use client";

import { useRouter } from "next/navigation";
import { Brain, Shield, User, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  setCurrentUser, getUserPreferences,
  ADMIN_ID, GUEST_ID,
} from "@/lib/user-profile";

export default function LoginPage() {
  const router = useRouter();

  function enterAs(userId: typeof ADMIN_ID | typeof GUEST_ID) {
    setCurrentUser(userId);

    if (userId === GUEST_ID) {
      // בדוק אם כבר עשה onboarding
      const prefs = getUserPreferences();
      if (!prefs.onboarding_done) {
        router.push("/onboarding");
        return;
      }
    }
    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">

        {/* לוגו */}
        <div className="text-center space-y-3">
          <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
            <Brain className="h-8 w-8 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">מרכז הבינה המלאכותית</h1>
            <p className="text-sm text-muted-foreground mt-1">AI Orchestrator Protocol — שלב 1</p>
          </div>
        </div>

        {/* כרטיסי כניסה */}
        <div className="space-y-3">

          {/* Google — בקרוב */}
          <div className="w-full flex items-center justify-center gap-3 rounded-xl border border-border bg-card/50 px-4 py-3 text-sm text-muted-foreground/50 cursor-not-allowed select-none">
            <svg className="h-4 w-4 opacity-50" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            <span>התחבר עם Google</span>
            <span className="text-[10px] bg-secondary rounded px-1.5 py-0.5 ms-auto">בקרוב — שלב 2</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex-1 border-t border-border" />
            <span className="text-xs text-muted-foreground">כרגע</span>
            <span className="flex-1 border-t border-border" />
          </div>

          {/* Admin */}
          <button
            onClick={() => enterAs(ADMIN_ID)}
            className={cn(
              "w-full flex items-start gap-4 rounded-xl border px-4 py-4 text-start",
              "border-yellow-500/40 bg-yellow-500/5",
              "hover:bg-yellow-500/10 hover:border-yellow-500/60",
              "transition-all"
            )}
          >
            <div className="h-10 w-10 rounded-xl bg-yellow-500/20 border border-yellow-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Shield className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-yellow-400">כניסת מנהל מערכת</span>
                <span className="text-[10px] text-yellow-400/60">👑</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                גישה לכל ההגדרות, ה-API keys, הזיכרון וההיסטוריה האישית
              </p>
            </div>
            <ArrowLeft className="h-4 w-4 text-yellow-400/60 shrink-0 mt-3" />
          </button>

          {/* Guest */}
          <button
            onClick={() => enterAs(GUEST_ID)}
            className={cn(
              "w-full flex items-start gap-4 rounded-xl border px-4 py-4 text-start",
              "border-border bg-card",
              "hover:bg-accent hover:border-primary/30",
              "transition-all"
            )}
          >
            <div className="h-10 w-10 rounded-xl bg-secondary border border-border flex items-center justify-center shrink-0 mt-0.5">
              <User className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">כניסה כמשתמש אורח</span>
                <span className="text-[10px] text-muted-foreground">👤</span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                מתחיל מאפס עם ברירות מחדל ניטרליות — ללא גישה לנתוני המנהל
              </p>
            </div>
            <ArrowLeft className="h-4 w-4 text-muted-foreground/40 shrink-0 mt-3" />
          </button>
        </div>

        {/* Footer */}
        <div className="text-center space-y-1">
          <p className="text-[11px] text-muted-foreground/60">
            כל הנתונים נשמרים מקומית בדפדפן בלבד · לא עולים לשרת חיצוני
          </p>
          <p className="text-[10px] text-muted-foreground/40">
            שלב 1 — אימות Google יתווסף בשלב 2
          </p>
        </div>
      </div>
    </div>
  );
}
