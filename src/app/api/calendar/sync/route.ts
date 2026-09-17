import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/cookies";
import { syncBlocksToCalendar } from "@/lib/calendar/google";

export async function POST() {
  const user = await getSessionUser();
  if (!user || user.demo) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await syncBlocksToCalendar(user.id);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    const status = message.includes("no_calendar_token") ? 409 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}