import "server-only";
import { createServerClient } from "@supabase/ssr";
import type { cookies as cookiesFn } from "next/headers";

/**
 * Cliente Supabase con soporte de cookies (OAuth PKCE).
 * El verifier de PKCE se guarda/lee desde las cookies, por eso hace falta
 * que el cliente "escriba" cookies tanto al iniciar el OAuth como al
 * intercambiar el código en el callback.
 *
 * `getAll`/`setAll` envuelven el store de Next (await cookies()).
 */
export function createCookieSupabaseClient(
  getStore: () => Awaited<ReturnType<typeof cookiesFn>>,
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) return null;
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => getStore().getAll(),
      setAll: (cookiesToSet) => {
        for (const { name, value, options } of cookiesToSet) {
          try {
            getStore().set(name, value, options);
          } catch {
            // cookie solo de lectura en render estático; se ignora
          }
        }
      },
    },
  });
}
