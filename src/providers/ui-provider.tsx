"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Task, TaskStatus } from "@/types";

interface TaskDialogState {
  open: boolean;
  status?: TaskStatus;
  editing?: Task | null;
}

interface UiContextValue {
  taskDialog: TaskDialogState;
  openCreateTask: (status?: TaskStatus) => void;
  openEditTask: (task: Task) => void;
  closeTaskDialog: () => void;
}

const UiContext = createContext<UiContextValue | null>(null);

export function UiProvider({ children }: { children: ReactNode }) {
  const [taskDialog, setTaskDialog] = useState<TaskDialogState>({
    open: false,
    editing: null,
  });

  const openCreateTask = useCallback((status?: TaskStatus) => {
    setTaskDialog({ open: true, status, editing: null });
  }, []);

  const openEditTask = useCallback((task: Task) => {
    setTaskDialog({ open: true, status: undefined, editing: task });
  }, []);

  const closeTaskDialog = useCallback(() => {
    setTaskDialog({ open: false, editing: null });
  }, []);

  const value = useMemo<UiContextValue>(
    () => ({ taskDialog, openCreateTask, openEditTask, closeTaskDialog }),
    [taskDialog, openCreateTask, openEditTask, closeTaskDialog],
  );

  return <UiContext.Provider value={value}>{children}</UiContext.Provider>;
}

export function useUi() {
  const ctx = useContext(UiContext);
  if (!ctx) {
    throw new Error("useUi must be used within UiProvider");
  }
  return ctx;
}