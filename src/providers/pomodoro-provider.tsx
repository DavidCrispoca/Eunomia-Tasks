"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useLanguage } from "@/lib/i18n";
import { useData } from "@/providers/data-provider";
import {
  playBackgroundAudio,
  stopBackgroundAudio,
  updateAudioVolume,
} from "@/lib/flight/audio";
import type { AmbienceType } from "@/lib/flight/types";

const STORAGE_KEY = "eunomia:pomodoro";

export type PomodoroStatus = "running" | "paused" | "finished";
export type PomodoroMode = "simple" | "flight";

export interface StoredPomodoro {
  taskId: string;
  title: string;
  durationMin: number;
  endAt: number | null;
  remainingMs: number;
  status: PomodoroStatus;
  startedAt: number;
  mode?: PomodoroMode;
  routeLabel?: string;
  ambience?: AmbienceType;
  volume?: number;
}

interface ItemTask {
  id: string;
  title: string;
}

export interface StartOptions {
  mode?: PomodoroMode;
  routeLabel?: string;
  ambience?: AmbienceType;
  volume?: number;
}

interface PomodoroContextValue {
  session: StoredPomodoro | null;
  remainingMs: number;
  elapsedPct: number;
  start: (task: ItemTask, durationMin: number, options?: StartOptions) => void;
  pause: () => void;
  resume: () => void;
  dismiss: () => void;
  changeAmbience: (type: AmbienceType) => void;
  changeVolume: (volume: number) => void;
}

const PomodoroContext = createContext<PomodoroContextValue | null>(null);

function loadSession(): StoredPomodoro | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredPomodoro;
    if (
      !parsed ||
      typeof parsed.taskId !== "string" ||
      typeof parsed.durationMin !== "number"
    ) {
      return null;
    }
    if (parsed.status === "running") {
      const endAt = parsed.endAt ?? Date.now();
      if (endAt <= Date.now()) {
        return {
          ...parsed,
          status: "finished",
          remainingMs: 0,
          endAt: null,
        };
      }
    }
    return {
      ...parsed,
      startedAt:
        typeof parsed.startedAt === "number"
          ? parsed.startedAt
          : Date.now(),
    };
  } catch {
    return null;
  }
}

function saveSession(session: StoredPomodoro | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage unavailable; the session keeps working in memory.
  }
}

function playChime() {
  try {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const now = ctx.currentTime;
    const notes: Array<[number, number]> = [
      [523.25, 0],
      [523.25, 0.22],
      [659.25, 0.44],
    ];
    for (const [freq, offset] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + offset);
      gain.gain.exponentialRampToValueAtTime(0.18, now + offset + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.32);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + offset);
      osc.stop(now + offset + 0.34);
    }
    void ctx.resume();
  } catch {
    // Audio is a nice-to-have; never break the timer.
  }
}

