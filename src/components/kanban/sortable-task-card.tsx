"use client";

import { useMemo } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import type { Task } from "@/types";
import { cn } from "@/lib/utils";
import { TaskCard } from "@/components/kanban/task-card";

function cleanAttributes<T extends { "aria-describedby"?: string }>(
  attributes: T,
): T {
  const cleaned = { ...attributes };
  delete cleaned["aria-describedby"];
  return cleaned;
}

interface SortableTaskCardProps {
  task: Task;
  onOpen: (task: Task) => void;
  onToggleDone: (task: Task) => void;
}

export function SortableTaskCard({
  task,
  onOpen,
  onToggleDone,
}: SortableTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: "task", status: task.status },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const safeAttributes = useMemo(
    () => cleanAttributes(attributes),
    [attributes],
  );

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...safeAttributes}
      className={cn(
        "group/card relative rounded-lg",
        isDragging && "z-10 opacity-30 ring-2 ring-amber-500/40",
      )}
    >
      <TaskCard
        task={task}
        onOpen={() => onOpen(task)}
        onToggleDone={() => onToggleDone(task)}
      />

      {/*
        El handle va DESPUÉS de TaskCard y con z-20: TaskCard es un hermano
        posicionado posterior, así que sin esto lo tapaba y el click caía en la
        tarjeta (abriendo el modal) en vez de iniciar el arrastre.
      */}
      <button
        type="button"
        {...listeners}
        aria-label="Arrastrar tarea"
        className="absolute left-1 top-1/2 z-20 flex h-10 w-10 -translate-y-1/2 touch-none select-none items-center justify-center rounded-lg text-muted opacity-50 transition-all duration-200 hover:bg-white/5 hover:text-foreground hover:opacity-100 active:cursor-grabbing active:bg-white/10 group-hover/card:opacity-100 max-sm:opacity-70"
      >
        <GripVertical size={18} />
      </button>
    </div>
  );
}
