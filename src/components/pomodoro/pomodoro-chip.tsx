"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { ArrowUpRight, CheckCircle2, Circle, X } from "lucide-react";
import { usePomodoro } from "@/providers/pomodoro-provider";
import { useData } from "@/providers/data-provider";
import { useLanguage } from "@/lib/i18n";
import type { TaskStatus } from "@/types";
import { Button } from "@/components/ui/button";

export function PomodoroChip() {
  const router = useRouter();
  const { t } = useLanguage();
  const { session, remainingMs, elapsedPct, dismiss } = usePomodoro();
  const { updateTask } = useData();

  const active = session;
  if (!active) return null;

  const isRunning = active.status === "running";
  const isFinished = active.status === "finished";
  const paused = active.status === "paused";
  const isActive = !isFinished;

  const seconds = Math.max(0, Math.ceil(remainingMs / 1000));
  const mm = Math.floor(seconds / 60);
  const ss = seconds % 60;
  const time = `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;

  const open = () => {
    router.push(`/pomodoro/${active.taskId}`);
  };

  const choose = (status: TaskStatus) => {
    updateTask(active.taskId, {
      status,
      completedAt: status === "done" ? new Date().toISOString() : undefined,
    });
    dismiss();
  };

  return (
    <AnimatePresence>
      <motion.div
        key="pomodoro-chip"
        className="fixed bottom-4 right-4 z-50"
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="relative overflow-hidden rounded-xl border border-white/10 bg-[#090a0c]/85 text-sm shadow-[inset_0_1px_0_var(--inset-top),inset_0_-1px_0_var(--inset-top-soft),0_12px_32px_-12px_rgba(0,0,0,0.7)] backdrop-blur-xl"
          role={isActive ? "button" : "status"}
          tabIndex={isActive ? 0 : undefined}
          onClick={isActive ? open : undefined}
          onKeyDown={
            isActive
              ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    open();
                  }
                }
              : undefined
          }
        >
          <div
            className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-amber-400/80 via-amber-400/40 to-transparent"
            style={{ width: `${elapsedPct}%` }}
          />
          <div className="flex flex-col gap-2.5 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex size-2">
                {isRunning && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-amber-400 opacity-60" />
                )}
                <span
                  className={`relative inline-flex size-2 rounded-full ${
                    isRunning
                      ? "bg-amber-400"
                      : paused
                        ? "bg-amber-300/60"
                        : "bg-emerald-400"
                  }`}
                />
              </span>
              <span className="max-w-40 truncate font-medium">
                {active.title}
              </span>
              {isActive ? (
                <span className="ml-1 font-mono text-sm tabular-nums text-amber-200">
                  {time}
                </span>
              ) : (
                <span className="ml-1 font-medium text-emerald-300">
                  {t.pomodoro.timeUp}
                </span>
              )}
              {isActive && !paused && (
                <ArrowUpRight className="size-3.5 text-amber-300/70" />
              )}
            </div>

            {isFinished && (
              <div className="flex items-center gap-1.5">
                <Button
                  size="sm"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    choose("doing");
                  }}
                >
                  <Circle className="size-3.5" />
                  {t.pomodoro.keepDoing}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1"
                  onClick={(e) => {
                    e.stopPropagation();
                    choose("done");
                  }}
                >
                  <CheckCircle2 className="size-3.5" />
                  {t.pomodoro.markDone}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label={t.common.cancel}
                  onClick={(e) => {
                    e.stopPropagation();
                    dismiss();
                  }}
                >
                  <X className="size-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}