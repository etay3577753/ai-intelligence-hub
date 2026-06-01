import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

// ─── Path to the static profile JSON ──────────────────────────────────────────
// process.cwd() = frontend/ when running Next.js dev/build
const PROFILE_PATH = path.join(process.cwd(), "src", "data", "user_profile.json");

function readProfile(): Record<string, unknown> {
  try {
    const raw = fs.readFileSync(PROFILE_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {
      admin: true,
      name: "Admin",
      language: "he",
      tech_level: "low",
      monthly_budget: "low",
      subscriptions: [],
      preferred_ecosystems: [],
      last_updated: "",
    };
  }
}

// ─── GET /api/user-profile ─────────────────────────────────────────────────────
export async function GET() {
  const profile = readProfile();
  return NextResponse.json(profile);
}

// ─── PATCH /api/user-profile ──────────────────────────────────────────────────
// Body: partial fields to merge into the profile
export async function PATCH(req: NextRequest) {
  try {
    const updates = (await req.json()) as Record<string, unknown>;

    // Reject writes to dangerous keys
    const FORBIDDEN = ["admin", "__proto__", "constructor"];
    for (const key of FORBIDDEN) {
      if (key in updates) delete updates[key];
    }

    const current = readProfile();
    const merged = {
      ...current,
      ...updates,
      last_updated: new Date().toISOString(),
    };

    fs.writeFileSync(PROFILE_PATH, JSON.stringify(merged, null, 2), "utf-8");

    return NextResponse.json({ ok: true, profile: merged });
  } catch (err) {
    console.error("[user-profile PATCH]", err);
    return NextResponse.json(
      { error: String(err instanceof Error ? err.message : err) },
      { status: 500 }
    );
  }
}
