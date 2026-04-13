import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import {
  loadTools, loadProjects, saveProjects,
  matchCategories, getToolsForCategories,
  generateClarifyingQuestions,
} from "@/lib/orchestrator";

export async function POST(req: NextRequest) {
  const { task, project_title } = await req.json();
  if (!task?.trim()) return NextResponse.json({ error: "task is required" }, { status: 400 });

  const tools      = loadTools();
  const categories = matchCategories(task);
  const matched    = getToolsForCategories(categories, tools);
  const questions  = generateClarifyingQuestions(task, categories);

  const firstResponse =
    "שלום! אשמח לעזור לך לבחור את הכלים הנכונים.\n\nלפני שאמליץ, יש לי כמה שאלות:\n\n" +
    questions.map((q, i) => `${i + 1}. ${q}`).join("\n");

  const project_id = randomUUID().slice(0, 8);
  const project = {
    id: project_id,
    title: project_title || task.slice(0, 50) + (task.length > 50 ? "…" : ""),
    task,
    matched_categories: categories,
    matched_tool_ids: matched.map((t) => t.id),
    chat_history: [
      { role: "user"      as const, content: task },
      { role: "assistant" as const, content: firstResponse },
    ],
    status: "awaiting_answers" as const,
  };

  const db = loadProjects();
  db.projects.unshift(project);
  saveProjects(db);

  return NextResponse.json({
    project_id,
    title: project.title,
    first_response: firstResponse,
    matched_categories: categories,
    matched_tools_preview: matched.slice(0, 5).map((t) => ({
      id: t.id, name: t.name, category: t.category, rating: t.rating,
    })),
  });
}
