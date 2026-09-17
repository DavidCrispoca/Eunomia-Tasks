import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/guard";
import { runDueSoonEmails } from "@/lib/notify/due-soon";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runDueSoonEmails();
  return NextResponse.json({ ok: true, ...result });
}