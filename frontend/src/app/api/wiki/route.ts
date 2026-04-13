import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const WIKI_DIR = path.join(process.cwd(), "..", "backend", "data", "wiki");

// GET /api/wiki            → list of all wiki files (id + title)
// GET /api/wiki?id=claude  → full content of one file
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");

  if (!fs.existsSync(WIKI_DIR)) {
    return NextResponse.json({ files: [] });
  }

  const allFiles = fs.readdirSync(WIKI_DIR)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const filePath = path.join(WIKI_DIR, f);
      const raw = fs.readFileSync(filePath, "utf-8");
      const toolId = f.replace(".md", "");
      // Extract title from first H1
      const titleMatch = raw.match(/^#\s+(.+)$/m);
      const title = titleMatch ? titleMatch[1].replace(/דוח מחקר עמוק:\s*/, "").trim() : toolId;
      // Extract ecosystem
      const ecoMatch = raw.match(/\*\*אקו-סיסטם\*\*:\s*(.+)/);
      const ecosystem = ecoMatch ? ecoMatch[1].trim() : "עצמאי";
      // Extract date
      const dateMatch = raw.match(/\*\*תאריך מחקר\*\*:\s*(.+)/);
      const date = dateMatch ? dateMatch[1].trim() : "";
      // Cost
      const costMatch = raw.match(/\*\*עלות מחקר זה\*\*:\s*(.+)/);
      const cost = costMatch ? costMatch[1].trim() : "";

      return { id: toolId, title, ecosystem, date, cost, size: raw.length };
    });

  if (id) {
    const filePath = path.join(WIKI_DIR, `${id}.md`);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    const content = fs.readFileSync(filePath, "utf-8");
    const meta = allFiles.find((f) => f.id === id);
    return NextResponse.json({ id, content, meta });
  }

  return NextResponse.json({ files: allFiles });
}
