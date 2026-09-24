import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/cookies";
import {
  GOOGLE_OAUTH_AUTH_URL,
  GOOGLE_OAUTH_SCOPE,
  googleRedirectUri,
  isGoogleConfigured,
} from "@/lib/google/config";
import { createOAuthState } from "@/lib/google/state";

export async function GET(request: Request) {
  const user = await getSessionUser();
  const url = new URL(request.url);

  if (!user || user.demo) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }
  if (!isGoogleConfigured()) {
    return NextResponse.redirect(
      new URL("/calendar?google_error=not_configured", url.origin),
    );
  }

  const state = await createOAuthState(user.id);
  const authUrl = new URL(GOOGLE_OAUTH_AUTH_URL);
  authUrl.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  authUrl.searchParams.set("redirect_uri", googleRedirectUri(url.toString()));
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", GOOGLE_OAUTH_SCOPE);
  // offline ⇒ refresh_token; consent ⇒ lo reemite siempre (Google solo lo
  // devuelve la primera vez por defecto).
  authUrl.searchParams.set("access_type", "offline");
  authUrl.searchParams.set("prompt", "consent");
  authUrl.searchParams.set("state", state);

  return NextResponse.redirect(authUrl.toString(), { status: 302 });
}
