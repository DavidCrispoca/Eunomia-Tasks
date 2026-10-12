import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const present = (value: string | undefined) => Boolean(value?.trim());

/** Rol declarado por una clave de Supabase (JWT legacy o clave nueva `sb_*`). */
function keyRole(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  const key = value.trim();
  if (key.startsWith("sb_secret")) return "sb_secret (service)";
  if (key.startsWith("sb_publishable")) return "sb_publishable (anon)";
  const parts = key.split(".");
  if (parts.length !== 3) return "(not-a-jwt)";
  try {
    const payload = JSON.parse(
      Buffer.from(parts[1], "base64url").toString(),
    ) as { role?: string; ref?: string };
    return payload.role ?? "(sin rol)";
  } catch {
    return "(jwt inválido)";
  }
}

/** Ref del proyecto Supabase a partir de la URL (no es secreto). */
function projectRef(value: string | undefined): string | null {
  const match = value?.match(/https:\/\/([a-z0-9]+)\.supabase\.co/);
  return match ? match[1] : null;
}

/**
 * Comprueba de verdad que la service role key puede leer la BD. Es la prueba
 * que distingue "variable presente" de "variable correcta".
 */
async function probeDatabase(): Promise<string> {
  const client = supabaseAdmin();
  if (!client) return "not-configured";
  try {
    const res = await client
      .from("activity_modes")
      .select("code")
      .limit(1);
    if (res.error) return `error: ${res.error.message.slice(0, 140)}`;
    return `ok (${res.data?.length ?? 0} filas)`;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return `throw: ${message.slice(0, 140)}`;
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    note: "Las NEXT_PUBLIC_* se inyectan al COMPILAR. Si aparecen false, añádelas en Vercel (Settings > Environment Variables) y haz REDEPLOY del último deployment; las demás variables se leen en runtime.",
    auth: {
      supabaseUrl: present(process.env.NEXT_PUBLIC_SUPABASE_URL),
      supabaseAnonKey: present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      sessionSecret: present(process.env.SESSION_SECRET),
    },
    data: {
      supabaseServiceRoleKey: present(process.env.SUPABASE_SERVICE_ROLE_KEY),
      projectRef: projectRef(process.env.NEXT_PUBLIC_SUPABASE_URL),
      anonKeyRole: keyRole(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY),
      serviceRoleKeyRole: keyRole(process.env.SUPABASE_SERVICE_ROLE_KEY),
      dbProbe: await probeDatabase(),
      ready:
        present(process.env.NEXT_PUBLIC_SUPABASE_URL) &&
        present(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) &&
        present(process.env.SUPABASE_SERVICE_ROLE_KEY),
    },
    email: {
      smtpConfigured:
        present(process.env.SMTP_HOST) &&
        present(process.env.SMTP_USER) &&
        present(process.env.SMTP_PASS) &&
        present(process.env.EMAIL_FROM),
      smtpHost: present(process.env.SMTP_HOST),
      smtpUser: present(process.env.SMTP_USER),
      smtpPass: present(process.env.SMTP_PASS),
      sender: present(process.env.EMAIL_FROM),
      resend: present(process.env.RESEND_API_KEY),
      mailHour: process.env.MAIL_HOUR?.trim() ? process.env.MAIL_HOUR : "8 (default)",
    },
  });
}
