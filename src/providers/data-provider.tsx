"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type { Task, TimeBlock, TaskPriority, TaskStatus } from "@/types";
import {
  BLOCKS_KEY,
  TASKS_KEY,
  defaultTasks,
  defaultTimeBlocks,
  localStorageStore,
} from "@/lib/storage/local-storage-store";
import { useSynced } from "@/lib/storage/synced";
import { uid } from "@/lib/utils";

interface NewTaskInput {
  title: string;
  notes?: string;
  priority?: TaskPriority;
  dueDate?: string;
  status?: TaskStatus;
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
  addTask: (input: NewTaskInput) => Task;
  updateTask: (id: string, patch: Partial<Omit<Task, "id" | "createdAt">>) => void;
  deleteTask: (id: string) => void;
  setTasks: (tasks: Task[]) => void;
  addTimeBlock: (input: NewTimeBlockInput) => TimeBlock;
  updateTimeBlock: (id: string, patch: Partial<Omit<TimeBlock, "id">>) => void;
  deleteTimeBlock: (id: string) => void;
  setTimeBlocks: (blocks: TimeBlock[]) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const tasks = useSynced<Task[]>(TASKS_KEY, () => defaultTasks());
  const blocks = useSynced<TimeBlock[]>(BLOCKS_KEY, () => defaultTimeBlocks());

  const value = useMemo<DataContextValue>(
    () => ({
      tasks,
      blocks,
      addTask(input) {
        const task: Task = {
          id: uid(),
          title: input.title,
          notes: input.notes ?? "",
          priority: input.priority ?? "medium",
          dueDate: input.dueDate,
          status: input.status ?? "todo",
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
    }),
    [tasks, blocks],
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