"use client";

import { useDroppable } from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { Plus } from "lucide-react";
import type { Task, TaskStatus, TodoSort } from "@/types";
import { STATUS_DOT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { SortableTaskCard } from "@/components/kanban/sortable-task-card";
import { TodoSortSelect } from "@/components/kanban/todo-sort-select";
import { Button } from "@/components/ui/button";

interface KanbanColumnProps {
  status: TaskStatus;
  tasks: Task[];
  sortMode: TodoSort;
  onSortModeChange: (sort: TodoSort) => void;
  onOpenTask: (task: Task) => void;
  onToggleDone: (task: Task) => void;
  onAddTask: (status: TaskStatus) => void;
}

export function KanbanColumn({
  status,
  tasks,
  sortMode,
  onSortModeChange,
  onOpenTask,
  onToggleDone,
  onAddTask,
}: KanbanColumnProps) {
  const { t } = useLanguage();
  const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });
  const sorted =
    sortMode === "manual"
      ? [...tasks].sort((a, b) => a.order - b.order)
      : tasks;

  return (
    <div className="flex min-w-[300px] flex-1 flex-col snap-start">
      <div className="mb-2 flex items-center gap-2 px-1.5">
        <span
          className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])}
          aria-hidden
        />
        <h3 className="text-[13px] font-semibold tracking-tight">
          {t.kanban.columns[status]}
        </h3>
        <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 font-mono text-[11px] text-amber-200/80">
          {sorted.length}
        </span>
        {status === "todo" && (
          <TodoSortSelect value={sortMode} onChange={onSortModeChange} />
        )}
      </div>

      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-0 overflow-y-auto rounded-2xl border border-white/5 bg-white/[0.02] p-1.5 shadow-[var(--inset-top-soft)] transition-[border-color,box-shadow,background-color] duration-200 ease-out-expo",
          isOver &&
            "border-amber-500/50 bg-amber-500/[0.06] shadow-[var(--inset-top),inset_0_0_28px_rgba(245,158,11,0.06)]",
        )}
      >
        <SortableContext
          items={sorted.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex min-h-full flex-col gap-2">
            {sorted.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onOpen={onOpenTask}
                onToggleDone={onToggleDone}
              />
            ))}
            {sorted.length === 0 && (
              <div className="flex flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-6 text-center">
                <p className="text-xs font-medium text-muted">
                  {t.kanban.emptyColumn}
                </p>
                <p className="text-[11px] text-muted/70">
                  {t.kanban.emptyHint}
                </p>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="mt-1 justify-start text-muted hover:border-amber-500/25 hover:bg-amber-500/5 hover:text-foreground max-md:h-10 max-md:border max-md:border-white/10 max-md:bg-white/[0.03]"
              onClick={() => onAddTask(status)}
            >
              <Plus size={14} />
              {t.kanban.newTask}
            </Button>
          </div>
        </SortableContext>
      </div>
    </div>
  );
}