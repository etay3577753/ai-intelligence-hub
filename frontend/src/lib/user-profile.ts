/**
 * user-profile.ts
 * ניהול פרופיל משתמש — Profile isolation לשלב 1.
 * Stage 2: יוחלף ב-NextAuth.js + Google OAuth + DB.
 */

export type UserId = "admin" | "guest";

export const ADMIN_ID: UserId = "admin";
export const GUEST_ID: UserId  = "guest";

const CURRENT_USER_KEY = "current_user_id";

// ─── Getters / Setters ────────────────────────────────────────────────────────

export function getCurrentUser(): UserId {
  if (typeof window === "undefined") return GUEST_ID;
  return (localStorage.getItem(CURRENT_USER_KEY) as UserId) ?? GUEST_ID;
}

export function setCurrentUser(id: UserId): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CURRENT_USER_KEY, id);
}

export function isLoggedIn(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CURRENT_USER_KEY) !== null;
}

export function isAdmin(): boolean {
  return getCurrentUser() === ADMIN_ID;
}

export function logout(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(CURRENT_USER_KEY);
}

// ─── Storage scoping ──────────────────────────────────────────────────────────
/**
 * כל מפתח localStorage מקבל suffix של userId.
 * כך נתוני admin ואורח לעולם לא מתערבבים.
 */
export function scopedKey(baseKey: string): string {
  return `${baseKey}__${getCurrentUser()}`;
}

export function scopedRead<T>(baseKey: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(scopedKey(baseKey));
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function scopedWrite(baseKey: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(scopedKey(baseKey), JSON.stringify(value));
  } catch { /* quota */ }
}

export function scopedRemove(baseKey: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(scopedKey(baseKey));
}

// ─── Default values ───────────────────────────────────────────────────────────

export interface UserPreferences {
  knowledge_level: "מתחיל" | "בינוני" | "מנוסה";
  language: "עברית" | "English";
  explanation_style: "קצר וממוקד" | "מפורט עם דוגמאות";
  preferred_priority: "מהירות" | "עלות נמוכה" | "איכות גבוהה" | "שליטה מלאה";
  onboarding_done: boolean;
}

export interface AccessMap {
  web_sub: "yes" | "no" | "partial";
  api_key: "yes" | "no" | "partial";
  local_runtime: "yes" | "no" | "partial";
  org_access: "yes" | "no" | "partial";
  student_access: "yes" | "no" | "partial";
  notes: string;
}

export const NEUTRAL_PREFERENCES: UserPreferences = {
  knowledge_level: "מתחיל",
  language: "עברית",
  explanation_style: "קצר וממוקד",
  preferred_priority: "מהירות",
  onboarding_done: false,
};

export const NEUTRAL_ACCESS_MAP: AccessMap = {
  web_sub: "no",
  api_key: "no",
  local_runtime: "no",
  org_access: "no",
  student_access: "no",
  notes: "",
};

export function getUserPreferences(): UserPreferences {
  return scopedRead<UserPreferences>("user_preferences") ?? NEUTRAL_PREFERENCES;
}

export function getUserAccessMap(): AccessMap {
  return scopedRead<AccessMap>("user_access_map") ?? NEUTRAL_ACCESS_MAP;
}

// ─── Display helpers ──────────────────────────────────────────────────────────

export const USER_DISPLAY: Record<UserId, { name: string; emoji: string; color: string }> = {
  admin: { name: "מנהל מערכת", emoji: "👑", color: "text-yellow-400" },
  guest: { name: "משתמש אורח", emoji: "👤", color: "text-muted-foreground" },
};
