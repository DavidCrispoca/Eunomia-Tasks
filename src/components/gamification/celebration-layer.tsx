"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Coins, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import {
  useGamification,
  type Celebration,
} from "@/providers/gamification-provider";
import { Mascot } from "@/components/mascot/mascot";
import type { AchievementCode } from "@/lib/gamification/rules";

function CelebrationToast({
  item,
  onDone,
}: {
  item: Celebration;
  onDone: (id: number) => void;
}) {
  const { t, lang } = useLanguage();
  const { world } = useGamification();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    const timer = window.setTimeout(() => onDone(item.id), 4200);
    return () => window.clearTimeout(timer);
  }, [item.id, onDone]);

  const islandName =
    item.kind === "island" && item.islandCode
      ? world?.islands.find((island) => island.code === item.islandCode) ?? null
      : null;

  const title =
    item.kind === "island"
      ? t.gamification.islandUnlocked
      : item.kind === "levelup"
        ? t.gamification.levelUpTitle
        : item.kind === "achievement"
          ? t.gamification.unlockedTitle
          : t.gamification.rewardTitle;

  const subtitle =
    item.kind === "island"
      ? islandName
        ? lang === "es"
          ? islandName.nameEs
          : islandName.nameEn
        : null
      : item.kind === "levelup"
        ? t.gamification.levelUpBody(item.level ?? 1)
        : item.kind === "achievement" && item.code
          ? t.gamification.names[item.code as AchievementCode]
          : null;

  return (
    <motion.div
      layout
      role="status"
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 8, scale: 0.98 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="surface-raised flex w-[280px] items-center gap-3 rounded-xl p-3 shadow-lg"
    >
      <Mascot state={item.kind === "levelup" ? "work" : "learn"} size={48} />
      <div className="flex min-w-0 flex-col">
        <span className="text-[12px] font-semibold text-foreground">{title}</span>
        {subtitle && (
          <span className="truncate text-[11px] text-muted">{subtitle}</span>
        )}
        {(item.xp > 0 || item.coins > 0) && (
          <span className="mt-0.5 flex items-center gap-2 text-[11px] font-medium">
            {item.xp > 0 && (
              <span className="inline-flex items-center gap-1 text-brand">
                <Sparkles size={11} aria-hidden />
                <span className="text-tabular">+{item.xp} XP</span>
              </span>
            )}
            {item.coins > 0 && (
              <span className="inline-flex items-center gap-1 text-gold">
                <Coins size={11} aria-hidden />
                <span className="text-tabular">+{item.coins}</span>
              </span>
            )}
          </span>
        )}
      </div>
    </motion.div>
  );
}

export function CelebrationLayer() {
  const { celebrations, dismissCelebration } = useGamification();

  return (
    <div
      className="pointer-events-none fixed bottom-20 right-4 z-40 flex flex-col items-end gap-2 lg:bottom-6 lg:right-6"
      aria-live="polite"
    >
      <AnimatePresence initial={false}>
        {celebrations.map((item) => (
          <div key={item.id} className="pointer-events-auto">
            <CelebrationToast item={item} onDone={dismissCelebration} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}
