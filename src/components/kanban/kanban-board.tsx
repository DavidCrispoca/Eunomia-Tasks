"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import type { Task, TaskStatus } from "@/types";
import { STATUS_ORDER } from "@/lib/utils";
import { useData } from "@/providers/data-provider";
import { useUi } from "@/providers/ui-provider";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { TaskCard } from "@/components/kanban/task-card";

export function KanbanBoard() {
  const { tasks, updateTask, setTasks } = useData();
  const { openEditTask, openCreateTask } = useUi();
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const groups = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        tasks: tasks
          .filter((task) => task.status === status)
          .sort((a, b) => a.order - b.order),
      })),
    [tasks],
  );

  function handleDragStart(event: DragStartEvent) {
    const task = tasks.find((t) => t.id === event.active.id);
    setActiveTask(task ?? null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const dragged = tasks.find((t) => t.id === active.id);
    if (!dragged) return;

    const overId = String(over.id);
    const overIsColumn = overId.startsWith("column:");
    let targetStatus: TaskStatus;

    if (overIsColumn) {
      targetStatus = overId.split(":")[1] as TaskStatus;
    } else {
      const overTask = tasks.find((t) => t.id === over.id);
      if (!overTask) return;
      targetStatus = overTask.status;
    }

    const sameColumnNoIndex = targetStatus === dragged.status && overIsColumn;
    if (sameColumnNoIndex) return;

    const rest = tasks.filter((t) => t.id !== dragged.id);
    const column = rest
      .filter((t) => t.status === targetStatus)
      .sort((a, b) => a.order - b.order);

    let index = column.findIndex((t) => t.id === over.id);
    if (overIsColumn || index < 0) index = column.length;

    column.splice(index, 0, { ...dragged, status: targetStatus });
    const reordered = column.map((t, i) => ({ ...t, order: i }));
    const next = [...rest.filter((t) => t.status !== targetStatus), ...reordered];
    setTasks(next);
  }

  function handleToggleDone(task: Task) {
    if (task.status === "done") {
      updateTask(task.id, { status: "todo", completedAt: undefined });
    } else {
      updateTask(task.id, {
        status: "done",
        completedAt: task.completedAt ?? new Date().toISOString(),
      });
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveTask(null)}
    >
      <div className="flex h-full min-h-0 flex-1 items-stretch gap-4 overflow-x-auto pb-6">
        {groups.map((group) => (
          <KanbanColumn
            key={group.status}
            status={group.status}
            tasks={group.tasks}
            onOpenTask={openEditTask}
            onToggleDone={handleToggleDone}
            onAddTask={openCreateTask}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180 }}>
        {activeTask ? <TaskCard task={activeTask} overlay /> : null}
      </DragOverlay>
    </DndContext>
  );
}