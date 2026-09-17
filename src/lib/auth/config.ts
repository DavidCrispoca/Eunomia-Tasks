export const supabaseEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseEnv.url && supabaseEnv.anonKey);
}