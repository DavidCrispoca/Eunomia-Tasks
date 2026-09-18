import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseEnv } from "@/lib/supabase/config";

let adminClient: SupabaseClient | null = null;

/**
 * Cliente con la Service Role Key. Solo debe usarse dentro de Server
 * Components, Server Actions y Route Handlers tras validar la sesión:
 * el `user_id` SIEMPRE proviene de la cookie firmada, nunca del cliente.
 */
export function supabaseAdmin(): SupabaseClient | null {
  if (supabaseEnv.url && supabaseEnv.anonKey && !supabaseEnv.serviceRoleKey) {
    console.error(
      "[Eunomia] SUPABASE_SERVICE_ROLE_KEY no configurada (o vacía): la sincronización de datos está DESACTIVADA. Cada navegador guardará solo en su localStorage. Añade la variable en Vercel.",
    );
    return null;
  }
  if (!isSupabaseConfigured()) return null;
  if (!adminClient) {
    adminClient = createClient(supabaseEnv.url!, supabaseEnv.serviceRoleKey!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return adminClient;
}

export { isSupabaseConfigured } from "@/lib/supabase/config";