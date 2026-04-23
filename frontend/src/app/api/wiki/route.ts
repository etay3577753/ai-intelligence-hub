import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";

const WIKI_DIR = path.join(process.cwd(), "..", "backend", "data", "wiki");
const YT_DIR   = path.join(WIKI_DIR, "youtube");

function parseMeta(filePath: string, isYoutube = false): Record<string, string | number | boolean> {
  const raw = fs.readFileSync(filePath, "utf-8");
  const toolId = path.basename(filePath, ".md");

  const titleMatch = raw.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1].replace(/דוח מחקר עמוק:\s*/, "").trim() : toolId;

  if (isYoutube) {
    const channelMatch  = raw.match(/\*\*ערוץ\*\*:\s*(.+)/);
    const dateMatch     = raw.match(/\*\*תאריך\*\*:\s*(.+)/);
    const durationMatch = raw.match(/\*\*משך\*\*:\s*(.+)/);
    const viewsMatch    = raw.match(/\*\*צפיות\*\*:\s*(.+)/);
    const sourceMatch   = raw.match(/\*\*מקור תמליל\*\*:\s*(.+)/);
    const urlMatch      = raw.match(/\*\*קישור\*\*:\s*(.+)/);
    return {
      id: toolId, title,
      ecosystem: "YouTube — אלירן גיני",
      date:      dateMatch?.[1]?.trim().replace(/\s+$/, "") ?? "",
      cost:      "",
      size:      raw.length,
      channel:   channelMatch?.[1]?.trim().replace(/\s+$/, "") ?? "Eliron Giny",
      duration:  durationMatch?.[1]?.trim().replace(/\s+$/, "") ?? "",
      views:     viewsMatch?.[1]?.trim().replace(/\s+$/, "") ?? "",
      source:    sourceMatch?.[1]?.trim().replace(/\s+$/, "") ?? "",
      url:       urlMatch?.[1]?.trim().replace(/\s+$/, "") ?? `https://www.youtube.com/watch?v=${toolId}`,
      is_youtube: true,
    };
  }

  const ecoMatch  = raw.match(/\*\*אקו-סיסטם\*\*:\s*(.+)/);
  const dateMatch = raw.match(/\*\*תאריך מחקר\*\*:\s*(.+)/);
  const costMatch = raw.match(/\*\*עלות מחקר זה\*\*:\s*(.+)/);
  return {
    id: toolId, title,
    ecosystem:  ecoMatch?.[1]?.trim()  ?? "עצמאי",
    date:       dateMatch?.[1]?.trim() ?? "",
    cost:       costMatch?.[1]?.trim() ?? "",
    size:       raw.length,
    is_youtube: false,
  };
}

export async function GET(req: NextRequest) {
  const id       = req.nextUrl.searchParams.get("id");
  const category = req.nextUrl.searchParams.get("category") ?? "all"; // "all"|"research"|"youtube"

  if (!fs.existsSync(WIKI_DIR)) return NextResponse.json({ files: [] });

  // ── Single file content ────────────────────────────────────────────────
  if (id) {
    const candidates = [
      path.join(WIKI_DIR, `${id}.md`),
      path.join(YT_DIR,   `${id}.md`),
    ];
    for (const fp of candidates) {
      if (fs.existsSync(fp)) {
        const content = fs.readFileSync(fp, "utf-8");
        const isYt = fp.includes("youtube");
        const meta = parseMeta(fp, isYt);
        return NextResponse.json({ id, content, ...meta });
      }
    }
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // ── File list ──────────────────────────────────────────────────────────
  const allFiles: ReturnType<typeof parseMeta>[] = [];

  if (category !== "youtube") {
    fs.readdirSync(WIKI_DIR)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .forEach((f) => allFiles.push(parseMeta(path.join(WIKI_DIR, f), false)));
  }

  if (category !== "research" && fs.existsSync(YT_DIR)) {
    fs.readdirSync(YT_DIR)
      .filter((f) => f.endsWith(".md"))
      .sort()
      .forEach((f) => allFiles.push(parseMeta(path.join(YT_DIR, f), true)));
  }

  return NextResponse.json({ files: allFiles, total: allFiles.length });
}
