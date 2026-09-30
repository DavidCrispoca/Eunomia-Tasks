"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import {
  ArrowUpRight,
  CheckCircle2,
  Circle,
  Plane,
  X,
} from "lucide-react";
import { usePomodoro } from "@/providers/pomodoro-provider";
import { useData } from "@/providers/data-provider";
import { useLanguage } from "@/lib/i18n";
import type { TaskStatus } from "@/types";
import { Button } from "@/components/ui/button";

const noopSubscribe = () => () => {};

/**
 * La sesión vive en localStorage, así que el servidor siempre la ve como `null`.
 * Renderizamos el chip solo tras hidratación para que el árbol coincida.
 */
function useHydrated() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export function PomodoroChip() {
  const router = useRouter();
  const { t } = useLanguage();
  const { session, remainingMs, elapsedPct, dismiss } = usePomodoro();
  const { updateTask } = useData();
  const hydrated = useHydrated();

  const active = session;
  if (!active || !hydrated) return null;

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
        className="fixed bottom-20 right-4 z-50 lg:bottom-4"
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.96 }}
        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      >
        <div
          className="relative overflow-hidden rounded-xl border border-white/[0.12] bg-white/[0.06] text-sm shadow-[var(--clay-drop),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl"
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
            className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-violet-400/90 via-indigo-400/45 to-transparent"
            style={{ width: `${elapsedPct}%` }}
          />
          <div className="flex flex-col gap-2.5 px-4 py-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex size-2">
                {isRunning && (
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-60" />
                )}
                <span
                  className={`relative inline-flex size-2 rounded-full ${
                    isRunning
                      ? "bg-violet-400"
                      : paused
                        ? "bg-violet-300/60"
                        : "bg-emerald-400"
                  }`}
                />
              </span>
              <span className="max-w-40 truncate font-medium">
                {active.title}
              </span>
              {active.mode === "flight" && active.routeLabel && (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-violet-500/35 bg-violet-500/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-violet-200">
                  <Plane size={9} />
                  {active.routeLabel}
                </span>
              )}
              {isActive ? (
                <span className="ml-1 font-mono text-sm tabular-nums text-violet-200">
                  {time}
                </span>
              ) : (
                <span className="ml-1 font-medium text-emerald-300">
                  {t.pomodoro.timeUp}
                </span>
              )}
              {isActive && !paused && (
                <ArrowUpRight className="size-3.5 text-violet-300/80" />
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