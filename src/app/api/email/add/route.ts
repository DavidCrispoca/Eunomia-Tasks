import { NextResponse } from "next/server";
import type { TaskPriority } from "@/types";
import { addTaskForUser } from "@/lib/data/repo";
import { verifyAction } from "@/lib/notify/signed";

const TITLE_MAX = 200;
const NOTES_MAX = 1000;
const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const token = typeof body.s === "string" ? body.s : "";
  const payload = await verifyAction(token);
  if (!payload || payload.action !== "add") {
    return NextResponse.json({ error: "invalid_link" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  if (!title || title.length > TITLE_MAX) {
    return NextResponse.json({ error: "invalid_title" }, { status: 400 });
  }

  const priority = PRIORITIES.includes(body.priority as TaskPriority)
    ? (body.priority as TaskPriority)
    : "medium";

  const dueDate =
    typeof body.dueDate === "string" && DATE_RE.test(body.dueDate)
      ? body.dueDate
      : undefined;

  const notes =
    typeof body.notes === "string"
      ? body.notes.slice(0, NOTES_MAX).trim()
      : undefined;

  await addTaskForUser(payload.userId, title, { priority, dueDate, notes });
  return NextResponse.json({ ok: true });
}