import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const MY_TOOLS_PATH   = path.join(process.cwd(), "..", "backend", "data", "my_tools.json");
const TOOLS_MASTER_PATH = path.join(process.cwd(), "..", "backend", "data", "tools_master.json");

function loadMyTools() {
  return JSON.parse(fs.readFileSync(MY_TOOLS_PATH, "utf-8"));
}
function saveMyTools(data: object) {
  fs.writeFileSync(MY_TOOLS_PATH, JSON.stringify(data, null, 2), "utf-8");
}
function loadToolsMaster() {
  return JSON.parse(fs.readFileSync(TOOLS_MASTER_PATH, "utf-8"));
}

// GET /api/settings
export async function GET() {
  const myTools = loadMyTools();
  const master  = loadToolsMaster();

  const userTiers:      Record<string, string> = myTools.user_tiers       ?? {};
  const userBrandTiers: Record<string, string> = myTools.user_brand_tiers ?? {};
  const validTiers:     string[]               = myTools.valid_tiers       ?? ["free", "pro", "api"];

  const tools = (master.tools as Array<Record<string, unknown>>).map((t) => ({
    id:             t.id,
    name:           t.name,
    category:       t.category,
    cost:           t.cost,
    hebrew_support: t.hebrew_support,
    description:    (t.description as string).slice(0, 100),
    tier:           userTiers[t.id as string] ?? "free",
  }));

  return NextResponse.json({
    tools,
    user_tiers:      userTiers,
    user_brand_tiers: userBrandTiers,
    valid_tiers:     validTiers,
    brand_tiers:     myTools.brand_tiers     ?? {},
    ecosystems:      myTools.ecosystems      ?? {},
    tool_strengths:  myTools.tool_strengths  ?? {},
    task_profiles:   myTools.task_profiles   ?? {},
  });
}

// POST /api/settings
export async function POST(req: NextRequest) {
  const body = await req.json();
  const incomingTiers:      Record<string, string> | undefined = body.user_tiers;
  const incomingBrandTiers: Record<string, string> | undefined = body.user_brand_tiers;

  if (!incomingTiers && !incomingBrandTiers) {
    return NextResponse.json({ error: "user_tiers or user_brand_tiers required" }, { status: 400 });
  }

  const db = loadMyTools();
  const valid: string[] = db.valid_tiers ?? ["free", "pro", "api"];

  if (incomingTiers) {
    for (const [id, tier] of Object.entries(incomingTiers)) {
      if (!valid.includes(tier)) {
        return NextResponse.json({ error: `Invalid tier '${tier}' for ${id}` }, { status: 400 });
      }
    }
    db.user_tiers = { ...(db.user_tiers ?? {}), ...incomingTiers };
  }

  if (incomingBrandTiers) {
    db.user_brand_tiers = { ...(db.user_brand_tiers ?? {}), ...incomingBrandTiers };
  }

  saveMyTools(db);
  return NextResponse.json({ ok: true, user_tiers: db.user_tiers, user_brand_tiers: db.user_brand_tiers });
}
