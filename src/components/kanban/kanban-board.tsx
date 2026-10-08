"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core";
import { Flame, Settings2 } from "lucide-react";
import type { Task, TaskStatus, TodoSort } from "@/types";
import { STATUS_ORDER, cn, parseISODate } from "@/lib/utils";
import { useData } from "@/providers/data-provider";
import { useUi } from "@/providers/ui-provider";
import { useLanguage } from "@/lib/i18n";
import { KanbanColumn } from "@/components/kanban/kanban-column";
import { TaskCard } from "@/components/kanban/task-card";
import { GroupManagerModal } from "@/components/kanban/group-manager-modal";
import { Button } from "@/components/ui/button";

const PERSONAL = "__personal";

function dueTime(task: Task): number | null {
  return task.dueDate ? parseISODate(task.dueDate).getTime() : null;
}

function compareDueAsc(a: Task, b: Task): number {
  const ta = dueTime(a);
  const tb = dueTime(b);
  if (ta === null && tb === null) return a.order - b.order;
  if (ta === null) return 1;
  if (tb === null) return -1;
  return ta - tb;
}

function compareDueDesc(a: Task, b: Task): number {
  const ta = dueTime(a);
  const tb = dueTime(b);
  if (ta === null && tb === null) return a.order - b.order;
  if (ta === null) return 1;
  if (tb === null) return -1;
  return tb - ta;
}

function compareCreated(a: Task, b: Task): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export function KanbanBoard() {
  const { tasks, groups, updateTask, setTasks } = useData();
  const { openEditTask, openCreateTask } = useUi();
  const { t } = useLanguage();
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [filter, setFilter] = useState<string | null>(null);
  const [managerOpen, setManagerOpen] = useState(false);
  const [todoSort, setTodoSort] = useState<TodoSort>("dueAsc");
  const [activeTab, setActiveTab] = useState<TaskStatus>("todo");
  const columnRefs = useRef<Partial<Record<TaskStatus, HTMLDivElement | null>>>({});

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 120, tolerance: 8 },
    }),
  );

  // pointerWithin elige el contenedor bajo el cursor: es lo que hace fiable
  // soltar en una columna vacÃ­a (rectIntersection exige solape real).
  const collisionDetection = useCallback<typeof pointerWithin>(
    (args) => {
      const withinPointer = pointerWithin(args);
      if (withinPointer.length > 0) return withinPointer;
      // Respaldo: si el puntero no cae squarely en un droppable (p.ej. por
      // scrolls) usamos la intersecciÃ³n de rectÃ¡ngulos mÃ¡s cercana.
      return rectIntersection(args);
    },
    [],
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

  const focusByGroup = useMemo(() => {
    const map = new Map<string, number>();
    for (const task of tasks) {
      const key = task.groupId ?? PERSONAL;
      map.set(key, (map.get(key) ?? 0) + (task.focusMinutes ?? 0));
    }
    return map;
  }, [tasks]);

  const topFocusGroup = useMemo(() => {
    let best: { key: string; minutes: number } | null = null;
    for (const [key, minutes] of focusByGroup) {
      if (minutes <= 0) continue;
      if (!best || minutes > best.minutes) best = { key, minutes };
    }
    return best;
  }, [focusByGroup]);

  const columns = useMemo(() => {
    const sortTodo = (list: Task[]) => {
      const copy = [...list];
      if (todoSort === "dueAsc") copy.sort(compareDueAsc);
      else if (todoSort === "dueDesc") copy.sort(compareDueDesc);
      else if (todoSort === "createdAsc") copy.sort(compareCreated);
      else copy.sort((a, b) => compareCreated(b, a));
      return copy;
    };

    return STATUS_ORDER.map((status) => {
      const columnTasks = visibleTasks.filter(
        (task) => task.status === status,
      );
      const tasks =
        status !== "done" && todoSort !== "manual"
          ? sortTodo(columnTasks)
          : [...columnTasks].sort((a, b) => a.order - b.order);
      return { status, tasks };
    });
  }, [visibleTasks, todoSort]);

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

    const rest = tasks.filter((t) => t.id !== dragged.id);
    const column = rest
      .filter((t) => t.status === targetStatus)
      .sort((a, b) => a.order - b.order);

    // Soltada sobre sÃ­ misma sin cambio de columna: nada que hacer.
    let index = column.findIndex((t) => t.id === over.id);
    if (overIsColumn || index < 0) {
      index = column.length;
    } else if (String(over.id) === String(active.id)) {
      return;
    }

    const moved: Task = {
      ...dragged,
      status: targetStatus,
      completedAt:
        targetStatus === "done"
          ? (dragged.completedAt ?? new Date().toISOString())
          : undefined,
    };

    column.splice(index, 0, moved);
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
        ? "border-violet-500/50 bg-violet-500/15 text-violet-200"
        : "border-white/10 bg-white/[0.03] text-muted hover:border-white/25 hover:text-foreground",
    );

  const focusBadge = (minutes: number) =>
    minutes > 0 ? (
      <span className="ml-1 font-mono text-[10px] font-semibold text-violet-300/90">
        {minutes}m
      </span>
    ) : null;

  const classIsTop = (key: string) =>
    topFocusGroup !== null && topFocusGroup.key === key && topFocusGroup.minutes > 0;

  const STATUS_LABELS: Record<TaskStatus, string> = {
  todo: "Por hacer",
  doing: "En curso",
  done: "Hecho",
};

