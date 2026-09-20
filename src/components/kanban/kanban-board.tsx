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
import { Settings2 } from "lucide-react";
import type { Task, TaskStatus } from "@/types";
import { STATUS_ORDER, cn } from "@/lib/utils";
import { useData } from "@/providers/data-provider";
import { useUi } from "@/providers/ui-provider";
import { useLanguage } from "@/lib/i18n";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { TaskCard } from "@/components/kanban/task-card";
import { GroupManagerModal } from "@/components/kanban/group-manager-modal";
import { Button } from "@/components/ui/button";

const PERSONAL = "__personal";

export function KanbanBoard() {
  const { tasks, groups, updateTask, setTasks } = useData();
  const { openEditTask, openCreateTask } = useUi();
  const { t } = useLanguage();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const effectiveFilter =
    filter !== null &&
    filter !== PERSONAL &&
    !groups.some((g) => g.id === filter)
      ? null
      : filter;

  const visibleTasks = useMemo(() => {
    if (effectiveFilter === null) return tasks;
    if (effectiveFilter === PERSONAL) {
      return tasks.filter((task) => !task.groupId);
    }
    return tasks.filter((task) => task.groupId === effectiveFilter);
  }, [tasks, effectiveFilter]);

  const columns = useMemo(
    () =>
      STATUS_ORDER.map((status) => ({
        status,
        tasks: visibleTasks
          .filter((task) => task.status === status)
          .sort((a, b) => a.order - b.order),
      })),
    [visibleTasks],
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

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-out-expo",
      active
        ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
        : "border-white/10 bg-white/[0.03] text-muted hover:border-white/25 hover:text-foreground",
    );

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            className={chip(effectiveFilter === null)}
            onClick={() => setFilter(null)}
          >
            {t.group.all}
          </button>
          <button
            type="button"
            className={chip(effectiveFilter === PERSONAL)}
            onClick={() => setFilter(PERSONAL)}
          >
            {t.group.personal}
          </button>
          {groups.map((g) => (
            <button
              key={g.id}
              type="button"
              className={chip(effectiveFilter === g.id)}
              onClick={() => setFilter(g.id)}
            >
              {g.name}
            </button>
          ))}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="shrink-0 text-muted hover:border-amber-500/25 hover:bg-amber-500/5 hover:text-foreground"
          onClick={() => setManagerOpen(true)}
        >
          <Settings2 size={14} />
          {t.group.manage}
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        <div className="flex h-full min-h-0 flex-1 items-stretch gap-4 overflow-x-auto scroll-px-4 pb-6 snap-x snap-proximity">
          {columns.map((column) => (
            <KanbanColumn
              key={column.status}
              status={column.status}
              tasks={column.tasks}
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

      <GroupManagerModal
        open={managerOpen}
        onClose={() => setManagerOpen(false)}
      />
    </div>
  );
}