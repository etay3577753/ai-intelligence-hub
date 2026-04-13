import { NextRequest, NextResponse } from "next/server";
import {
  loadProjects, saveProjects, loadTools,
  generateRecommendation,
} from "@/lib/orchestrator";

export async function POST(req: NextRequest) {
  const { project_id, message } = await req.json();
  const db = loadProjects();
  const project = db.projects.find((p) => p.id === project_id);
  if (!project) return NextResponse.json({ error: "Project not found" }, { status: 404 });

  project.chat_history.push({ role: "user", content: message });

  const userMessages = project.chat_history.filter((m) => m.role === "user");
  const tools = loadTools();

  let response: string;
  if (userMessages.length >= 2 && project.status === "awaiting_answers") {
    response = generateRecommendation(project, tools);
    project.status = "recommended";
  } else {
    response =
      "תודה על השאלה! כדי לתת המלצה מדויקת, " +
      "אנא פתח פרויקט חדש עם תיאור המשימה שלך.";
  }

  project.chat_history.push({ role: "assistant", content: response });
  saveProjects(db);

  return NextResponse.json({ response, project_id, status: project.status });
}
