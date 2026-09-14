"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Task } from "@/types";
import { TaskCard } from "@/components/kanban/task-card";

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

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={
        isDragging
          ? "relative z-10 opacity-30 ring-2 ring-amber-500/40 rounded-lg"
          : undefined
      }
    >
      <TaskCard
        task={task}
        onOpen={() => onOpen(task)}
        onToggleDone={() => onToggleDone(task)}
      />
    </div>
  );
}