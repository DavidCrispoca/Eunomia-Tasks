"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import type {
  Task,
  TaskGroup,
  TimeBlock,
  TaskPriority,
  TaskStatus,
} from "@/types";
import type { CloudData } from "@/lib/data/mappers";
import {
  BLOCKS_KEY,
  GROUPS_KEY,
  TASKS_KEY,
  defaultGroups,
  defaultTasks,
  defaultTimeBlocks,
  localStorageStore,
} from "@/lib/storage/local-storage-store";
import { useSynced } from "@/lib/storage/synced";
import { persistCloudData, pullCloudData } from "@/lib/data/actions";
import { uid } from "@/lib/utils";

interface NewTaskInput {
  title: string;
  notes?: string;
  priority?: TaskPriority;
  dueDate?: string;
  status?: TaskStatus;
  groupId?: string;
}

interface NewTimeBlockInput {
  title: string;
  date: string;
  start: string;
  end: string;
  taskId?: string;
  color?: TimeBlock["color"];
}

interface DataContextValue {
  tasks: Task[];
  blocks: TimeBlock[];
  groups: TaskGroup[];
  addTask: (input: NewTaskInput) => Task;
  updateTask: (id: string, patch: Partial<Omit<Task, "id" | "createdAt">>) => void;
  deleteTask: (id: string) => void;
  setTasks: (tasks: Task[]) => void;
  addTimeBlock: (input: NewTimeBlockInput) => TimeBlock;
  updateTimeBlock: (id: string, patch: Partial<Omit<TimeBlock, "id">>) => void;
  deleteTimeBlock: (id: string) => void;
  setTimeBlocks: (blocks: TimeBlock[]) => void;
  addGroup: (name: string) => TaskGroup;
  updateGroup: (id: string, patch: Partial<Omit<TaskGroup, "id" | "createdAt">>) => void;
  deleteGroup: (id: string) => void;
  setGroups: (groups: TaskGroup[]) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/** Serialización canónica (orden de claves estable) para comparar datasets. */
function canonicalJson(value: unknown): string {
  return JSON.stringify(value, (_, current) =>
    current !== null &&
    typeof current === "object" &&
    !Array.isArray(current)
      ? Object.fromEntries(
          Object.entries(current as Record<string, unknown>).sort(
            ([a], [b]) => (a < b ? -1 : a > b ? 1 : 0),
          ),
        )
      : current,
  );
}

function hasRawValue(key: string, value: unknown): boolean {
  const raw = readRaw(key);
  return raw !== null && canonicalJson(JSON.parse(raw)) === canonicalJson(value);
}

export function DataProvider({
  initialData,
  children,
}: {
  initialData?: CloudData | null;
  children: ReactNode;
}) {
  const tasks = useSynced<Task[]>(TASKS_KEY, () => defaultTasks());
  const blocks = useSynced<TimeBlock[]>(BLOCKS_KEY, () => defaultTimeBlocks());
  const groups = useSynced<TaskGroup[]>(GROUPS_KEY, () => defaultGroups());

  const cloud = Boolean(initialData);
  const hydrated = useRef(false);

  useEffect(() => {
    if (cloud) {
      console.info("[Eunomia] Sincronización en la nube activada.");
    } else {
      console.warn(
        "[Eunomia] Modo SOLO local: la sincronización en la nube está desactivada. Revisa SUPABASE_SERVICE_ROLE_KEY (y las demás variables) en las variables de entorno de Vercel.",
      );
    }
  }, [cloud]);

  // 1. Hidratar el almacén local con los datos del servidor en el primer render.
  useEffect(() => {
    if (!initialData || hydrated.current) return;
    hydrated.current = true;
    try {
      if (!hasRawValue(TASKS_KEY, initialData.tasks)) {
        localStorageStore.saveTasks(initialData.tasks);
      }
      if (!hasRawValue(BLOCKS_KEY, initialData.blocks)) {
        localStorageStore.saveTimeBlocks(initialData.blocks);
      }
      if (!hasRawValue(GROUPS_KEY, initialData.groups)) {
        localStorageStore.saveGroups(initialData.groups);
      }
    } catch {
      // sin almacenamiento local: seguimos con los datos en memoria
    }
  }, [initialData]);

  // 2. Persistir en la nube cada cambio (optimista + debounce).
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!cloud) return;
    if (persistTimer.current) clearTimeout(persistTimer.current);
    persistTimer.current = setTimeout(() => {
      void persistCloudData(tasks, blocks, groups);
    }, 600);
    return () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    };
  }, [tasks, blocks, groups, cloud]);

  // 3. Sincronizar entre dispositivos: polling + focus por si cambió en la nube.
  useEffect(() => {
    if (!cloud) return;
    const pull = async () => {
      if (persistTimer.current) return; // no pisar una edición aún no persistida
      const data = await pullCloudData();
      if (!data) return;
      if (!hasRawValue(TASKS_KEY, data.tasks)) {
        localStorageStore.saveTasks(data.tasks);
      }
      if (!hasRawValue(BLOCKS_KEY, data.blocks)) {
        localStorageStore.saveTimeBlocks(data.blocks);
      }
      if (!hasRawValue(GROUPS_KEY, data.groups)) {
        localStorageStore.saveGroups(data.groups);
      }
    };
    const onFocus = () => void pull();
    window.addEventListener("focus", onFocus);
    const interval = window.setInterval(() => void pull(), 30_000);
    return () => {
      window.removeEventListener("focus", onFocus);
      window.clearInterval(interval);
    };
  }, [cloud]);

  const value = useMemo<DataContextValue>(
    () => ({
      tasks,
      blocks,
      groups,
      addTask(input) {
        const task: Task = {
          id: uid(),
          title: input.title,
          notes: input.notes ?? "",
          priority: input.priority ?? "medium",
          dueDate: input.dueDate,
          status: input.status ?? "todo",
          groupId: input.groupId,
          completedAt:
            (input.status ?? "todo") === "done"
              ? new Date().toISOString()
              : undefined,
          order: 0,
          createdAt: new Date().toISOString(),
        };
        localStorageStore.saveTasks([
          ...tasks.map((t) =>
            t.status === task.status ? { ...t, order: t.order + 1 } : t,
          ),
          task,
        ]);
        return task;
      },
      updateTask(id, patch) {
        localStorageStore.saveTasks(
          tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
        );
      },
      deleteTask(id) {
        localStorageStore.saveTasks(tasks.filter((t) => t.id !== id));
        localStorageStore.saveTimeBlocks(
          blocks.filter((b) => b.taskId !== id),
        );
      },
      setTasks(next) {
        localStorageStore.saveTasks(next);
      },
      addTimeBlock(input) {
        const block: TimeBlock = {
          id: uid(),
          title: input.title,
          date: input.date,
          start: input.start,
          end: input.end,
          taskId: input.taskId,
          color: input.color ?? "default",
        };
        localStorageStore.saveTimeBlocks([...blocks, block]);
        return block;
      },
      updateTimeBlock(id, patch) {
        localStorageStore.saveTimeBlocks(
          blocks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        );
      },
      deleteTimeBlock(id) {
        localStorageStore.saveTimeBlocks(blocks.filter((b) => b.id !== id));
      },
      setTimeBlocks(next) {
        localStorageStore.saveTimeBlocks(next);
      },
      addGroup(name) {
        const group: TaskGroup = {
          id: uid(),
          name: name.trim(),
        };
        localStorageStore.saveGroups([...groups, group]);
        return group;
      },
      updateGroup(id, patch) {
        localStorageStore.saveGroups(
          groups.map((g) => (g.id === id ? { ...g, ...patch } : g)),
        );
      },
      deleteGroup(id) {
        localStorageStore.saveGroups(groups.filter((g) => g.id !== id));
        localStorageStore.saveTasks(
          tasks.map((t) =>
            t.groupId === id ? { ...t, groupId: undefined } : t,
          ),
        );
      },
      setGroups(next) {
        localStorageStore.saveGroups(next);
      },
    }),
    [tasks, blocks, groups],
  );

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) {
    throw new Error("useData must be used within DataProvider");
  }
  return ctx;
}