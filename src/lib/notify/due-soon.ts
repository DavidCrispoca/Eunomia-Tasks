import "server-only";
import type { DueSoonGroup } from "@/lib/data/repo";
import {
  addDaysToISO,
  getDueGroups,
  hasNotification,
  localHour,
  markNotification,
  todayLocal,
} from "@/lib/data/repo";
import { appUrl, isEmailConfigured, sendEmail } from "@/lib/notify/email";
import { signAction } from "@/lib/notify/signed";

type MailTask = { id: string; title: string; priority: string; due_date: string | null };

const RAW_HOUR = Number(process.env.MAIL_HOUR ?? "8");
const MAIL_HOUR =
  Number.isInteger(RAW_HOUR) && RAW_HOUR >= 0 && RAW_HOUR <= 23 ? RAW_HOUR : 8;

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

function isMondayLocal(timezone: string): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  }).format(new Date());
  return weekday === "Mon";
}

function sortByDue(list: MailTask[]): MailTask[] {
  return [...list].sort((a, b) => {
    if (!a.due_date) return 1;
    if (!b.due_date) return -1;
    return a.due_date.localeCompare(b.due_date);
  });
}

async function taskRows(
  group: DueSoonGroup,
  tasks: MailTask[],
  today: string,
): Promise<string> {
  const base = appUrl();
  const rows: string[] = [];
  for (const task of tasks) {
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
  return rows.join("");
}

function addTaskBlock(html: string): string {
  return `
    <div style="margin-top:16px;background:#fef3c7;border:1px solid #fcd34d;border-radius:12px;padding:14px 16px">
      <div style="font-size:14px;color:#92400e;font-weight:600">¿Necesitas capturar una tarea nueva?</div>
      <div style="font-size:13px;color:#b45309;margin:4px 0 10px">Respóndete en 30 segundos desde este correo, sin necesidad de iniciar sesión.</div>
      ${html}
    </div>`;
}

function emailShell(opts: {
  name: string | null;
  subject: string;
  intro: string;
  sections: { heading: string; rows: string }[];
  addLink: string;
}): { subject: string; html: string } {
  const name = opts.name ? `, ${opts.name.split(" ")[0]}` : "";
  const sections = opts.sections
    .map(
      (s) => `
        <h2 style="font-size:13px;text-transform:uppercase;letter-spacing:0.04em;color:#6b7280;margin:18px 0 2px">${s.heading}</h2>
        <table style="width:100%;border-collapse:collapse">${s.rows}</table>`,
    )
    .join("");

  const html = `
  <div style="margin:0;padding:24px;background:#f3f4f6;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif">
    <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
      <div style="padding:20px 24px;background:linear-gradient(135deg,#f59e0b,#ea580c);color:#000">
        <div style="font-size:18px;font-weight:700;letter-spacing:-0.02em">Eunomia Tasks</div>
        <div style="font-size:13px;opacity:0.85">Lo que está por vencer sigue pendiente</div>
      </div>
      <div style="padding:24px">
        <h1 style="font-size:17px;margin:0 0 6px;color:#111">Hola${name}</h1>
        <p style="font-size:14px;color:#374151;margin:0 0 6px">${opts.intro}</p>
        ${sections}
        ${addTaskBlock(opts.addLink)}
        <div style="margin-top:24px;padding-top:14px;border-top:1px solid #e5e7eb;font-size:11px;color:#9ca3af">
          Recibes este aviso porque tienes tareas pendientes próximas a vencer. Máximo un correo al día; los lunes incluye el resumen semanal.
        </div>
      </div>
    </div>
  </div>`;

  return { subject: opts.subject, html };
}

export async function buildDailyEmail(
  group: DueSoonGroup,
  todayTasks: MailTask[],
  today: string,
): Promise<{ subject: string; html: string }> {
  const rows = await taskRows(group, todayTasks, today);
  const count = todayTasks.length;
  const subject = `${count} ${count === 1 ? "tarea pendiente para hoy" : "tareas pendientes para hoy"} · Eunomia Tasks`;
  const addToken = await signAction({ v: 1, action: "add", userId: group.profile.id });
  const addLink = `<a href="${appUrl()}/add?s=${encodeURIComponent(addToken)}" style="display:inline-block;background:#d97706;color:#fff;font-weight:600;font-size:13px;padding:9px 14px;border-radius:8px;text-decoration:none">➕ Añadir tarea al tablero</a>`;
  return emailShell({
    name: group.profile.name,
    subject,
    intro: `Tienes estas tareas para hoy (o que ya vencieron) y siguen pendientes:`,
    sections: [{ heading: "Para hoy", rows }],
    addLink,
  });
}

export async function buildWeeklyEmail(
  group: DueSoonGroup,
  todayTasks: MailTask[],
  weekTasks: MailTask[],
  today: string,
): Promise<{ subject: string; html: string }> {
  const sections: { heading: string; rows: string }[] = [];
  if (todayTasks.length > 0) {
    sections.push({
      heading: "Vencen hoy",
      rows: await taskRows(group, todayTasks, today),
    });
  }
  if (weekTasks.length > 0) {
    sections.push({
      heading: "Vencen esta semana",
      rows: await taskRows(group, weekTasks, today),
    });
  }
  const total = todayTasks.length + weekTasks.length;
  const subject = `${total} ${total === 1 ? "tarea para esta semana" : "tareas para esta semana"} · Eunomia Tasks`;
  const addToken = await signAction({ v: 1, action: "add", userId: group.profile.id });
  const addLink = `<a href="${appUrl()}/add?s=${encodeURIComponent(addToken)}" style="display:inline-block;background:#d97706;color:#fff;font-weight:600;font-size:13px;padding:9px 14px;border-radius:8px;text-decoration:none">➕ Añadir tarea al tablero</a>`;
  return emailShell({
    name: group.profile.name,
    subject,
    intro: `Este es tu resumen semanal de lo que vence esta semana.`,
    sections,
    addLink,
  });
}

export async function runDueSoonEmails(): Promise<{
  sent: number;
  skipped: number;
}> {
  if (!isEmailConfigured()) return { sent: 0, skipped: 0 };

  // Ventanas en días UTC: diario cubre vencidas(-7 días) y hasta hoy/tarde,
  // semanal cubre hasta +7 para el envío de los lunes.
  const [todayGroups, weekGroups] = await Promise.all([
    getDueGroups(-7, 1),
    getDueGroups(-1, 7),
  ]);

  const byUser = new Map<
    string,
    { group: DueSoonGroup; tasks: MailTask[] }
  >();
  for (const group of [...todayGroups, ...weekGroups]) {
    const entry = byUser.get(group.profile.id) ?? {
      group,
      tasks: [] as MailTask[],
    };
    for (const task of group.tasks) {
      if (!entry.tasks.some((t) => t.id === task.id)) entry.tasks.push(task);
    }
    byUser.set(group.profile.id, entry);
  }

  let sent = 0;
  let skipped = 0;
  for (const { group, tasks } of byUser.values()) {
    if (!group.profile.email) {
      skipped += 1;
      continue;
    }
    const day = todayLocal(group.profile.timezone);
    const hour = localHour(group.profile.timezone);
    if (hour !== MAIL_HOUR) {
      skipped += 1;
      continue;
    }

    const sorted = sortByDue(tasks);
    const todayTasks = sorted.filter(
      (t) => t.due_date !== null && t.due_date <= day,
    );
    const weekEnd = addDaysToISO(day, 6);
    const weekTasks = sorted.filter(
      (t) => t.due_date !== null && t.due_date > day && t.due_date <= weekEnd,
    );

    const notifiedToday = await hasNotification(
      group.profile.id,
      "email",
      "due_soon",
      day,
    );
    const notifiedWeek = await hasNotification(
      group.profile.id,
      "email",
      "due_week",
      day,
    );

    let mail: { subject: string; html: string };
    let markKind: "due_soon" | "due_week";
    if (
      isMondayLocal(group.profile.timezone) &&
      !notifiedWeek &&
      (todayTasks.length > 0 || weekTasks.length > 0)
    ) {
      mail = await buildWeeklyEmail(group, todayTasks, weekTasks, day);
      markKind = "due_week";
    } else if (!notifiedToday && todayTasks.length > 0) {
      mail = await buildDailyEmail(group, todayTasks, day);
      markKind = "due_soon";
    } else {
      skipped += 1;
      continue;
    }

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
      await markNotification(group.profile.id, "email", markKind, day);
      sent += 1;
    } else {
      skipped += 1;
    }
  }
  return { sent, skipped };
}