import type { Language, Task, TaskGroup, TaskPriority, TaskStatus, TimeBlock } from "@/types";

export interface TaskRow {
  id: string;
  user_id: string;
  title: string;
  notes: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  completed_at: string | null;
  order: number;
  group_id: string | null;
  focus_minutes: number | null;
  created_at: string;
  updated_at: string;
}

export interface BlockRow {
  id: string;
  user_id: string;
  task_id: string | null;
  title: string;
  date: string;
  start: string;
  end: string;
  color: TimeBlock["color"];
  created_at: string;
  updated_at: string;
}

export interface GroupRow {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export function taskFromRow(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    notes: row.notes ?? "",
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date ?? undefined,
    completedAt: row.completed_at ?? undefined,
    order: Number(row.order ?? 0),
    groupId: row.group_id ?? undefined,
    focusMinutes: row.focus_minutes ? Number(row.focus_minutes) : undefined,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

export function blockFromRow(row: BlockRow): TimeBlock {
  return {
    id: row.id,
    taskId: row.task_id ?? undefined,
    title: row.title,
    date: row.date,
    start: row.start,
    end: row.end,
    color: row.color ?? "default",
  };
}

export function groupFromRow(row: GroupRow): TaskGroup {
  return {
    id: row.id,
    name: row.name,
  };
}

export function taskToRow(userId: string, task: Task): Omit<TaskRow, "created_at" | "updated_at"> {
  return {
    id: task.id,
    user_id: userId,
    title: task.title,
    notes: task.notes ?? "",
    status: task.status,
    priority: task.priority ?? "medium",
    due_date: task.dueDate ?? null,
    completed_at: task.completedAt ?? null,
    order: Number(task.order ?? 0),
    group_id: task.groupId ?? null,
    focus_minutes: task.focusMinutes ?? 0,
  };
}

export function blockToRow(userId: string, block: TimeBlock): Omit<BlockRow, "created_at" | "updated_at"> {
  return {
    id: block.id,
    user_id: userId,
    task_id: block.taskId ?? null,
    title: block.title,
    date: block.date,
    start: block.start,
    end: block.end,
    color: block.color ?? "default",
  };
}

export function groupToRow(userId: string, group: TaskGroup): Omit<GroupRow, "created_at" | "updated_at"> {
  return {
    id: group.id,
    user_id: userId,
    name: group.name,
  };
}

export type CloudData = {
  tasks: Task[];
  blocks: TimeBlock[];
  groups: TaskGroup[];
  language: Language;
};

export type LanguageRow = { language: Language };

export function isLanguage(value: unknown): value is Language {
  return value === "es" || value === "en";
}