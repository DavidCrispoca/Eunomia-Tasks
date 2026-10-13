"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import type { PlayerRef } from "@remotion/player";
import { useReducedMotion } from "framer-motion";
import { useGamification } from "@/providers/gamification-provider";
import { usePomodoro } from "@/providers/pomodoro-provider";
import type { Celebration } from "@/providers/gamification-provider";
import { PomodoroSuccess } from "@/remotion/compositions/PomodoroSuccess";
import { XpGain } from "@/remotion/compositions/XpGain";
import { LevelUp } from "@/remotion/compositions/LevelUp";
import { IslandUnlock } from "@/remotion/compositions/IslandUnlock";

const Player = dynamic(() => import("@remotion/player").then((m) => m.Player), { ssr: false });

type QueueItem = {
  id: string;
  key: number;
  kind: Celebration["kind"] | "pomodoro-success";
  inputProps: Record<string, unknown>;
};

const framesMap: Record<string, number> = {
  "pomodoro-success": 150,
  "xp-gain": 120,
  "level-up": 150,
  "island-unlock": 180,
};

const mapCelebrationToComp = (c: Celebration): { id: string; inputProps: Record<string, unknown> } => {
  if (c.kind === "reward") return { id: "xp-gain", inputProps: { xp: c.xp, coins: c.coins } };
  if (c.kind === "achievement") return { id: "xp-gain", inputProps: { xp: c.xp ?? 0, coins: c.coins ?? 0 } };
  if (c.kind === "levelup") return { id: "level-up", inputProps: { level: c.level } };
  if (c.kind === "island") return { id: "island-unlock", inputProps: { island: c.islandCode } };
  return { id: "xp-gain", inputProps: { xp: 0 } };
};

function CurrentCelebration({ id, inputProps }: Pick<QueueItem, "id" | "inputProps">) {
  switch (id) {
    case "pomodoro-success":
      return (
        <PomodoroSuccess
          taskTitle={inputProps.taskTitle as string | undefined}
          minutes={inputProps.minutes as number | undefined}
        />
      );
    case "xp-gain":
      return (
        <XpGain
          xp={inputProps.xp as number | undefined}
          coins={inputProps.coins as number | undefined}
        />
      );
    case "level-up":
      return <LevelUp level={inputProps.level as number | undefined} />;
    default:
      return <IslandUnlock island={inputProps.island as string | undefined} />;
  }
}

export function RemotionCelebrationOverlay() {
  const reduceMotion = useReducedMotion();
  const { celebrations } = useGamification();
  const { session } = usePomodoro();
  const playerRef = useRef<PlayerRef>(null);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [lastPlayedAt, setLastPlayedAt] = useState(0);
  const [lastKind, setLastKind] = useState<string | null>(null);

  useEffect(() => {
    if (reduceMotion || !session || session.status !== "finished") return;
    const now = Date.now();
    if (lastKind === "pomodoro-success" && now - lastPlayedAt < 800) return;
    const timeoutId = window.setTimeout(() => {
      const title = session.title.length > 36 ? session.title.slice(0, 33) + "..." : session.title;
      setQueue((q) => [
        ...q,
        { id: "pomodoro-success", key: now, kind: "pomodoro-success", inputProps: { taskTitle: title, minutes: session.durationMin } },
      ]);
      setLastKind("pomodoro-success");
      setLastPlayedAt(now);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [session, reduceMotion, lastKind, lastPlayedAt]);

  useEffect(() => {
    if (reduceMotion || celebrations.length === 0) return;
    const latest = celebrations[celebrations.length - 1];
    const now = Date.now();
    if (latest.kind !== "island" && lastKind === "pomodoro-success" && now - lastPlayedAt < 800) return;
    const mapped = mapCelebrationToComp(latest);
    const timeoutId = window.setTimeout(() => {
      setQueue((q) => [
        ...q,
        { id: mapped.id, key: now, kind: latest.kind, inputProps: mapped.inputProps },
      ]);
      setLastKind(latest.kind);
      setLastPlayedAt(now);
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [celebrations, reduceMotion, lastKind, lastPlayedAt]);

  const queueHeadKey = queue[0]?.key ?? null;

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;
    const handleEnded = () => setQueue((q) => q.slice(1));
    player.addEventListener("ended", handleEnded);
    return () => player.removeEventListener("ended", handleEnded);
  }, [queueHeadKey]);

  if (reduceMotion || queue.length === 0) return null;

  const current = queue[0];
  const compId = current.id;
  const duration = framesMap[compId] ?? 150;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 60, pointerEvents: "none", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Player
        key={current.key}
        ref={playerRef}
        component={() => <CurrentCelebration id={compId} inputProps={current.inputProps} />}
        durationInFrames={duration}
        fps={30}
        compositionWidth={1080}
        compositionHeight={1080}
        style={{ width: "min(70vw, 70vh)", height: "min(70vw, 70vh)" }}
        loop={false}
        controls={false}
        autoPlay
      />
    </div>,
    document.body,
  );
}