import "server-only";
import { Resend } from "resend";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

export function appUrl(): string {
  return process.env.APP_URL?.replace(/\/$/, "") ?? "http://localhost:3000";
}

function hasSmtp(): boolean {
  return Boolean(
    process.env.SMTP_HOST &&
      process.env.SMTP_USER &&
      process.env.SMTP_PASS &&
      process.env.EMAIL_FROM,
  );
}

function hasResend(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

export function isEmailConfigured(): boolean {
  return hasSmtp() || hasResend();
}

let smtp: Transporter | null = null;

function smtpTransport(): Transporter | null {
  if (smtp) return smtp;
  if (!hasSmtp()) return null;
  smtp = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT ?? "465"),
    secure: process.env.SMTP_SECURE !== "false",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  return smtp;
}

let client: Resend | null = null;

function emailClient(): Resend | null {
  if (client) return client;
  if (!process.env.RESEND_API_KEY) return null;
  client = new Resend(process.env.RESEND_API_KEY);
  return client;
}

export async function sendEmail(input: {
  to: string;
  subject: string;
  html: string;
}): Promise<boolean> {
  const transport = smtpTransport();
  if (transport) {
    try {
      await transport.sendMail({
        from: process.env.EMAIL_FROM!,
        to: input.to,
        subject: input.subject,
        html: input.html,
      });
      return true;
    } catch (err) {
      console.error("[Eunomia] Error enviando correo por SMTP:", err);
      return false;
    }
  }

  const client = emailClient();
  if (!client || !process.env.EMAIL_FROM) return false;
  try {
    const { error } = await client.emails.send({
      from: process.env.EMAIL_FROM,
      to: input.to,
      subject: input.subject,
      html: input.html,
    });
    return !error;
  } catch (err) {
    console.error("[Eunomia] Error enviando correo por Resend:", err);
    return false;
  }
}