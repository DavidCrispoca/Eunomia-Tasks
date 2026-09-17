import "server-only";
import {
  getPrefs,
  hasNotification,
  listBriefingTargets,
  listPendingTasks,
  localHour,
  markNotification,
  todayLocal,
} from "@/lib/data/repo";
import { isWhatsAppConfigured, sendMessage } from "@/lib/notify/whatsapp";

function buildBriefingMessage(
  name: string | null,
  pending: { id: string; title: string; priority: string; due_date: string | null }[],
  day: string,
): string {
  const greeting = name ? ` ☀️ Buenos días, ${name.split(" ")[0]}` : "☀️ Buenos días";
  const header = `${greeting} · ${day}`;
  if (pending.length === 0) {
    return `${header}\n\nNo tienes tareas pendientes hoy. ¡Buen día!`;
  }
  const lines = pending
    .map((t, i) => {
      const due = t.due_date ? ` (para el ${t.due_date})` : "";
      return `${i + 1}. ${t.title}${due}`;
    })
    .join("\n");
  return [
    header,
    "",
    `Tienes ${pending.length} ${pending.length === 1 ? "tarea pendiente" : "tareas pendientes"}:`,
    "",
    lines,
    "",
    "Usa «completar <n>» para marcar una como hecha o «añadir <título>» para crear una nueva.",
  ].join("\n");
}

export async function runMorningBriefing(): Promise<{
  sent: number;
  skipped: number;
}> {
  if (!isWhatsAppConfigured()) return { sent: 0, skipped: 0 };
  const targets = await listBriefingTargets();
  let sent = 0;
  let skipped = 0;

  for (const profile of targets) {
    if (!profile.whatsapp_phone) {
      skipped += 1;
      continue;
    }
    const { briefing_time } = await getPrefs(profile.id);
    const hour = localHour(profile.timezone);
    const day = todayLocal(profile.timezone);

    if (hour !== briefing_time) {
      skipped += 1;
      continue;
    }
    if (await hasNotification(profile.id, "whatsapp", "briefing", day)) {
      skipped += 1;
      continue;
    }

    const pending = await listPendingTasks(profile.id);
    const body = buildBriefingMessage(profile.name, pending, day);
    const ok = await sendMessage(profile.whatsapp_phone, body);
    if (ok) {
      await markNotification(profile.id, "whatsapp", "briefing", day);
      sent += 1;
    } else {
      skipped += 1;
    }
  }

  return { sent, skipped };
}