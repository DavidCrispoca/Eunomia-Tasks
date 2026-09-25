import "server-only";
import { randomUUID } from "node:crypto";
import type { Language, Task, TaskGroup, TaskPriority, TimeBlock } from "@/types";
import { isSupabaseConfigured, supabaseAdmin } from "@/lib/supabase/server";
import { addMinutesToHHMM } from "@/lib/utils";
import {
  defaultGroups,
  defaultTasks,
  defaultTimeBlocks,
  isSeedDataset,
} from "@/lib/storage/local-storage-store";
import {
  blockFromRow,
  blockToRow,
  groupFromRow,
  groupToRow,
  taskFromRow,
  taskToRow,
  type BlockRow,
  type CloudData,
  type GroupRow,
  type TaskRow,
} from "@/lib/data/mappers";

export type Profile = {
  id: string;
  email: string;
  name: string | null;
  timezone: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function utcISO(offsetDays = 0): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function addDaysToISO(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

function timeZoneNow(timezone: string): { date: string; hour: number } {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  const hour = Number(get("hour") ?? 0);
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    hour: hour === 24 ? 0 : hour,
  };
}

export function todayLocal(timezone: string): string {
  return timeZoneNow(timezone).date;
}

export function localHour(timezone: string): number {
  return timeZoneNow(timezone).hour;
}

// ─────────────────────────────────────────────────────────────
// Dataset (tasks + blocks + idioma)
// ─────────────────────────────────────────────────────────────

export async function getDatasetForUser(
  userId: string,
): Promise<CloudData | null> {
  const db = supabaseAdmin();
  if (!db) return null;
  const [tasksRes, blocksRes, groupsRes, prefsRes] = await Promise.all([
    db
      .from("tasks")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    db
      .from("time_blocks")
      .select("*")
      .eq("user_id", userId)
      .order("date", { ascending: true })
      .order("start", { ascending: true }),
    db
      .from("task_groups")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: true }),
    db
      .from("user_prefs")
      .select("language")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);
  if (tasksRes.error || blocksRes.error || groupsRes.error) return null;
  const tasks = (tasksRes.data ?? []) as unknown as TaskRow[];
  const blocks = (blocksRes.data ?? []) as unknown as BlockRow[];
  const groups = (groupsRes.data ?? []) as unknown as GroupRow[];
  const language: Language = prefsRes.data?.language === "en" ? "en" : "es";
  return {
    tasks: tasks.map(taskFromRow),
    blocks: blocks.map(blockFromRow),
    groups: groups.map(groupFromRow),
    language,
  };
}

export async function ensureSeedForUser(
  userId: string,
): Promise<CloudData | null> {
  const existing = await getDatasetForUser(userId);
  if (existing && (existing.tasks.length > 0 || existing.blocks.length > 0)) {
    return existing;
  }
  const db = supabaseAdmin();
  if (!db) return null;

  const idMap = new Map<string, string>();
  const tasks = defaultTasks().map((t) => {
    const id = randomUUID();
    idMap.set(t.id, id);
    return { ...t, id };
  });
  const blocks = defaultTimeBlocks().flatMap((b) => {
    const taskId = b.taskId ? idMap.get(b.taskId) : undefined;
    if (b.taskId && !taskId) return [];
    return [{ ...b, id: randomUUID(), taskId, color: b.color ?? "default" }] as TimeBlock[];
  });
  const groups = defaultGroups().map((g) => ({ ...g, id: randomUUID() }));

  const taskRes = await db
    .from("tasks")
    .insert(tasks.map((t) => taskToRow(userId, t)));
  if (taskRes.error) return null;
  if (blocks.length > 0) {
    const blockRes = await db
      .from("time_blocks")
      .insert(blocks.map((b) => blockToRow(userId, b)));
    if (blockRes.error) return null;
  }
  if (groups.length > 0) {
    const groupRes = await db
      .from("task_groups")
      .insert(groups.map((g) => groupToRow(userId, g)));
    if (groupRes.error) return null;
  }
  await db
    .from("user_prefs")
    .upsert({ user_id: userId, language: "es" }, { onConflict: "user_id" });
  return { tasks, blocks, groups, language: "es" };
}

