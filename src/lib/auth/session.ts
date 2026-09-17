import { SignJWT, jwtVerify } from "jose";
import type { AppUser } from "@/types";

export const SESSION_COOKIE = "eunomia_session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

const FALLBACK_SECRET = "eunomia-draft-session-secret-change-me";

function secretKey(): string {
  return process.env.SESSION_SECRET ?? FALLBACK_SECRET;
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