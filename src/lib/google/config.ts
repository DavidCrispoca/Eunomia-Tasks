import "server-only";

export const googleEnv = {
  clientId: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  tokenSecret: process.env.GOOGLE_TOKEN_SECRET,
};

/**
 * La integración completa requiere las tres variables: sin
 * GOOGLE_TOKEN_SECRET no se pueden cifrar/guardar los refresh tokens.
 */
export function isGoogleConfigured(): boolean {
  return Boolean(
    googleEnv.clientId && googleEnv.clientSecret && googleEnv.tokenSecret,
  );
}

export const GOOGLE_OAUTH_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
export const GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token";
export const GOOGLE_CALENDAR_API_BASE =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export const GOOGLE_OAUTH_SCOPE =
  "openid email https://www.googleapis.com/auth/calendar.events";

/** URI de retorno registrada en Google Cloud Console. */
export function googleRedirectUri(requestUrl: string): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) {
    return `${configured.replace(/\/$/, "")}/api/google/oauth/callback`;
  }
  const origin = new URL(requestUrl).origin;
  return `${origin}/api/google/oauth/callback`;
}