export async function replaceAllForUser(
  userId: string,
  tasks: Task[],
  blocks: TimeBlock[],
  groups: TaskGroup[],
): Promise<boolean> {
  const db = supabaseAdmin();
  if (!db) return false;
  // Candado anti-pérdida: si el dataset entrante parece la semilla de arranque
  // pero la cuenta ya tiene datos reales, aborta el reemplazo (no borrar).
  if (isSeedDataset(tasks)) {
    const existing = await getDatasetForUser(userId);
    if (existing && existing.tasks.length > 0 && !isSeedDataset(existing.tasks)) {
      console.error(
        "[Eunomia] Reemplazo abortado: dataset entrante parece semilla y la cuenta tiene datos reales.",
      );
      return false;
    }
  }
  const delBlocks = await db.from("time_blocks").delete().eq("user_id", userId);
  if (delBlocks.error) return false;
  const delTasks = await db.from("tasks").delete().eq("user_id", userId);
  if (delTasks.error) return false;
  const delGroups = await db.from("task_groups").delete().eq("user_id", userId);
  if (delGroups.error) return false;
  if (groups.length > 0) {
    const insGroups = await db
      .from("task_groups")
      .insert(groups.map((g) => groupToRow(userId, g)));
    if (insGroups.error) return false;
  }
  if (tasks.length > 0) {
    const insTasks = await db
      .from("tasks")
      .insert(tasks.map((t) => taskToRow(userId, t)));
    if (insTasks.error) return false;
  }
  if (blocks.length > 0) {
    const insBlocks = await db
      .from("time_blocks")
      .insert(blocks.map((b) => blockToRow(userId, b)));
    if (insBlocks.error) return false;
  }
  return true;
}

// ─────────────────────────────────────────────────────────────
// Preferencias
// ─────────────────────────────────────────────────────────────

