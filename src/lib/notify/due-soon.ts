import "server-only";
import type { DueSoonGroup } from "@/lib/data/repo";
import {
  getDueSoonGroups,
  hasNotification,
  markNotification,
  todayLocal,
} from "@/lib/data/repo";
import { appUrl, isEmailConfigured, sendEmail } from "@/lib/notify/email";
import { signAction } from "@/lib/notify/signed";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function formatDueLabel(dueDate: string | null, today: string): string {
  if (!dueDate) return "Sin fecha límite";
  if (dueDate === today) return "Hoy";
  const [y, m, d] = dueDate.split("-").map(Number);
  const [ty, tm, td] = today.split("-").map(Number);
  const diff = Math.round(
    (Date.UTC(y, m - 1, d) - Date.UTC(ty, tm - 1, td)) / 86_400_000,
  );
  if (diff < 0) return `Vencida hace ${-diff} ${-diff === 1 ? "día" : "días"}`;
  if (diff === 1) return "Mañana";
  return `En ${diff} días`;
}

export async function buildDueSoonEmail(group: DueSoonGroup): Promise<{
  subject: string;
  html: string;
}> {
  const base = appUrl();
  const today = todayLocal(group.profile.timezone);
  const sorted = [...group.tasks].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });

  const rows: string[] = [];
  for (const task of sorted) {
    const completeToken = await signAction({
      v: 1,
      action: "complete",
      userId: group.profile.id,
      taskId: task.id,
    });
    const snoozeToken = await signAction({
      v: 1,
      action: "snooze",
      userId: group.profile.id,
      taskId: task.id,
    });
    const completeUrl = `${base}/api/email/actions?t=${encodeURIComponent(completeToken)}`;
    const snoozeUrl = `${base}/api/email/actions?t=${encodeURIComponent(snoozeToken)}`;
    rows.push(`
      <tr>
        <td style="padding:14px 0;border-top:1px solid #26282e">
          <div style="font-size:15px;font-weight:600;color:#111">${escapeHtml(task.title)}</div>
          <div style="font-size:12px;color:#6b7280;margin-top:2px">Prioridad ${task.priority} · ${formatDueLabel(task.due_date, today)}</div>
          <div style="margin-top:10px">
            <a href="${completeUrl}" style="display:inline-block;background:#f59e0b;color:#000;font-weight:600;font-size:12px;padding:7px 12px;border-radius:8px;text-decoration:none;margin-right:6px">✓ Completar</a>
            <a href="${snoozeUrl}" style="display:inline-block;border:1px solid #d1d5db;color:#374151;font-size:12px;padding:7px 12px;border-radius:8px;text-decoration:none">Posponer 24 h</a>
          </div>
        </td>
      </tr>`);
  }

  const name = group.profile.name
    ? `, ${group.profile.name.split(" ")[0]}`
    : "";
  const count = sorted.length;
  const subject = `${count} ${count === 1 ? "tarea está por vencerse" : "tareas están por vencerse"} · Eunomia Tasks`;

  const html = `
  <div style="margin:0;padding:24px;background:#f3f4f6;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="padding:20px 24px;background:linear-gradient(135deg,#f59e0b,#ea580c);color:#000">
        <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em">Eunomia Tasks</div>
        <div style="font-size:13px;opacity:0.85">Lo que está por vencer sigue pendiente</div>
      </div>
      <div style="padding:24px">
        <h1 style="font-size:17px;margin:0 0 6px;color:#111">Hola${name}</h1>
        <p style="font-size:14px;color:#374151;margin:0 0 6px">
          Estas tareas tienen la fecha límite encima y aún siguen pendientes:
        </p>
        <table style="width:100%;border-collapse:collapse">${rows.join("")}</table>
        <div style="margin-top:16px;font-size:13px;color:#6b7280">
          ¿Quieres añadir una tarea nueva? <a href="${base}/?quickadd=1" style="color:#d97706;font-weight:600">Abre Eunomia</a>.
        </div>
        <div style="margin-top:24px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af">
          Recibes este aviso porque tienes tareas pendientes próximas a vencer. Se envía como máximo una vez al día.
        </div>
      </div>
    </div>
  </div>`;

  return { subject, html };
}

export async function runDueSoonEmails(): Promise<{
  sent: number;
  skipped: number;
}> {
  if (!isEmailConfigured()) return { sent: 0, skipped: 0 };
  const groups = await getDueSoonGroups(1);
  let sent = 0;
  let skipped = 0;
  for (const group of groups) {
    if (!group.profile.email) {
      skipped += 1;
      continue;
    }
    const day = todayLocal(group.profile.timezone);
    if (await hasNotification(group.profile.id, "email", "due_soon", day)) {
      skipped += 1;
      continue;
    }
    const mail = await buildDueSoonEmail(group);
    let ok = false;
    try {
      ok = await sendEmail({
        to: group.profile.email,
        subject: mail.subject,
        html: mail.html,
      });
    } catch {
      ok = false;
    }
    if (ok) {
      await markNotification(group.profile.id, "email", "due_soon", day);
      sent += 1;
    } else {
      skipped += 1;
    }
  }
  return { sent, skipped };
}