"use client";

import { createBrowserClient } from "@supabase/ssr";
import { supabaseEnv } from "@/lib/auth/config";

let instance: ReturnType<typeof createBrowserClient> | null = null;

/** Cliente Supabase en el navegador (para OAuth PKCE de Google). */
export function supabaseBrowser() {
  if (!supabaseEnv.url || !supabaseEnv.anonKey) return null;
  instance ??= createBrowserClient(supabaseEnv.url, supabaseEnv.anonKey);
  return instance;
}
