import { SignJWT, jwtVerify } from "jose";
import type { AppUser } from "@/types";

export const SESSION_COOKIE = "eunomia_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const FALLBACK_SECRET = "eunomia-draft-session-secret-change-me";

/** Secreto compartido de sesión (SESSION_SECRET, con fallback local). */
export function sessionSecret(): string {
  const raw = process.env.SESSION_SECRET?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        "[Eunomia] SESSION_SECRET vacío o ausente — usando fallback (inseguro). Configura una clave real en las variables de entorno.",
      );
    }
    return FALLBACK_SECRET;
  }
  return raw;
}

function secretKey(): string {
  return sessionSecret();
}

export async function createSessionToken(user: AppUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    demo: user.demo,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(new TextEncoder().encode(secretKey()));
}

export async function verifySessionToken(
  token: string | undefined,
): Promise<AppUser | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(
      token,
      new TextEncoder().encode(secretKey()),
      { algorithms: ["HS256"] },
    );
    const email = typeof payload.email === "string" ? payload.email : "";
    if (!payload.sub || !email) return null;
    return {
      id: payload.sub,
      email,
      name: typeof payload.name === "string" ? payload.name : undefined,
      demo: Boolean(payload.demo),
    };
  } catch {
    return null;
  }
}