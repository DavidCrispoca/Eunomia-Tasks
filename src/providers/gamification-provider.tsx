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
import { useData } from "@/providers/data-provider";
import {
  ACHIEVEMENT_CODES,
  EMPTY_SNAPSHOT,
  REWARD,
  levelForXp,
  levelProgress,
  type AchievementView,
  type AwardResult,
  type GamificationSnapshot,
  type LevelProgress,
} from "@/lib/gamification/rules";
import {
  awardFocusSession,
  awardTaskCompleted,
  loadGamification,
} from "@/lib/gamification/actions";
import {
  loadWorld,
  unlockIslandAction,
} from "@/lib/campaigns/actions";
import type { WorldView } from "@/lib/campaigns/types";

export interface Celebration {
  id: number;
  kind: "reward" | "achievement" | "levelup" | "island";
  xp: number;
  coins: number;
  code?: string;
  level?: number;
  islandCode?: string;
}

interface GamificationContextValue {
  snapshot: GamificationSnapshot;
  progress: LevelProgress;
  /** false cuando no hay nube y mostramos una estimación local (demo). */
  serverBacked: boolean;
  celebrations: Celebration[];
  dismissCelebration: (id: number) => void;
  noteFocusSession: (input: {
    taskId: string;
    refId: string;
    minutes: number;
  }) => Promise<void>;
  refresh: () => Promise<void>;
  /** Mundo de campañas (islas del usuario); null hasta cargar o en demo. */
  world: WorldView | null;
  worldLoaded: boolean;
  /** Isla en proceso de desbloqueo (code) o null. */
  unlockingIsland: string | null;
  unlockIsland: (islandCode: string) => Promise<void>;
}

const GamificationContext = createContext<GamificationContextValue | null>(null);

function localEstimate(tasks: { status: string }[]): GamificationSnapshot {
  const done = tasks.filter((t) => t.status === "done").length;
  const xp = done * REWARD.task_completed.xp;
  const coins = done * REWARD.task_completed.coins;
  const achievements: AchievementView[] = ACHIEVEMENT_CODES.map((code) => ({
    code,
    nameEs: code,
    nameEn: code,
    descriptionEs: "",
    descriptionEn: "",
    xpReward: 0,
    coinReward: 0,
    unlocked: code === "first_task" && done >= 1,
  }));
  return {
    xp,
    level: levelForXp(xp),
    coins,
    events: [],
    achievements,
    serverBacked: false,
  };
}

