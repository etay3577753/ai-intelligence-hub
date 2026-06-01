import { UserProfile } from "@/app/api/chat/calibration_questions";

const PROFILE_PATH = "/api/user-profile";

// Default empty profile matching UserProfile interface
export function emptyProfile(): UserProfile {
  return {
    userId: "admin",
    displayName: "Admin",
    ownedTools: [],
    preferredLanguage: "he",
    techLevel: "beginner",
    monthlyBudget: 0,
    primaryUseCase: undefined,
  };
}

// Load user profile from the JSON file via API or direct import
export async function loadProfile(): Promise<UserProfile> {
  try {
    // In Next.js, we can import the static JSON directly
    const raw = await import("@/data/user_profile.json");
    const data = raw.default as Record<string, unknown>;

    // Map the flat JSON fields → UserProfile shape
    const profile: UserProfile = {
      userId: "admin",
      displayName: typeof data.name === "string" ? data.name : "Admin",
      ownedTools: Array.isArray(data.subscriptions)
        ? (data.subscriptions as string[]).map((id) => ({
            id,
            name: id,
            plan: "unknown" as const,
            ecosystem: "unknown",
          }))
        : [],
      preferredLanguage:
        data.language === "he" || data.language === "en"
          ? (data.language as "he" | "en")
          : "he",
      techLevel: mapTechLevel(data.tech_level as string),
      monthlyBudget: mapBudget(data.monthly_budget as string),
      primaryUseCase: undefined,
    };

    return profile;
  } catch {
    console.warn("[userProfile] Could not load user_profile.json, using defaults");
    return emptyProfile();
  }
}

// Save updated fields back to the profile JSON via API route
export async function saveProfile(
  updates: Partial<{
    name: string;
    language: "he" | "en";
    tech_level: string;
    monthly_budget: string;
    subscriptions: string[];
    preferred_ecosystems: string[];
  }>
): Promise<boolean> {
  try {
    const res = await fetch(PROFILE_PATH, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...updates, last_updated: new Date().toISOString() }),
    });
    return res.ok;
  } catch {
    console.warn("[userProfile] saveProfile failed — running in static mode?");
    return false;
  }
}

// ── helpers ──────────────────────────────────────────────────────────────────

function mapTechLevel(
  raw: string
): "beginner" | "intermediate" | "advanced" {
  if (raw === "high" || raw === "advanced") return "advanced";
  if (raw === "medium" || raw === "intermediate") return "intermediate";
  return "beginner"; // "low" or unknown → beginner
}

function mapBudget(raw: string): number {
  if (!raw) return 0;
  if (raw === "low") return 20;
  if (raw === "medium") return 100;
  if (raw === "high") return 500;
  const num = parseFloat(raw);
  return isNaN(num) ? 0 : num;
}
