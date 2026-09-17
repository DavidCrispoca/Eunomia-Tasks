import { NextResponse } from "next/server";
import { isAuthorizedCron } from "@/lib/cron/guard";
import { runMorningBriefing } from "@/lib/notify/briefing";

export async function GET(request: Request) {
  if (!isAuthorizedCron(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const result = await runMorningBriefing();
  return NextResponse.json({ ok: true, ...result });
}