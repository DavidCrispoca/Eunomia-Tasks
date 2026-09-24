import { NextResponse } from "next/server";
import { after } from "next/server";
import { getSessionUser } from "@/lib/auth/cookies";
import { googleRedirectUri, isGoogleConfigured } from "@/lib/google/config";
import { upsertConnection } from "@/lib/google/repo";
import { verifyOAuthState } from "@/lib/google/state";
import { syncUserCalendar } from "@/lib/google/sync";
import {
  emailFromIdToken,
  encryptToken,
  exchangeAuthCode,
} from "@/lib/google/tokens";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const oauthError = url.searchParams.get("error");
  const backWithError = (reason: string) =>
    NextResponse.redirect(
      new URL(`/calendar?google_error=${reason}`, url.origin),
      { status: 302 },
    );

  if (oauthError) return backWithError(oauthError === "access_denied" ? "denied" : "generic");

  const user = await getSessionUser();
  if (!user || user.demo) {
    return NextResponse.redirect(new URL("/login", url.origin));
  }
  if (!isGoogleConfigured()) return backWithError("not_configured");

  // El state (JWT de 10 min) debe corresponder al usuario con sesión.
  const stateUserId = await verifyOAuthState(state);
  if (!stateUserId || stateUserId !== user.id || !code) {
    return backWithError("state");
  }

  const tokens = await exchangeAuthCode({
    code,
    redirectUri: googleRedirectUri(url.toString()),
  });
  if (!tokens) return backWithError("token");

  // Google solo devuelve refresh_token con access_type=offline + consent.
  const refreshToken = tokens.refresh_token;
  if (!refreshToken) return backWithError("refresh_token");

  const email = tokens.id_token
    ? emailFromIdToken(tokens.id_token)
    : user.email;
  if (!email) return backWithError("email");

  const saved = await upsertConnection(user.id, {
    googleAccountEmail: email,
    refreshTokenEncrypted: encryptToken(refreshToken),
  });
  if (!saved) return backWithError("storage");

  // Push inicial: el primer sync tras conectar no se puede saltar.
  after(async () => {
    try {
      await syncUserCalendar(user.id, { force: true });
    } catch (error) {
      console.error("[Eunomia] Push inicial a Google falló:", error);
    }
  });

  return NextResponse.redirect(new URL("/calendar?connected=1", url.origin), {
    status: 302,
  });
}
