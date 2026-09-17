import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/cookies";
import {
  exchangeCode,
  getUserEmail,
  isCalendarConfigured,
} from "@/lib/calendar/google";
import { getGoogleTokens, setGoogleTokens } from "@/lib/data/repo";

export async function GET(request: Request) {
  const user = await getSessionUser();
  const url = new URL(request.url);
  const error = url.searchParams.get("error");
  if (error) {
    return NextResponse.redirect(new URL("/?calendar=error", url.origin));
  }
  if (!user || user.demo) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }
  const code = url.searchParams.get("code");
  if (!code || !isCalendarConfigured()) {
    return NextResponse.redirect(new URL("/?calendar=error", url.origin));
  }

  try {
    const tokens = await exchangeCode(code);
    const existing = await getGoogleTokens(user.id);
    const accessToken = tokens.access_token || existing?.access_token || "";
    const email = accessToken ? await getUserEmail(accessToken) : existing?.email;
    await setGoogleTokens(user.id, {
      email,
      refreshToken: tokens.refresh_token || existing?.refresh_token || "",
      accessToken,
      expiresAt: new Date(
        Date.now() + (tokens.expires_in ?? 3600) * 1000,
      ).toISOString(),
    });
  } catch {
    return NextResponse.redirect(new URL("/?calendar=error", url.origin));
  }

  return NextResponse.redirect(new URL("/?calendar=connected", url.origin));
}