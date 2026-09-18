import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { cookies as nextCookies } from "next/headers";
import { supabaseEnv, isSupabaseConfigured } from "@/lib/auth/config";

export type CookieStore = Awaited<ReturnType<typeof nextCookies>>;

export function serverClient(store: CookieStore) {
  return createServerClient(supabaseEnv.url!, supabaseEnv.anonKey!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        for (const { name, value, options } of list) {
          try {
            store.set(name, value, options);
          } catch {
            // cookie solo-lectura en render estático: no es bloqueante
          }
        }
      },
    },
  });
}

export { isSupabaseConfigured };
