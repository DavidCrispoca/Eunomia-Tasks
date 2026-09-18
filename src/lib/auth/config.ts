export const supabaseEnv = {
  url: process.env.NEXT_PUBLIC_SUPABASE_URL,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
};

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseEnv.url && supabaseEnv.anonKey);
}

export function allowedEmails(): string[] {
  const raw = process.env.ALLOWED_EMAILS ?? "";
  return raw
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/** Uso personal: solo entran las cuentas listadas (o todas si no hay allowlist). */
export function isAllowedEmail(email?: string | null): boolean {
  const list = allowedEmails();
  if (list.length === 0) return true;
  return list.includes((email ?? "").trim().toLowerCase());
}

/** Tu correo personal (respaldo: si la allowlist está vacía, se usa este). */
export function personalEmail(): string | undefined {
  return process.env.ALLOWED_EMAILS?.split(",")[0]?.trim() || undefined;
}
