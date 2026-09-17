import "server-only";
import { Resend } from "resend";

export function appUrl(): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

export function isEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

let client: Resend | null = null;

function emailClient(): Resend | null {
  if (client) return client;
  if (!isEmailConfigured()) return null;
  client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const client = emailClient();
  if (!client) return false;
  const { error } = await client.emails.send({
    from: process.env.EMAIL_FROM!,
    to: input.to,
    subject: input.subject,
    html: input.html,
  });
  return !error;
}