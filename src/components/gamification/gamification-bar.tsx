"use client";

import { Coins, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useGamification } from "@/providers/gamification-provider";
import { cn } from "@/lib/utils";

export function GamificationBar({
  variant = "full",
  className,
}: {
  variant?: "compact" | "full";
  className?: string;
}) {
  const { snapshot, progress, serverBacked } = useGamification();
  const { t } = useLanguage();

  if (variant === "compact") {
    return (
      <div
        className={cn("flex items-center gap-2", className)}
        aria-label={`${t.gamification.levelLabel} ${snapshot.level}`}
      >
        <span className="chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-foreground">
          <Sparkles size={12} className="text-brand" aria-hidden />
          {t.gamification.levelLabel}
          <span className="text-tabular">{snapshot.level}</span>
        </span>
        <div
          className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-white/[0.08] sm:block"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress.pct)}
        >
          <div
            className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out-expo"
            style={{ width: `${progress.pct}%` }}
          />
        </div>
        <span className="chip inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium text-gold">
          <Coins size={12} aria-hidden />
          <span className="text-tabular">{snapshot.coins}</span>
          <span className="sr-only">{t.gamification.coinsLabel}</span>
        </span>
      </div>
    );
  }

  return (
    <div className={cn("surface flex flex-col gap-3 rounded-xl p-4", className)}>
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 text-[13px] font-semibold text-foreground">
          <Sparkles size={14} className="text-brand" aria-hidden />
          {t.gamification.levelLabel}
          <span className="text-tabular text-base">{snapshot.level}</span>
        </span>
        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-gold">
          <Coins size={14} aria-hidden />
          <span className="text-tabular">{snapshot.coins}</span>
          <span className="text-[11px] font-medium text-muted">
            {t.gamification.coinsLabel}
          </span>
        </span>
      </div>

      <div
        className="h-2 overflow-hidden rounded-full bg-white/[0.08]"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(progress.pct)}
      >
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out-expo"
          style={{ width: `${progress.pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between gap-2 text-[11px] text-muted">
        <span className="text-tabular">
          {progress.intoLevel} / {progress.levelSpan} {t.gamification.xpLabel}
        </span>
        <span className="text-tabular">{t.gamification.toNext(progress.toNext)}</span>
      </div>

      <p className="text-[11px] text-muted/80">
        {serverBacked ? t.gamification.cloudNote : t.gamification.localNote}
      </p>
    </div>
  );
}
