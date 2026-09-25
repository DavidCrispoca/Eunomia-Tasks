import type { Task, TaskGroup, TimeBlock } from "@/types";
import { hhmmToMinutes } from "@/lib/utils";
import type { DataStore } from "@/lib/storage/store";

export const TASKS_KEY = "eunomia:tasks";
export const BLOCKS_KEY = "eunomia:blocks";
export const GROUPS_KEY = "eunomia:groups";
export const LANG_KEY = "eunomia:lang";

type Listener = () => void;
const listeners = new Set<Listener>();

export function subscribeStore(listener: Listener) {
  listeners.add(listener);
  const onStorage = () => listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function notify() {
  for (const listener of listeners) listener();
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    notify();
  } catch {
    // storage full or unavailable — ignore for local MVP
  }
}

export const localStorageStore: DataStore = {
  loadTasks() {
    const tasks = readJson<Task[]>(TASKS_KEY);
    if (tasks && Array.isArray(tasks)) return tasks;
    return seedTasks();
  },
  loadTimeBlocks() {
    const blocks = readJson<TimeBlock[]>(BLOCKS_KEY);
    if (blocks && Array.isArray(blocks)) return blocks;
    return seedTimeBlocks();
  },
  loadLanguage() {
    try {
      const raw = localStorage.getItem(LANG_KEY);
      return raw === "en" || raw === "es" ? raw : null;
    } catch {
      return null;
    }
  },
  saveTasks(tasks) {
    writeJson(TASKS_KEY, tasks);
  },
  saveTimeBlocks(blocks) {
    writeJson(BLOCKS_KEY, blocks);
  },
  loadGroups() {
    const groups = readJson<TaskGroup[]>(GROUPS_KEY);
    if (groups && Array.isArray(groups)) return groups;
    return defaultGroups();
  },
  saveGroups(groups) {
    writeJson(GROUPS_KEY, groups);
  },
  saveLanguage(lang) {
    try {
      localStorage.setItem(LANG_KEY, lang);
      notify();
    } catch {
      // ignore
    }
  },
};

export function defaultTasks(): Task[] {
  return seedTasks();
}

export function defaultTimeBlocks(): TimeBlock[] {
  return seedTimeBlocks();
}

export function defaultGroups(): TaskGroup[] {
  return [];
}

/**
 * Detecta si una lista de items tiene únicamente tareas "de arranque" (viejas
 * o actuales). Sirve de candado para no reemplazar datos reales del usuario
 * por el dataset de semilla (identificadas por su id `seed-*` o su título).
 */
export function isSeedDataset<T extends { id: string; title?: string }>(
  items: T[],
): boolean {
  if (items.length === 0) return false;
  const seed = defaultTasks();
  if (items.length > seed.length) return false;
  const ids = new Set(seed.map((t) => t.id));
  const titles = new Set(seed.map((t) => t.title));
  return items.every(
    (it) => ids.has(it.id) || (it.title !== undefined && titles.has(it.title)),
  );
}

function seedTasks(): Task[] {
  const now = new Date();
  // Fecha UTC (no local) para que el SSR del servidor y el cliente hidraten
  // con el mismo día, evitando errores de hydration al cargar por primera vez.
  const base = now.toISOString().slice(0, 10);
  return [
    {
      id: "seed-review-briefing",
      title: "Revisar las prioridades del día",
      notes: "Leer las prioridades y preparar el plan matutino.",
      status: "todo",
      priority: "high",
      dueDate: base,
      order: 0,
      createdAt: now.toISOString(),
    },
    {
      id: "seed-tiempo-enfoque",
      title: "Bloquear tiempo de enfoque",
      notes: "Reservar 2 horas sin interrupciones para el trabajo profundo.",
      status: "todo",
      priority: "medium",
      dueDate: base,
      order: 1,
      createdAt: now.toISOString(),
    },
    {
      id: "seed-email",
      title: "Responder correos pendientes",
      notes: "",
      status: "doing",
      priority: "low",
      dueDate: base,
      order: 0,
      createdAt: now.toISOString(),
    },
    {
      id: "seed-cleaned",
      title: "Configurar Eunomia Tasks",
      notes: "Bienvenido a tu nueva herramienta de orden diario.",
      status: "done",
      priority: "medium",
      order: 0,
      createdAt: now.toISOString(),
    },
  ];
}

function seedTimeBlocks(): TimeBlock[] {
  const now = new Date();
  // Misma estrategia que seedTasks: fecha UTC estable entre servidor y cliente.
  const today = now.toISOString().slice(0, 10);
  const start = new Date(now);
  start.setHours(9, 0, 0, 0);
  const end = new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) =>
    `${String(d.getHours()).padStart(2, "0")}:${String(
      d.getMinutes(),
    ).padStart(2, "0")}`;

  const startMin = hhmmToMinutes(fmt(start));
  const endMin = hhmmToMinutes(fmt(end));
  if (endMin < startMin || startMin < 7 * 60 || endMin > 21 * 60) {
    return [];
  }

  return [
    {
      id: "seed-block-focus",
      taskId: "seed-tiempo-enfoque",
      title: "Bloque de enfoque",
      date: today,
      start: fmt(start),
      end: fmt(end),
      color: "blue",
    },
  ];
}