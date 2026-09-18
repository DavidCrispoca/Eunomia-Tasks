"use server";

import { redirect } from "next/navigation";
import type { AppUser } from "@/types";
import { endSession, startSession } from "@/lib/auth/cookies";
import { isAllowedEmail, isSupabaseConfigured } from "@/lib/auth/config";
import { signInWithPassword, signUpUser } from "@/lib/auth/supabase";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 6;

export type AuthState = { messageKey?: string } | undefined;

function demoUser(email: string, name?: string): AppUser {
  const cleanEmail = email.toLowerCase();
  const prefix = cleanEmail.split("@")[0];
  const displayName =
    name?.trim() || prefix.charAt(0).toUpperCase() + prefix.slice(1);
  return {
    id: `demo-${cleanEmail}`,
    email: cleanEmail,
    name: displayName,
    demo: true,
  };
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!EMAIL_RE.test(email) || password.length < MIN_PASSWORD) {
    return { messageKey: "invalid" };
  }
  if (!isAllowedEmail(email)) return { messageKey: "notAllowed" };

  if (isSupabaseConfigured()) {
    try {
      const { user } = await signInWithPassword(email, password);
      if (!user) return { messageKey: "invalid" };
      await startSession({
        id: user.id,
        email: user.email ?? email,
        name:
          typeof user.user_metadata?.name === "string"
            ? user.user_metadata.name
            : undefined,
      });
    } catch (error) {
      console.error("[Eunomia] login error:", error);
      return { messageKey: "generic" };
    }
  } else {
    await startSession(demoUser(email));
  }

  redirect("/");
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!name || !EMAIL_RE.test(email) || password.length < MIN_PASSWORD) {
    return { messageKey: "invalid" };
  }
  if (!isAllowedEmail(email)) return { messageKey: "notAllowed" };

  if (isSupabaseConfigured()) {
    try {
      const { user, error } = await signUpUser({ name, email, password });
      if (!user) {
        const message = (error ?? "").toLowerCase();
        const exists =
          message.includes("already") ||
          message.includes("exists") ||
          message.includes("taken") ||
          message.includes("registered");
        return { messageKey: exists ? "exists" : "generic" };
      }
      await startSession({
        id: user.id,
        email: user.email ?? email,
        name,
      });
    } catch (error) {
      console.error("[Eunomia] signup error:", error);
      return { messageKey: "generic" };
    }
  } else {
    await startSession(demoUser(email, name));
  }

  redirect("/");
}

export async function logout(): Promise<void> {
  await endSession();
  redirect("/login");
}