return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto pb-1 min-h-[44px]">
          <button
            type="button"
            className={cn(chip(effectiveFilter === null), "min-h-[44px] min-w-[44px] px-3 py-2")}
            onClick={() => setFilter(null)}
          >
            {t.group.all}
          </button>
          <button
            type="button"
            className={cn(chip(effectiveFilter === PERSONAL), "min-h-[44px] min-w-[44px] px-3 py-2")}
            onClick={() => setFilter(PERSONAL)}
          >
            {t.group.personal}
            {focusBadge(focusByGroup.get(PERSONAL) ?? 0)}
          </button>
          {groups.map((g) => {
            const minutes = focusByGroup.get(g.id) ?? 0;
            return (
              <button
                key={g.id}
                type="button"
                className={cn(chip(effectiveFilter === g.id), "min-h-[44px] min-w-[44px] px-3 py-2")}
                onClick={() => setFilter(g.id)}
              >
                <span className="inline-flex items-center gap-1">
                  {classIsTop(g.id) && (
                    <Flame size={11} className="text-orange-400" aria-hidden />
                  )}
                  {g.name}
                </span>
                {focusBadge(minutes)}
              </button>
            );
          })}
        </div>
        <Button
          variant="ghost"
          size="md"
          className="shrink-0 min-h-[44px]"
          onClick={() => setManagerOpen(true)}
        >
          <Settings2 size={14} />
          {t.group.manage}
        </Button>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={collisionDetection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={() => setActiveTask(null)}
      >
        {/* Barra de pestaÃ±as: solo mÃ³vil. Navega el carrusel de columnas. */}
        <div
          className="flex shrink-0 overflow-x-auto border-b border-white/10 pb-1 md:hidden"
          role="tablist"
        >
          {columns.map((column) => (
            <button
              key={column.status}
              type="button"
              role="tab"
              aria-selected={activeTab === column.status}
              className={cn(
                "shrink-0 border-b-2 px-4 py-2 text-sm font-medium transition-all duration-200",
                activeTab === column.status
                  ? "border-violet-400 text-violet-200"
                  : "border-transparent text-muted hover:text-foreground",
              )}
              onClick={() => {
                setActiveTab(column.status);
                columnRefs.current[column.status]?.scrollIntoView({
                  behavior: "smooth",
                  inline: "center",
                  block: "nearest",
                });
              }}
            >
              {t.kanban.columns[column.status] || STATUS_LABELS[column.status]}
              <span className="ml-1.5 rounded-full bg-white/10 px-1.5 font-mono text-[10px] text-violet-300/90">
                {column.tasks.length}
              </span>
            </button>
          ))}
        </div>

        {/*
          Un ÃšNICO conjunto de columnas para desktop y mÃ³vil.
          Antes se renderizaban ambos a la vez y ambos registraban droppables
          con el mismo id en dnd-kit; el montÃ­culo oculto (display:none, rect
          0x0) ganaba el registro y por eso over siempre era null.
        */}
        <div className="flex min-h-0 flex-1 snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-4 pb-6 md:snap-proximity">
          {columns.map((column) => (
            <KanbanColumn
              key={column.status}
              ref={(node) => {
                columnRefs.current[column.status] = node;
              }}
              status={column.status}
              tasks={column.tasks}
              sortMode={todoSort}
              onSortModeChange={setTodoSort}
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