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

const STORAGE_KEY = "eunomia:pomodoro";

export type PomodoroStatus = "running" | "paused" | "finished";

export interface StoredPomodoro {
  taskId: string;
  title: string;
  durationMin: number;
  endAt: number | null;
  remainingMs: number;
  status: PomodoroStatus;
}

interface ItemTask {
  id: string;
  title: string;
}

interface PomodoroContextValue {
  session: StoredPomodoro | null;
  remainingMs: number;
  elapsedPct: number;
  start: (task: ItemTask, durationMin: number) => void;
  pause: () => void;
  resume: () => void;
  dismiss: () => void;
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
    return parsed;
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

export function PomodoroProvider({ children }: { children: ReactNode }) {
  const { t } = useLanguage();
  const [session, setSession] = useState<StoredPomodoro | null>(() =>
    loadSession(),
  );
  const sessionRef = useRef(session);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  const running = session?.status === "running";

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
        notifyFinished(finished);
      } else {
        setNow(nowMs);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [running, notifyFinished]);

  const start = useCallback((task: ItemTask, durationMin: number) => {
    const created: StoredPomodoro = {
      taskId: task.id,
      title: task.title,
      durationMin,
      endAt: Date.now() + durationMin * 60 * 1000,
      remainingMs: durationMin * 60 * 1000,
      status: "running",
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
  }, []);

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
    sessionRef.current = null;
    saveSession(null);
    setSession(null);
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
    }),
    [session, remainingMs, elapsedPct, start, pause, resume, dismiss],
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