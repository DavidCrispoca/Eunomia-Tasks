"use client";

import { useLanguage } from "@/lib/i18n";
import { useNfc } from "@/providers/nfc-provider";
import { mascotStateForMode, modeLabel } from "@/lib/nfc/types";
import { Mascot } from "@/components/mascot/mascot";
import { Button } from "@/components/ui/button";
import { ModeSelector } from "./mode-selector";
import { NfcReaderButton } from "./nfc-reader-button";
import { RecentSessions } from "./recent-sessions";
import { formatDuration, useElapsed } from "./use-elapsed";
import { cn } from "@/lib/utils";

export function ActivityModePanel({ className }: { className?: string }) {
  const { active, modes, busy, toggle } = useNfc();
  const { t, lang } = useLanguage();
  const elapsed = useElapsed(active?.startedAt ?? null);
  const activeMode = active
    ? (modes.find((mode) => mode.code === active.modeCode) ?? null)
    : null;
  const label = activeMode ? modeLabel(activeMode, lang) : null;

  return (
    <section
      className={cn("surface flex flex-col gap-5 rounded-xl p-4 sm:p-5", className)}
    >
      <header className="flex flex-col gap-1">
        <h1 className="text-lg font-semibold text-foreground">{t.nfc.title}</h1>
        <p className="text-[13px] text-muted">{t.nfc.subtitle}</p>
      </header>

      <div className="flex items-center gap-4 rounded-xl bg-surface-1 p-4">
        <Mascot
          state={mascotStateForMode(active?.modeCode ?? null)}
          size={96}
          className="max-sm:hidden"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-muted">
            {label ? t.nfc.activeNow(label) : t.nfc.idle}
          </p>
          <p className="text-tabular mt-1 text-3xl font-semibold text-foreground">
            {formatDuration(elapsed)}
          </p>
          <p className="mt-1 text-[11px] text-muted">{t.nfc.focusRewardHint}</p>
        </div>
        {active && (
          <Button
            variant="subtle"
            size="sm"
            disabled={busy}
            onClick={() =>
              void toggle({ modeCode: active.modeCode, source: "manual" })
            }
          >
            {t.nfc.stop}
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-[12px] text-muted">{t.nfc.manualHint}</p>
        <ModeSelector />
      </div>

      <div className="flex flex-col gap-2 rounded-xl bg-surface-1 p-4">
        <p className="text-[13px] font-medium text-foreground">{t.nfc.scanTitle}</p>
        <p className="text-[12px] text-muted">{t.nfc.scanHint}</p>
        <NfcReaderButton />
      </div>

      <RecentSessions />
    </section>
  );
}
