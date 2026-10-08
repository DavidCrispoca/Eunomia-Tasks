"use client";

import { useMemo } from "react";
import { CalendarDays, Check, Clock, FolderOpen, StickyNote } from "lucide-react";
import type { Task } from "@/types";
import { PRIORITY_TEXT, STATUS_DOT } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { useData } from "@/providers/data-provider";
import { formatShortDate } from "@/lib/date";

interface TaskCardProps {
  task: Task;
  onOpen?: () => void;
  onToggleDone?: () => void;
  overlay?: boolean;
}

export function TaskCard({ task, onOpen, onToggleDone, overlay }: TaskCardProps) {
  const { t, lang } = useLanguage();
  const { groups } = useData();
  const group = groups.find((g) => g.id === task.groupId);

  const isOverdue = useMemo(() => {
    if (!task.dueDate || task.status === "done") return false;
    return new Date(`${task.dueDate}T23:59:59`) < new Date();
  }, [task.dueDate, task.status]);

  const Done = task.status === "done";

  return (
    <div
      className={cn(
        "group surface surface-hover relative flex cursor-default flex-col gap-2 rounded-xl p-2.5 pl-8",
        "active:scale-[0.98] active:duration-75",
        overlay && "rotate-1 scale-[1.03] ring-1 ring-violet-500/40",
        Done && "border-emerald-400/20 opacity-70",
      )}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === "Enter" || e.key === " ") && onOpen) {
          e.preventDefault();
          onOpen();
        }
      }}
    >
      {task.priority === "high" && !Done && (
        <span
          className="pointer-events-none absolute inset-y-2 left-0 w-0.5 rounded-full bg-orange-500/70"
          aria-hidden
        />
      )}
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={t.common.markDone}
          className={cn(
            "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-all duration-200",
            Done
              ? "border-transparent bg-emerald-500 text-neutral-950"
              : "border-white/20 hover:border-violet-400 hover:scale-110",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggleDone?.();
          }}
        >
          {Done && <Check size={10} strokeWidth={3} />}
        </button>
        <span
          className={cn(
            "min-w-0 flex-1 break-words text-[13.5px] leading-snug",
            Done && "line-through text-muted",
          )}
        >
          {task.title}
        </span>
      </div>

      {task.notes && (
        <span className="flex items-center gap-1 pl-6 text-xs text-muted">
          <StickyNote size={11} />
          <span className="line-clamp-1">{task.notes}</span>
        </span>
      )}

      <div className="flex flex-wrap items-center gap-1.5 pl-6">
        {group && (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-violet-300/70">
            <FolderOpen size={11} />
            {group.name}
          </span>
        )}
        {task.focusMinutes ? (
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-violet-300/90">
            <Clock size={11} />
            {task.focusMinutes} min
          </span>
        ) : null}
        {task.dueDate && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-mono text-[11px]",
              isOverdue
                ? "font-medium text-rose-300"
                : "text-muted",
            )}
          >
            <CalendarDays size={11} />
            {formatShortDate(task.dueDate, lang)}
            {isOverdue && " ·"}
          </span>
        )}
        <span
          className={cn(
            "ml-auto inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold",
            PRIORITY_TEXT[task.priority],
          )}
        >
          {t.priority[task.priority]}
        </span>
        <span
          className={cn("h-1.5 w-1.5 rounded-full", STATUS_DOT[task.status])}
          aria-hidden
        />
      </div>
    </div>
  );
}