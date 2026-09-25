"use client";

import {
  createContext,
  useCallback,
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
  isSeedDataset,
  localStorageStore,
} from "@/lib/storage/local-storage-store";
import { useSynced } from "@/lib/storage/synced";
import { persistCloudData, pullCloudData } from "@/lib/data/actions";
import { addMinutesToHHMM, uid } from "@/lib/utils";

interface NewTaskInput {
  title: string;
  notes?: string;
  priority?: TaskPriority;
  dueDate?: string;
  dueTime?: string;
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

type TaskPatch = Partial<Omit<Task, "id" | "createdAt">> & {
  dueTime?: string;
};

function blockColorForTask(priority: TaskPriority): TimeBlock["color"] {
  if (priority === "high") return "red";
  if (priority === "low") return "green";
  return "orange";
}

function reconcileTaskBlock(
  blocks: TimeBlock[],
  task: Task,
  dueTime: string | undefined,
): TimeBlock[] {
  const block = blocks.find((b) => b.taskId === task.id);
  if (task.dueDate && dueTime) {
    const slot = {
      title: task.title,
      date: task.dueDate,
      start: dueTime,
      end: addMinutesToHHMM(dueTime, 60),
      color: blockColorForTask(task.priority),
    };
    if (block) {
      return blocks.map((b) =>
        b.id === block.id ? { ...b, ...slot } : b,
      );
    }
    return [...blocks, { id: uid(), taskId: task.id, ...slot }];
  }
  if (block) {
    return blocks.filter((b) => b.id !== block.id);
  }
  return blocks;
}

interface DataContextValue {
  tasks: Task[];
  blocks: TimeBlock[];
  groups: TaskGroup[];
  addTask: (input: NewTaskInput) => Task;
  updateTask: (id: string, patch: TaskPatch) => void;
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

function readJson<T>(key: string): T | null {
  try {
    const raw = readRaw(key);
    return raw ? (JSON.parse(raw) as T) : null;
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

/**
 * Decide si aceptar remoto (nube) sobre local para TASKS:
 * - Nunca vacía la cuenta: una nube sin tareas no pisa datos locales.
 * - Una nube que solo tiene semilla no pisa datos locales reales (evita la
 *   pérdida del incidente de borrado masivo).
 */
function shouldAcceptRemoteTasks(local: Task[] | null, remote: Task[]): boolean {
  if (!remote || remote.length === 0) return false;
  if (
    local &&
    local.length > 0 &&
    !isSeedDataset(local) &&
    isSeedDataset(remote)
  ) {
    return false;
  }
  return true;
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
  const cloudRef = useRef(cloud);
  useEffect(() => {
    cloudRef.current = cloud;
  }, [cloud]);

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

  /**
   * Persistir en la nube SOLO como resultado de una mutación del usuario.
   * Nunca se persiste el estado de arranque/semilla ni la hidratación, que es
   * lo que provocó el reemplazo destructivo del dataset en la nube.
   */
  const persistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const schedulePersist = useCallback(
    (nextTasks: Task[], nextBlocks: TimeBlock[], nextGroups: TaskGroup[]) => {
      if (!cloudRef.current) return;
      if (persistTimer.current) clearTimeout(persistTimer.current);
      persistTimer.current = setTimeout(() => {
        void persistCloudData(nextTasks, nextBlocks, nextGroups);
      }, 700);
    },
    [],
  );
  useEffect(
    () => () => {
      if (persistTimer.current) clearTimeout(persistTimer.current);
    },
    [],
  );

  // Hidratar el almacén local con los datos del servidor en el primer render.
  useEffect(() => {
    if (!initialData || hydrated.current) return;
    hydrated.current = true;
    try {
      if (
        shouldAcceptRemoteTasks(readJson<Task[]>(TASKS_KEY), initialData.tasks) &&
        !hasRawValue(TASKS_KEY, initialData.tasks)
      ) {
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

  // Sincronizar entre dispositivos: polling + focus por si cambió en la nube.
  useEffect(() => {
    if (!cloud) return;
    const pull = async () => {
      const data = await pullCloudData();
      if (!data) return;
      try {
        if (
          shouldAcceptRemoteTasks(
            readJson<Task[]>(TASKS_KEY),
            data.tasks,
          ) &&
          !hasRawValue(TASKS_KEY, data.tasks)
        ) {
          localStorageStore.saveTasks(data.tasks);
        }
        if (!hasRawValue(BLOCKS_KEY, data.blocks)) {
          localStorageStore.saveTimeBlocks(data.blocks);
        }
        if (!hasRawValue(GROUPS_KEY, data.groups)) {
          localStorageStore.saveGroups(data.groups);
        }
      } catch {
        // lectura/escritura de almacenamiento no disponible
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
        const nextTasks = [
          ...tasks.map((t) =>
            t.status === task.status ? { ...t, order: t.order + 1 } : t,
          ),
          task,
        ];
        localStorageStore.saveTasks(nextTasks);
        let nextBlocks = blocks;
        if (input.dueTime) {
          nextBlocks = reconcileTaskBlock(blocks, task, input.dueTime);
          if (nextBlocks !== blocks) localStorageStore.saveTimeBlocks(nextBlocks);
        }
        schedulePersist(nextTasks, nextBlocks, groups);
        return task;
      },
      updateTask(id, patch) {
        const { dueTime, ...rest } = patch;
        const current = tasks.find((t) => t.id === id);
        if (!current) return;
        const nextTasks = tasks.map((t) =>
          t.id === id ? { ...t, ...rest } : t,
        );
        localStorageStore.saveTasks(nextTasks);
        const datesChanged = "dueDate" in patch || "dueTime" in patch;
        if (!datesChanged) {
          schedulePersist(nextTasks, blocks, groups);
          return;
        }

        const next = { ...current, ...rest };
        const nextBlocks = reconcileTaskBlock(blocks, next, dueTime);
        if (nextBlocks !== blocks) localStorageStore.saveTimeBlocks(nextBlocks);
        schedulePersist(nextTasks, nextBlocks, groups);
      },
      deleteTask(id) {
        const nextTasks = tasks.filter((t) => t.id !== id);
        const nextBlocks = blocks.filter((b) => b.taskId !== id);
        localStorageStore.saveTasks(nextTasks);
        localStorageStore.saveTimeBlocks(nextBlocks);
        schedulePersist(nextTasks, nextBlocks, groups);
      },
      setTasks(next) {
        localStorageStore.saveTasks(next);
        schedulePersist(next, blocks, groups);
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
        const nextBlocks = [...blocks, block];
        localStorageStore.saveTimeBlocks(nextBlocks);
        schedulePersist(tasks, nextBlocks, groups);
        return block;
      },
      updateTimeBlock(id, patch) {
        const nextBlocks = blocks.map((b) => (b.id === id ? { ...b, ...patch } : b));
        localStorageStore.saveTimeBlocks(nextBlocks);
        schedulePersist(tasks, nextBlocks, groups);
      },
      deleteTimeBlock(id) {
        const nextBlocks = blocks.filter((b) => b.id !== id);
        localStorageStore.saveTimeBlocks(nextBlocks);
        schedulePersist(tasks, nextBlocks, groups);
      },
      setTimeBlocks(next) {
        localStorageStore.saveTimeBlocks(next);
        schedulePersist(tasks, next, groups);
      },
      addGroup(name) {
        const group: TaskGroup = {
          id: uid(),
          name: name.trim(),
        };
        const nextGroups = [...groups, group];
        localStorageStore.saveGroups(nextGroups);
        schedulePersist(tasks, blocks, nextGroups);
        return group;
      },
      updateGroup(id, patch) {
        const nextGroups = groups.map((g) =>
          g.id === id ? { ...g, ...patch } : g,
        );
        localStorageStore.saveGroups(nextGroups);
        schedulePersist(tasks, blocks, nextGroups);
      },
      deleteGroup(id) {
        const nextTasks = tasks.map((t) =>
          t.groupId === id ? { ...t, groupId: undefined } : t,
        );
        const nextGroups = groups.filter((g) => g.id !== id);
        localStorageStore.saveTasks(nextTasks);
        localStorageStore.saveGroups(nextGroups);
        schedulePersist(nextTasks, blocks, nextGroups);
      },
      setGroups(next) {
        localStorageStore.saveGroups(next);
        schedulePersist(tasks, blocks, next);
      },
    }),
    [tasks, blocks, groups, schedulePersist],
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