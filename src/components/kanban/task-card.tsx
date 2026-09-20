"use client";

import { useMemo } from "react";
import { CalendarDays, Check, FolderOpen, StickyNote } from "lucide-react";
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
        "group relative flex cursor-grab flex-col gap-2 rounded-lg border border-white/10 bg-surface-2 p-2.5 shadow-[var(--inset-top)]",
        "transition-all duration-200 ease-out-expo hover:-translate-y-0.5 hover:border-amber-500/40 hover:shadow-[var(--inset-top),0_4px_20px_rgba(245,158,11,0.12)] active:scale-[0.98] active:duration-75",
        overlay &&
          "rotate-1 scale-105 shadow-[0_10px_30px_rgba(245,158,11,0.25)] ring-1 ring-amber-500/30",
        Done &&
          "border-emerald-400/20 opacity-70 hover:shadow-[var(--inset-top),0_4px_20px_rgba(52,211,153,0.12)]",
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
      {Done && (
        <span
          className="pointer-events-none absolute inset-x-0 top-0 h-px rounded-full bg-gradient-to-r from-emerald-400/50 via-amber-400/40 to-transparent"
          aria-hidden
        />
      )}
      {task.priority === "high" && !Done && (
        <span
          className="pointer-events-none absolute inset-y-2 left-0 w-0.5 rounded-full bg-gradient-to-b from-orange-500 to-amber-400 opacity-80"
          aria-hidden
        />
      )}
      <div className="flex items-start gap-2">
        <button
          type="button"
          aria-label={t.common.markDone}
          className={cn(
            "mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full border transition-all",
            Done
              ? "border-transparent bg-gradient-to-br from-emerald-400 to-emerald-500 text-black shadow-[0_0_8px_rgba(52,211,153,0.6)]"
              : "border-white/20 hover:border-amber-400",
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
          <span className="inline-flex items-center gap-1 font-mono text-[11px] text-amber-200/70">
            <FolderOpen size={11} />
            {group.name}
          </span>
        )}
        {task.dueDate && (
          <span
            className={cn(
              "inline-flex items-center gap-1 font-mono text-[11px]",
              isOverdue
                ? "font-medium text-[#ff8a4d]"
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