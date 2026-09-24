import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { sessionSecret } from "@/lib/auth/session";

/**
 * Estado anti-CSRF del OAuth de Google: JWT firmado con SESSION_SECRET
 * que liga la petición de inicio con el usuario que completa el callback.
 * Caduca a los 10 minutos.
 */
const STATE_EXPIRY = "10m";

function stateKey(): Uint8Array {
  return new TextEncoder().encode(sessionSecret());
}

export async function createOAuthState(userId: string): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(STATE_EXPIRY)
    .sign(stateKey());
}

/** Devuelve el userId si el state es válido y no ha caducado. */
export async function verifyOAuthState(
  state: string | null,
): Promise<string | null> {
  if (!state) return null;
  try {
    const { payload } = await jwtVerify(state, stateKey(), {
      algorithms: ["HS256"],
    });
    return payload.sub ?? null;
  } catch {
    return null;
  }
}
