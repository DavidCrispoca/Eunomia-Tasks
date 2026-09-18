import { createClient, type User } from "@supabase/supabase-js";
import { isSupabaseConfigured, supabaseEnv } from "@/lib/auth/config";

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