export async function saveLanguage(
  userId: string,
  language: Language,
): Promise<boolean> {
  const db = supabaseAdmin();
  if (!db) return false;
  const res = await db
    .from("user_prefs")
    .upsert(
      { user_id: userId, language, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    );
  return !res.error;
}

// ─────────────────────────────────────────────────────────────
// Tareas (acciones usadas por correo)
// ─────────────────────────────────────────────────────────────

export async function completeTaskById(userId: string, taskId: string): Promise<boolean> {
  const db = supabaseAdmin();
  if (!db) return false;
  const res = await db
    .from("tasks")
    .update({
      status: "done",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("user_id", userId)
    .in("status", ["todo", "doing"]);
  return !res.error;
}

export async function snoozeTaskById(
  userId: string,
  taskId: string,
  days = 1,
): Promise<void> {
  const db = supabaseAdmin();
  if (!db) return;
  const res = await db
    .from("tasks")
    .select("due_date")
    .eq("id", taskId)
    .eq("user_id", userId)
    .maybeSingle();
  if (res.error) return;
  const base = res.data?.due_date ?? utcISO(0);
  const [y, m, d] = `${base}`.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + days));
  await db
    .from("tasks")
    .update({
      due_date: `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId)
    .eq("user_id", userId);
}

export async function addTaskForUser(
  userId: string,
  title: string,
  opts: {
    priority?: TaskPriority;
    dueDate?: string;
    dueTime?: string;
    notes?: string;
  } = {},
): Promise<void> {
  const db = supabaseAdmin();
  if (!db) return;
  const id = randomUUID();
  await db.from("tasks").insert({
    id,
    user_id: userId,
    title,
    notes: opts.notes ?? "",
    status: "todo",
    priority: opts.priority ?? "medium",
    due_date: opts.dueDate ?? null,
    order: 0,
    created_at: new Date().toISOString(),
  });
  if (opts.dueDate && opts.dueTime) {
    await db.from("time_blocks").insert({
      id: randomUUID(),
      user_id: userId,
      task_id: id,
      title,
      date: opts.dueDate,
      start: opts.dueTime,
      end: addMinutesToHHMM(opts.dueTime, 60),
      color:
        opts.priority === "high"
          ? "red"
          : opts.priority === "low"
            ? "green"
            : "orange",
      created_at: new Date().toISOString(),
    });
  }
}

// ─────────────────────────────────────────────────────────────
// Grupos de tareas por vencer (para el correo)
// ─────────────────────────────────────────────────────────────

export type DueSoonGroup = {
  profile: Profile;
  tasks: { id: string; title: string; priority: TaskPriority; due_date: string | null }[];
};

export async function getDueGroups(
	fromDays: number,
	toDays: number,
): Promise<DueSoonGroup[]> {
	if (!isSupabaseConfigured()) {
		const from = utcISO(fromDays);
		const to = utcISO(toDays);
		const tasks = defaultTasks()
			.filter(
				(t) =>
					t.status !== "done" &&
					t.dueDate &&
					t.dueDate >= from &&
					t.dueDate <= to,
			)
			.map((t) => ({
				id: t.id,
				title: t.title,
				priority: t.priority,
				due_date: t.dueDate ?? null,
			}));
		if (tasks.length === 0) return [];
		return [
			{
				profile: {
					id: "demo-david",
					email: "demo-david.crispoca@gmail.com",
					name: "David Crispoca",
					timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
				},
				tasks,
			},
		];
	}

	const db = supabaseAdmin();
  if (!db) return [];
  const from = utcISO(fromDays);
  const to = utcISO(toDays);

  const { data, error } = await db
    .from("tasks")
    .select("id,user_id,title,priority,due_date")
    .neq("status", "done")
    .not("due_date", "is", null)
    .gte("due_date", from)
    .lte("due_date", to)
    .limit(5000);

  if (error || !data) return [];

  const byUser = new Map<string, { id: string; title: string; priority: TaskPriority; due_date: string | null }[]>();
  for (const row of data as unknown as { id: string; user_id: string; title: string; priority: TaskPriority; due_date: string | null }[]) {
    const list = byUser.get(row.user_id) ?? [];
    list.push({ id: row.id, title: row.title, priority: row.priority, due_date: row.due_date });
    byUser.set(row.user_id, list);
  }
  if (byUser.size === 0) return [];

  const userIds = [...byUser.keys()];
  const profilesRes = await db.from("profiles").select("*").in("id", userIds);
  if (profilesRes.error || !profilesRes.data) return [];

  return (profilesRes.data as unknown as Profile[]).map((profile) => ({
    profile,
    tasks: byUser.get(profile.id) ?? [],
  }));
}

// ─────────────────────────────────────────────────────────────
// Deduplicación de notificaciones
// ─────────────────────────────────────────────────────────────

export async function hasNotification(
  userId: string,
  channel: "email",
  kind: "due_soon" | "due_week",
  day: string,
): Promise<boolean> {
  const db = supabaseAdmin();
  if (!db) return false;
  const res = await db
    .from("notifications")
    .select("id")
    .eq("user_id", userId)
    .eq("channel", channel)
    .eq("kind", kind)
    .eq("day", day)
    .maybeSingle();
  return Boolean(res.data);
}

export async function markNotification(
  userId: string,
  channel: "email",
  kind: "due_soon" | "due_week",
  day: string,
): Promise<void> {
  const db = supabaseAdmin();
  if (!db) return;
  await db
    .from("notifications")
    .upsert(
      {
        user_id: userId,
        channel,
        kind,
        day,
        sent_at: new Date().toISOString(),
      },
      { onConflict: "user_id,channel,kind,day" },
    );
}

// ─────────────────────────────────────────────────────────────
// Utilidades de base de datos
// ─────────────────────────────────────────────────────────────

export async function isDatabaseReady(): Promise<boolean> {
  return isSupabaseConfigured() && supabaseAdmin() !== null;
}