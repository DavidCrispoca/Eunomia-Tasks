"use client";

import { forwardRef } from "react";
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

export const KanbanColumn = forwardRef<HTMLDivElement, KanbanColumnProps>(
  function KanbanColumn(
    {
      status,
      tasks,
      sortMode,
      onSortModeChange,
      onOpenTask,
      onToggleDone,
      onAddTask,
    },
    ref,
  ) {
    const { t } = useLanguage();
    const { setNodeRef, isOver } = useDroppable({ id: `column:${status}` });
    const sorted =
      sortMode === "manual"
        ? [...tasks].sort((a, b) => a.order - b.order)
        : tasks;

    const setRefs = (node: HTMLDivElement | null) => {
      setNodeRef(node);
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    };

    return (
      <div className="flex w-full min-w-[280px] shrink-0 snap-center flex-col md:min-w-[300px] md:flex-1 md:snap-start">
      <div className="mb-2 flex items-center gap-2 px-1.5">
        <span
          className={cn("h-2 w-2 rounded-full", STATUS_DOT[status])}
          aria-hidden
        />
        <h3 className="text-[13px] font-semibold tracking-tight font-display">
          {t.kanban.columns[status]}
        </h3>
        <span className="rounded-md border border-white/10 bg-white/[0.04] px-1.5 font-mono text-[11px] text-violet-300/90 text-tabular">
          {sorted.length}
        </span>
        {status === "todo" && (
          <TodoSortSelect value={sortMode} onChange={onSortModeChange} />
        )}
      </div>

      <div
        ref={setRefs}
        className={cn(
          "flex-1 min-h-[200px] overflow-y-auto rounded-2xl glass-deep p-1.5 transition-[border-color,box-shadow,background-color] duration-200 ease-out-expo",
          isOver &&
            "border-violet-500/60 bg-violet-500/[0.07] shadow-[inset_3px_3px_10px_rgba(90,140,240,0.08),inset_-3px_-3px_10px_rgba(0,0,0,0.4)]",
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
              className="mt-1 justify-start text-muted hover:border-violet-500/30 hover:bg-violet-500/5 hover:text-foreground max-md:h-10 max-md:border max-md:border-white/10 max-md:bg-white/[0.03]"
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
  },
);