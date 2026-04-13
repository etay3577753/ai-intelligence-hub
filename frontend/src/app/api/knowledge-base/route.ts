import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const KB_PATH = path.join(process.cwd(), "..", "backend", "data", "knowledge-base", "ecosystem-inventory.json");

export async function GET() {
  if (!fs.existsSync(KB_PATH)) {
    return NextResponse.json({ error: "knowledge-base not found" }, { status: 404 });
  }
  try {
    const raw  = fs.readFileSync(KB_PATH, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "failed to parse knowledge-base" }, { status: 500 });
  }
}
