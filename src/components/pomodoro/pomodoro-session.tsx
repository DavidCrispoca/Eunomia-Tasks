"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Pause,
  Plane,
  Play,
  RotateCcw,
} from "lucide-react";
import type { Task, TaskStatus } from "@/types";
import { cn } from "@/lib/utils";
import { PRIORITY_TEXT, STATUS_DOT } from "@/lib/constants";
import { useData } from "@/providers/data-provider";
import { useLanguage } from "@/lib/i18n";
import { usePomodoro, type PomodoroMode } from "@/providers/pomodoro-provider";
import type { AmbienceType } from "@/lib/flight/types";
import { Button } from "@/components/ui/button";
import { AudioControls } from "@/components/pomodoro/audio-controls";
import { FlightControls } from "@/components/pomodoro/flight-controls";

const PRESETS = [10, 15, 25, 30, 45, 60] as const;
const DEFAULT_MINUTES = 25;
const RING_RADIUS = 92;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

export function PomodoroSession({ task }: { task: Task }) {
  const { t } = useLanguage();
  const { updateTask } = useData();
  const router = useRouter();
  const {
    session,
    remainingMs,
    elapsedPct,
    start,
    pause,
    resume,
    dismiss,
    changeAmbience,
    changeVolume,
  } = usePomodoro();

  const [localMinutes, setLocalMinutes] = useState<number>(DEFAULT_MINUTES);
  const [mode, setMode] = useState<PomodoroMode>("simple");
  const [localAmbience, setLocalAmbience] = useState<AmbienceType>("none");
  const [localVolume, setLocalVolume] = useState(0.5);
  const [flightDuration, setFlightDuration] = useState<number | null>(null);

  const active = session && session.taskId === task.id ? session : null;
  const isRunning = active?.status === "running";
  const finished = active?.status === "finished";

  const modeInUse = active ? (active.mode ?? "simple") : mode;
  const ambience = active ? (active.ambience ?? "none") : localAmbience;
  const volume = active ? (active.volume ?? 0.5) : localVolume;

  const duration = active
    ? active.durationMin
    : mode === "flight"
      ? (flightDuration ?? null)
      : localMinutes;

  const flightIdle = mode === "flight" && !active && duration === null;

  const totalSeconds = duration ? duration * 60 : 0;
  const remainingSeconds = active
    ? Math.max(0, Math.ceil(remainingMs / 1000))
    : totalSeconds;
  const pct = active ? elapsedPct : 0;

  const mm = Math.floor(remainingSeconds / 60);
  const ss = remainingSeconds % 60;
  const time =
    totalSeconds > 0
      ? `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
      : "--:--";

  useEffect(() => {
    const previous = document.title;
    if (isRunning) {
      document.title = `${time} · ${task.title}`;
    }
    return () => {
      document.title = previous;
    };
  }, [time, task.title, isRunning]);

  function pick(minutes: number) {
    if (isRunning) return;
    if (active) {
      begin(minutes, "simple");
      return;
    }
    setLocalMinutes(minutes);
  }

  function begin(
    minutes: number,
    usedMode: PomodoroMode,
    route?: string,
  ) {
    start(
      { id: task.id, title: task.title },
      minutes,
      { mode: usedMode, routeLabel: route, ambience, volume },
    );
  }

  function toggle() {
    if (!active || finished) {
      const usedMode = active?.mode ?? modeInUse;
      begin(
        active?.durationMin ?? duration ?? DEFAULT_MINUTES,
        usedMode,
        active?.routeLabel,
      );
      return;
    }
    if (isRunning) {
      pause();
    } else {
      resume();
    }
  }

  function reset() {
    dismiss();
  }

  function onFlightStart(minutes: number, route: string) {
    setFlightDuration(minutes);
    begin(minutes, "flight", route);
  }

  function choose(status: TaskStatus) {
    updateTask(task.id, {
      status,
      completedAt: status === "done" ? new Date().toISOString() : undefined,
    });
    dismiss();
    router.push("/kanban");
  }

  function onAmbienceChange(type: AmbienceType) {
    if (active && !finished) changeAmbience(type);
    else setLocalAmbience(type);
  }

  function onVolumeChange(value: number) {
    if (active && !finished) changeVolume(value);
    else setLocalVolume(value);
  }

  const modeButton = (value: PomodoroMode) =>
    cn(
      "flex-1 rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ease-out-expo",
      modeInUse === value
        ? "bg-amber-500/15 text-amber-200"
        : "text-muted hover:text-foreground",
    );

  return (
    <section className="flex flex-col gap-5">
      <header className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-xl font-semibold tracking-tight">
            <span className="text-gold-gradient">{t.pomodoro.title}</span>
          </h1>
          <p className="text-[13px] text-muted">{t.pomodoro.subtitle}</p>
        </div>
        <Link href="/kanban">
          <Button variant="ghost" size="sm">
            <ArrowLeft size={14} />
            {t.pomodoro.backToBoard}
          </Button>
        </Link>
      </header>

      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-[var(--inset-top),var(--app-shadow)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-amber-500/60 via-orange-500/25 to-transparent" />

          <div className="mb-6 flex items-center gap-2.5">
            <span
              className={cn(
                "h-2 w-2 shrink-0 rounded-full",
                STATUS_DOT[task.status],
              )}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">
              {task.title}
            </span>
            {modeInUse === "flight" && active?.routeLabel && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-amber-200">
                <Plane size={10} />
                {active.routeLabel}
              </span>
            )}
            <span
              className={cn(
                "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold",
                PRIORITY_TEXT[task.priority],
              )}
            >
              {t.priority[task.priority]}
            </span>
          </div>

          <div className="relative mx-auto h-52 w-52">
            <svg viewBox="0 0 200 200" className="absolute inset-0 h-full w-full -rotate-90">
              <circle
                cx="100"
                cy="100"
                r={RING_RADIUS}
                fill="none"
                stroke="rgba(255,255,255,0.07)"
                strokeWidth="6"
              />
              <circle
                cx="100"
                cy="100"
                r={RING_RADIUS}
                fill="none"
                stroke={modeInUse === "flight" ? "url(#pomodoro-flight-ring)" : "url(#pomodoro-ring)"}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={RING_CIRCUMFERENCE}
                strokeDashoffset={RING_CIRCUMFERENCE * (1 - pct / 100)}
                style={{ transition: "stroke-dashoffset 0.9s linear" }}
              />
              <defs>
                <linearGradient id="pomodoro-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#fbbf24" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
                <linearGradient id="pomodoro-flight-ring" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#818cf8" />
                </linearGradient>
              </defs>
            </svg>
            <div
              className="absolute inset-0 rounded-full shadow-[var(--inset-top)]"
              aria-hidden
            />
            <div className="absolute inset-[7px] flex flex-col items-center justify-center gap-1.5 rounded-full bg-[#0c0e11]">
              <span
                className={cn(
                  "font-mono text-[44px] font-semibold leading-none tracking-tight",
                  finished ? "text-amber-200" : "text-amber-100",
                )}
              >
                {time}
              </span>
              <span
                className={cn(
                  "text-[11px] font-medium uppercase tracking-[0.2em]",
                  finished ? "text-amber-300" : "text-muted",
                )}
              >
                {finished
                  ? t.pomodoro.timeUp
                  : modeInUse === "flight"
                    ? t.pomodoro.flight.toUpperCase()
                    : t.pomodoro.focus}
              </span>
            </div>
          </div>

          <div className="mt-5 flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-1">
            {(["simple", "flight"] as const).map((value) => (
              <button
                key={value}
                type="button"
                disabled={Boolean(active)}
                onClick={() => setMode(value)}
                className={cn(modeButton(value), active && "cursor-not-allowed")}
              >
                {value === "simple" ? t.pomodoro.simple : t.pomodoro.flight}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {modeInUse === "flight" ? (
              <FlightControls
                disabled={Boolean(active)}
                onStart={onFlightStart}
              />
            ) : (
              <>
                <p className="mb-2.5 text-center text-[11px] font-medium uppercase tracking-widest text-muted">
                  {t.pomodoro.duration}
                </p>
                <div className="flex flex-wrap items-center justify-center gap-1.5">
                  {PRESETS.map((minutes) => (
                    <button
                      key={minutes}
                      type="button"
                      disabled={isRunning}
                      onClick={() => pick(minutes)}
                      className={cn(
                        "h-8 min-w-9 rounded-lg px-2 font-mono text-[12.5px] font-semibold transition-all duration-200 ease-out-expo active:scale-[0.97] active:duration-75 disabled:cursor-not-allowed disabled:opacity-40",
                        duration === minutes
                          ? "border border-amber-500/40 bg-amber-500/10 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.15)]"
                          : "border border-white/10 bg-surface-2 text-muted hover:border-amber-500/25 hover:text-foreground",
                      )}
                    >
                      {minutes}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          <div className="mt-5">
            <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-3">
              <AudioControls
                ambience={ambience}
                volume={volume}
                onChange={onAmbienceChange}
                onChangeVolume={onVolumeChange}
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            {finished ? (
              <>
                <div className="flex gap-2">
                  <Button
                    variant="subtle"
                    className="flex-1 justify-center"
                    onClick={() => choose("doing")}
                  >
                    <ArrowRight size={14} />
                    {t.pomodoro.keepDoing}
                  </Button>
                  <Button
                    variant="primary"
                    className="flex-1 justify-center"
                    onClick={() => choose("done")}
                  >
                    <Check size={14} />
                    {t.pomodoro.markDone}
                  </Button>
                </div>
                <p className="pt-0.5 text-center text-[11px] text-muted">
                  {t.pomodoro.timeUpHint}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-center"
                  onClick={toggle}
                >
                  <RotateCcw size={13} />
                  {t.pomodoro.again}
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="primary"
                  size="lg"
                  className="w-full justify-center"
                  onClick={toggle}
                  disabled={flightIdle}
                >
                  {isRunning ? <Pause size={15} /> : <Play size={15} />}
                  {isRunning ? t.pomodoro.pause : t.pomodoro.start}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="justify-center"
                  onClick={reset}
                >
                  <RotateCcw size={13} />
                  {t.pomodoro.reset}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}