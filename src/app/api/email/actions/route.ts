import { NextResponse } from "next/server";
import { appUrl } from "@/lib/notify/email";
import { verifyAction } from "@/lib/notify/signed";
import { completeTaskById, snoozeTaskById } from "@/lib/data/repo";

async function handle(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("t");
  const payload = await verifyAction(token);
  if (!payload) {
    return new NextResponse("Enlace inválido o caducado.", { status: 400 });
  }

  if (payload.action === "complete" && payload.taskId) {
    await completeTaskById(payload.userId, payload.taskId);
    return NextResponse.redirect(new URL("/?done=1", appUrl()));
  }
  if (payload.action === "snooze" && payload.taskId) {
    await snoozeTaskById(payload.userId, payload.taskId);
    return NextResponse.redirect(new URL("/?snoozed=1", appUrl()));
  }
  if (payload.action === "quickadd") {
    return NextResponse.redirect(new URL("/?quickadd=1", appUrl()));
  }
  return NextResponse.redirect(new URL("/", appUrl()));
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}