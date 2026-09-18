import { createClient, type User } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { isSupabaseConfigured, supabaseEnv } from "@/lib/auth/config";
import { createCookieSupabaseClient } from "@/lib/auth/supabase-ssr";

export interface AuthResult {
  user: User | null;
  error?: string;
}

function authClient() {
  return createClient(supabaseEnv.url!, supabaseEnv.anonKey!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function signInWithPassword(
  email: string,
  password: string,
): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { user: null };
  const { data, error } = await authClient().auth.signInWithPassword({
    email,
    password,
  });
  if (error) return { user: null, error: error.message };
  return { user: data.user };
}

export async function signUpUser(params: {
  name?: string;
  email: string;
  password: string;
}): Promise<AuthResult> {
  if (!isSupabaseConfigured()) return { user: null };
  const { data, error } = await authClient().auth.signUp({
    email: params.email,
    password: params.password,
    options: { data: { name: params.name } },
  });
  if (error) return { user: null, error: String(error.code ?? error.message) };
  return { user: data.user };
}

/**
 * URL de inicio de sesión con Google (flujo PKCE).
 * Se usa el cliente SSR con cookies para que el verifier PKCE persista entre
 * la generación de la URL y el intercambio en el callback.
 */
export async function googleOAuthUrl(
  redirectTo: string,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const store = await cookies();
  const client = createCookieSupabaseClient(() => store);
  if (!client) return null;
  const { data, error } = await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo },
  });
  if (error) return null;
  return data.url ?? null;
}
