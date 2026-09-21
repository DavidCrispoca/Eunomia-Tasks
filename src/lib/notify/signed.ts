import "server-only";
import { SignJWT, jwtVerify } from "jose";

const FALLBACK = "eunomia-email-actions-secret";
const secretKey = () =>
  new TextEncoder().encode(process.env.SESSION_SECRET ?? FALLBACK);

export type EmailActionPayload = {
  v: number;
  action: "complete" | "snooze" | "quickadd" | "add";
  userId: string;
  taskId?: string;
};

export async function signAction(
  payload: EmailActionPayload,
  ttlSeconds = 60 * 60 * 24 * 7,
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(new Date(Date.now() + ttlSeconds * 1000).getTime())
    .sign(secretKey());
}

export async function verifyAction(
  token: string | null | undefined,
): Promise<EmailActionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
    });
    const action = payload.action;
    const userId = typeof payload.userId === "string" ? payload.userId : "";
    if (
      action !== "complete" &&
      action !== "snooze" &&
      action !== "quickadd" &&
      action !== "add"
    ) {
      return null;
    }
    if (!userId) return null;
    return {
      v: 1,
      action,
      userId,
      taskId: typeof payload.taskId === "string" ? payload.taskId : undefined,
    };
  } catch {
    return null;
  }
}