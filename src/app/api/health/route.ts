import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const present = (value: string | undefined) => Boolean(value?.trim());

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