/** Minutos efectivos de una sesión aún sin terminar. */
function elapsedMinutesOf(session: StoredPomodoro): number {
  if (session.status === "finished") return session.durationMin;
  if (session.status === "running") {
    const elapsed = ((session.endAt ?? Date.now()) - session.startedAt) / 60000;
    return Math.max(0, Math.min(session.durationMin, elapsed));
  }
  return Math.max(0, session.durationMin - session.remainingMs / 60000);
}

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const { tasks, updateTask } = useData();
  const [session, setSession] = useState<StoredPomodoro | null>(() =>
    loadSession(),
  );
  const sessionRef = useRef(session);
  const [now, setNow] = useState(() => Date.now());

  const tasksRef = useRef(tasks);
  const updateTaskRef = useRef(updateTask);
  useEffect(() => {
    tasksRef.current = tasks;
    updateTaskRef.current = updateTask;
  }, [tasks, updateTask]);

  // Evita registrar dos veces la misma sesión (clave: tarea + instante de inicio).
  const loggedSessionsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const running = session?.status === "running";

  const volumeRef = useRef(session?.volume ?? 0.5);
  useEffect(() => {
    volumeRef.current = session?.volume ?? 0.5;
  }, [session?.volume]);

  // Sonido ambiente: arranca al correr, se detiene al pausar/terminar.
  const ambienceKey = `${session?.status ?? "idle"}:${session?.ambience ?? "none"}`;
  useEffect(() => {
    if (session?.status === "running" && session.ambience && session.ambience !== "none") {
      playBackgroundAudio(session.ambience, volumeRef.current);
    } else {
      stopBackgroundAudio();
    }
  }, [ambienceKey, session?.status, session?.ambience]);

  const sessionVolume = session?.volume;

  useEffect(() => {
    updateAudioVolume(sessionVolume ?? 0.5);
  }, [sessionVolume]);

  useEffect(() => () => stopBackgroundAudio(), []);

  const logFocus = useCallback(
    (current: StoredPomodoro) => {
      const key = `${current.taskId}:${current.startedAt}`;
      if (loggedSessionsRef.current.has(key)) return;
      const minutes = Math.round(elapsedMinutesOf(current));
      if (minutes <= 0) return;
      loggedSessionsRef.current.add(key);
      const task = tasksRef.current.find((item) => item.id === current.taskId);
      const updated = (task?.focusMinutes ?? 0) + minutes;
      updateTaskRef.current(current.taskId, { focusMinutes: updated });
    },
    [],
  );

  const notifyFinished = useCallback(
    (finished: StoredPomodoro) => {
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;
      try {
        new Notification(t.pomodoro.timeUp, {
          body: `${finished.title} — ${t.pomodoro.finishNotifyBody}`,
        });
      } catch {
        // Notification failed; the in-app chip still shows the finished state.
      }
    },
    [t],
  );

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      const current = sessionRef.current;
      if (!current || current.status !== "running") return;
      const nowMs = Date.now();
      if (nowMs >= (current.endAt ?? nowMs)) {
        const finished: StoredPomodoro = {
          ...current,
          status: "finished",
          remainingMs: 0,
          endAt: null,
        };
        sessionRef.current = finished;
        saveSession(finished);
        setSession(finished);
        setNow(nowMs);
        playChime();
        logFocus(finished);
        notifyFinished(finished);
      } else {
        setNow(nowMs);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [running, notifyFinished, logFocus]);

  const start = useCallback(
    (task: ItemTask, durationMin: number, options?: StartOptions) => {
      const created: StoredPomodoro = {
        taskId: task.id,
        title: task.title,
        durationMin,
        endAt: Date.now() + durationMin * 60 * 1000,
        remainingMs: durationMin * 60 * 1000,
        status: "running",
        startedAt: Date.now(),
        mode: options?.mode,
        routeLabel: options?.routeLabel,
        ambience: options?.ambience,
        volume: options?.volume ?? 0.5,
      };
      sessionRef.current = created;
      saveSession(created);
      setSession(created);
      setNow(Date.now());
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "default"
      ) {
        void Notification.requestPermission().catch(() => undefined);
      }
    },
    [],
  );

  const pause = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.status !== "running") return;
    const paused: StoredPomodoro = {
      ...current,
      status: "paused",
      remainingMs: Math.max(0, (current.endAt ?? Date.now()) - Date.now()),
      endAt: null,
    };
    sessionRef.current = paused;
    saveSession(paused);
    setSession(paused);
  }, []);

  const resume = useCallback(() => {
    const current = sessionRef.current;
    if (!current || current.status !== "paused") return;
    const resumed: StoredPomodoro = {
      ...current,
      status: "running",
      endAt: Date.now() + Math.max(0, current.remainingMs),
    };
    sessionRef.current = resumed;
    saveSession(resumed);
    setSession(resumed);
    setNow(Date.now());
  }, []);

  const dismiss = useCallback(() => {
    const current = sessionRef.current;
    if (current && current.status !== "finished") {
      logFocus(current);
    }
    sessionRef.current = null;
    saveSession(null);
    setSession(null);
    stopBackgroundAudio();
  }, [logFocus]);

  const changeAmbience = useCallback((ambience: AmbienceType) => {
    const current = sessionRef.current;
    if (!current || current.status === "finished") return;
    const next = { ...current, ambience };
    sessionRef.current = next;
    saveSession(next);
    setSession(next);
  }, []);

  const changeVolume = useCallback((volume: number) => {
    const current = sessionRef.current;
    if (!current || current.status === "finished") return;
    const next = { ...current, volume };
    sessionRef.current = next;
    saveSession(next);
    setSession(next);
  }, []);

  const remainingMs = useMemo(() => {
    if (!session) return 0;
    if (session.status === "running") {
      return Math.max(0, (session.endAt ?? now) - now);
    }
    return session.remainingMs;
  }, [session, now]);

  const elapsedPct = useMemo(() => {
    if (!session) return 0;
    const total = session.durationMin * 60 * 1000;
    if (total <= 0) return 0;
    return Math.min(100, Math.max(0, ((total - remainingMs) / total) * 100));
  }, [session, remainingMs]);

  const value = useMemo<PomodoroContextValue>(
    () => ({
      session,
      remainingMs,
      elapsedPct,
      start,
      pause,
      resume,
      dismiss,
      changeAmbience,
      changeVolume,
    }),
    [
      session,
      remainingMs,
      elapsedPct,
      start,
      pause,
      resume,
      dismiss,
      changeAmbience,
      changeVolume,
    ],
  );

  return (
    <PomodoroContext.Provider value={value}>
      {children}
    </PomodoroContext.Provider>
  );
}

export function usePomodoro() {
  const ctx = useContext(PomodoroContext);
  if (!ctx) {
    throw new Error("usePomodoro must be used within PomodoroProvider");
  }
  return ctx;
}