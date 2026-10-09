"use client";

import { Check, Lock } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useGamification } from "@/providers/gamification-provider";
import type { AchievementCode } from "@/lib/gamification/rules";
import { cn } from "@/lib/utils";

export function AchievementList({ className }: { className?: string }) {
  const { snapshot } = useGamification();
  const { t } = useLanguage();

  const names = t.gamification.names;
  const descriptions = t.gamification.descriptions;

  return (
    <div className={cn("surface flex flex-col gap-3 rounded-xl p-4", className)}>
      <h3 className="text-[13px] font-semibold text-foreground">
        {t.gamification.achievementsTitle}
      </h3>
      <ul className="grid gap-2 sm:grid-cols-2">
        {snapshot.achievements.map((achievement) => {
          const code = achievement.code as AchievementCode;
          return (
            <li
              key={achievement.code}
              className={cn(
                "flex items-center gap-3 rounded-lg border p-2.5",
                achievement.unlocked
                  ? "border-gold/30 bg-gold/[0.06]"
                  : "border-border/70 opacity-70",
              )}
            >
              <span
                className={cn(
                  "grid h-9 w-9 shrink-0 place-items-center rounded-full",
                  achievement.unlocked
                    ? "bg-gold/15 text-gold"
                    : "bg-surface-1 text-muted",
                )}
                aria-hidden
              >
                {achievement.unlocked ? <Check size={16} /> : <Lock size={14} />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="truncate text-[12px] font-semibold text-foreground">
                  {names[code]}
                </span>
                <span className="truncate text-[11px] text-muted">
                  {descriptions[code]}
                </span>
              </span>
              <span
                className={cn(
                  "ml-auto shrink-0 text-[10px] font-medium uppercase tracking-wide",
                  achievement.unlocked ? "text-gold" : "text-muted",
                )}
              >
                {achievement.unlocked
                  ? t.gamification.achievementUnlocked
                  : t.gamification.achievementLocked}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
