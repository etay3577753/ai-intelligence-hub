"""
Chat & Project Management Router
"""
import uuid
import sys
from pathlib import Path
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

sys.path.insert(0, str(Path(__file__).parent.parent))
from orchestrator import (
    orchestrate, load_projects, save_projects,
    load_tools, generate_recommendation,
)

router = APIRouter()


class ChatStartRequest(BaseModel):
    task: str
    project_title: Optional[str] = None


class ChatMessageRequest(BaseModel):
    project_id: str
    message: str


@router.post("/chat/start")
def start_chat(body: ChatStartRequest):
    result = orchestrate(body.task)
    project_id = str(uuid.uuid4())[:8]

    first_response = "שלום! אשמח לעזור לך לבחור את הכלים הנכונים.\n\nלפני שאמליץ, יש לי כמה שאלות:\n\n" + \
        "\n".join(f"{i+1}. {q}" for i, q in enumerate(result["clarifying_questions"]))

    project = {
        "id": project_id,
        "title": body.project_title or (body.task[:50] + ("…" if len(body.task) > 50 else "")),
        "task": body.task,
        "matched_categories": result["matched_categories"],
        "matched_tool_ids": [t["id"] for t in result["matched_tools"]],
        "chat_history": [
            {"role": "user",      "content": body.task},
            {"role": "assistant", "content": first_response},
        ],
        "status": "awaiting_answers",
    }

    data = load_projects()
    data["projects"].insert(0, project)
    save_projects(data)

    return {
        "project_id": project_id,
        "title": project["title"],
        "first_response": first_response,
        "matched_categories": result["matched_categories"],
        "matched_tools_preview": [
            {"id": t["id"], "name": t["name"], "category": t["category"], "rating": t.get("rating")}
            for t in result["matched_tools"][:5]
        ],
    }


@router.get("/chat/projects")
def list_projects():
    data = load_projects()
    return {
        "projects": [
            {"id": p["id"], "title": p["title"], "status": p.get("status", "active"),
             "task": p["task"][:80]}
            for p in data["projects"]
        ]
    }


@router.get("/chat/project/{project_id}")
def get_project(project_id: str):
    data = load_projects()
    project = next((p for p in data["projects"] if p["id"] == project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return project


@router.post("/chat/message")
def send_message(body: ChatMessageRequest):
    data = load_projects()
    project = next((p for p in data["projects"] if p["id"] == body.project_id), None)
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project["chat_history"].append({"role": "user", "content": body.message})

    # If this is the answer to clarifying questions → generate recommendation
    user_messages = [m for m in project["chat_history"] if m["role"] == "user"]
    tools = load_tools()

    if len(user_messages) >= 2 and project.get("status") == "awaiting_answers":
        response = generate_recommendation(body.message, project, tools)
        project["status"] = "recommended"
    else:
        response = (
            "תודה על השאלה! כדי לתת המלצה מדויקת יותר, "
            "אנא חזור לתיאור המשימה ושאל שאלה חדשה."
        )

    project["chat_history"].append({"role": "assistant", "content": response})
    save_projects(data)

    return {"response": response, "project_id": body.project_id, "status": project["status"]}