export function GamificationProvider({
  initialData,
  initialDoneIds,
  children,
}: {
  initialData?: GamificationSnapshot | null;
  initialDoneIds?: Set<string>;
  children: ReactNode;
}) {
  const { tasks } = useData();
  const [snapshot, setSnapshot] = useState<GamificationSnapshot>(
    () => initialData ?? EMPTY_SNAPSHOT,
  );
  const [syncedInitial, setSyncedInitial] = useState<GamificationSnapshot | null>(
    initialData ?? null,
  );
  const [celebrations, setCelebrations] = useState<Celebration[]>([]);
  const celebrationId = useRef(0);
  const [world, setWorld] = useState<WorldView | null>(null);
  const [worldLoaded, setWorldLoaded] = useState(false);
  const [unlockingIsland, setUnlockingIsland] = useState<string | null>(null);

  const serverBacked = Boolean(initialData);

  // Sincroniza cuando el servidor entrega un snapshot nuevo (patrón de React
  // para ajustar estado al cambiar una prop, sin efecto ni renders en cascada).
  if ((initialData ?? null) !== syncedInitial) {
    setSyncedInitial(initialData ?? null);
    setSnapshot(initialData ?? EMPTY_SNAPSHOT);
  }

  // Carga el mundo de campañas una sola vez (modo nube).
  useEffect(() => {
    if (!serverBacked || worldLoaded) return;
    let alive = true;
    void loadWorld().then((next) => {
      if (!alive) return;
      if (next) setWorld(next);
      setWorldLoaded(true);
    });
    return () => {
      alive = false;
    };
  }, [serverBacked, worldLoaded]);

  // Modo local (demo/sin nube): estimación transparente derivada de las tareas.
  const localSnapshot = useMemo(() => localEstimate(tasks), [tasks]);
  const current = serverBacked ? snapshot : localSnapshot;

  const pushCelebrations = useCallback((result: AwardResult) => {
    const next: Celebration[] = [];
    if (result.awarded && (result.xpDelta > 0 || result.coinDelta > 0)) {
      next.push({
        id: ++celebrationId.current,
        kind: "reward",
        xp: result.xpDelta,
        coins: result.coinDelta,
      });
    }
    for (const achievement of result.unlocked) {
      next.push({
        id: ++celebrationId.current,
        kind: "achievement",
        xp: achievement.xpReward,
        coins: achievement.coinReward,
        code: achievement.code,
      });
    }
    if (result.levelUp) {
      next.push({
        id: ++celebrationId.current,
        kind: "levelup",
        xp: 0,
        coins: 0,
        level: result.level,
      });
    }
    if (next.length > 0) {
      setCelebrations((current) => [...current, ...next]);
    }
  }, []);

  const applyResult = useCallback(
    (result: AwardResult | null) => {
      if (!result) return;
      setSnapshot((current) => {
        const events = result.event
          ? [result.event, ...current.events].slice(0, 20)
          : current.events;
        const unlockedCodes = new Set(result.unlocked.map((a) => a.code));
        const achievements =
          unlockedCodes.size === 0
            ? current.achievements
            : current.achievements.map((a) =>
                unlockedCodes.has(a.code)
                  ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() }
                  : a,
              );
        return {
          ...current,
          xp: result.xp,
          level: result.level,
          coins: result.coins,
          events,
          achievements,
        };
      });
      pushCelebrations(result);
    },
    [pushCelebrations],
  );

  const noteFocusSession = useCallback(
    async (input: { taskId: string; refId: string; minutes: number }) => {
      if (!serverBacked) return;
      const result = await awardFocusSession(input);
      applyResult(result);
    },
    [serverBacked, applyResult],
  );

  // Premia transiciones a "done". La primera pasada se siembra SOLO con el
  // ground truth del servidor (tareas ya hechas + eventos ya premiados), nunca
  // con las tareas observadas en el primer render (aún no hidratadas).
  const seenDone = useRef<Set<string> | null>(null);
  useEffect(() => {
    const doneIds = tasks.filter((t) => t.status === "done").map((t) => t.id);
    if (seenDone.current === null) {
      const awardedIds = (initialData?.events ?? [])
        .filter((event) => event.kind === "task_completed")
        .map((event) => event.refId);
      seenDone.current = new Set([
        ...(initialDoneIds ?? []),
        ...awardedIds,
      ]);
      return;
    }
    const seen = seenDone.current;
    const fresh = doneIds.filter((id) => !seen.has(id));
    for (const id of doneIds) seen.add(id);
    if (!serverBacked || fresh.length === 0) return;
    for (const id of fresh) {
      void awardTaskCompleted(id).then(applyResult);
    }
  }, [tasks, serverBacked, applyResult, initialData, initialDoneIds]);

  const dismissCelebration = useCallback((id: number) => {
    setCelebrations((current) => current.filter((c) => c.id !== id));
  }, []);

  const refresh = useCallback(async () => {
    if (!serverBacked) return;
    const next = await loadGamification();
    if (next) setSnapshot(next);
  }, [serverBacked]);

  const unlockIsland = useCallback(
    async (islandCode: string) => {
      if (!serverBacked || unlockingIsland) return;
      setUnlockingIsland(islandCode);
      try {
        const outcome = await unlockIslandAction(islandCode);
        if (!outcome) return;
        if (outcome.island) {
          setWorld((current) =>
            current
              ? {
                  ...current,
                  islands: current.islands.map((island) =>
                    island.code === outcome.island?.code ? outcome.island! : island,
                  ),
                }
              : current,
          );
        }
        if (outcome.ok) {
          // El servidor ya descontó monedas y pudo otorgar island_1 (+50 XP).
          await refresh();
          setCelebrations((current) => [
            ...current,
            {
              id: ++celebrationId.current,
              kind: "island",
              xp: 0,
              coins: 0,
              islandCode: outcome.island?.code,
            },
          ]);
        }
      } finally {
        setUnlockingIsland(null);
      }
    },
    [serverBacked, unlockingIsland, refresh],
  );

  const value = useMemo<GamificationContextValue>(
    () => ({
      snapshot: current,
      progress: levelProgress(current.xp),
      serverBacked,
      celebrations,
      dismissCelebration,
      noteFocusSession,
      refresh,
      world: worldLoaded ? world : null,
      worldLoaded,
      unlockingIsland,
      unlockIsland,
    }),
    [
      current,
      serverBacked,
      celebrations,
      dismissCelebration,
      noteFocusSession,
      refresh,
      world,
      worldLoaded,
      unlockingIsland,
      unlockIsland,
    ],
  );

  return (
    <GamificationContext.Provider value={value}>
      {children}
    </GamificationContext.Provider>
  );
}

export function useGamification() {
  const ctx = useContext(GamificationContext);
  if (!ctx) {
    throw new Error("useGamification must be used within GamificationProvider");
  }
  return ctx;
}
