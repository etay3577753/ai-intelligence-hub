import { NextResponse } from "next/server";
import { loadProjects } from "@/lib/orchestrator";

export async function GET() {
  const db = loadProjects();
  return NextResponse.json({
    projects: db.projects.map((p) => ({
      id: p.id,
      title: p.title,
      status: p.status,
      task: p.task.slice(0, 80),
    })),
  });
}
