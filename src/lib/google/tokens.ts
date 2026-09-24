import "server-only";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";
import { decodeJwt } from "jose";
import { z } from "zod";
import { googleEnv, GOOGLE_OAUTH_TOKEN_URL } from "@/lib/google/config";
import { getConnection } from "@/lib/google/repo";

// ─────────────────────────────────────────────────────────────
// Cifrado del refresh token (AES-256-GCM)
// ─────────────────────────────────────────────────────────────

const ENCRYPTION_PREFIX = "v1";

function tokenKey(): Buffer {
  // La clave se deriva de GOOGLE_TOKEN_SECRET (32 bytes estables).
  return createHash("sha256")
    .update(googleEnv.tokenSecret ?? "")
    .digest();
}

/** Formato: v1.<iv b64>.<tag b64>.<ciphertext b64> */
export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", tokenKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  return [
    ENCRYPTION_PREFIX,
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    encrypted.toString("base64"),
  ].join(".");
}

export function decryptToken(payload: string): string {
  const [version, ivB64, tagB64, dataB64] = payload.split(".");
  if (version !== ENCRYPTION_PREFIX || !ivB64 || !tagB64 || !dataB64) {
    throw new Error("Formato de token cifrado no válido");
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    tokenKey(),
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
}

// ─────────────────────────────────────────────────────────────
// Endpoint de tokens de Google
// ─────────────────────────────────────────────────────────────

const tokenResponseSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().optional(),
  refresh_token: z.string().min(1).optional(),
  id_token: z.string().min(1).optional(),
});

export type GoogleTokenResponse = z.infer<typeof tokenResponseSchema>;

async function requestToken(
  params: Record<string, string>,
): Promise<GoogleTokenResponse | null> {
  try {
    const res = await fetch(GOOGLE_OAUTH_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const parsed = tokenResponseSchema.safeParse(await res.json());
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export async function exchangeAuthCode(input: {
  code: string;
  redirectUri: string;
}): Promise<GoogleTokenResponse | null> {
  if (!googleEnv.clientId || !googleEnv.clientSecret) return null;
  return requestToken({
    code: input.code,
    client_id: googleEnv.clientId,
    client_secret: googleEnv.clientSecret,
    redirect_uri: input.redirectUri,
    grant_type: "authorization_code",
  });
}

export async function refreshAccessToken(
  refreshToken: string,
): Promise<string | null> {
  if (!googleEnv.clientId || !googleEnv.clientSecret) return null;
  const res = await requestToken({
    refresh_token: refreshToken,
    client_id: googleEnv.clientId,
    client_secret: googleEnv.clientSecret,
    grant_type: "refresh_token",
  });
  return res?.access_token ?? null;
}

/** Email de la cuenta dentro del id_token (sin verificar firma: viene por TLS). */
export function emailFromIdToken(idToken: string): string | null {
  try {
    const parsed = z
      .object({ email: z.string().email() })
      .safeParse(decodeJwt(idToken));
    return parsed.success ? parsed.data.email : null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────
// Access token bajo demanda
// ─────────────────────────────────────────────────────────────

/**
 * Devuelve un access token válido refrescándolo bajo demanda.
 * El access token NO se persiste: solo vive durante la petición.
 */
export async function ensureAccessToken(userId: string): Promise<string | null> {
  const connection = await getConnection(userId);
  if (!connection || connection.paused) return null;
  try {
    const refreshToken = decryptToken(connection.refresh_token_encrypted);
    return await refreshAccessToken(refreshToken);
  } catch (error) {
    console.error(
      "[Eunomia] No se pudo obtener el access token de Google:",
      error,
    );
    return null;
  }
}
