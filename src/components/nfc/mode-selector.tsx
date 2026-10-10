"use client";

import { useLanguage } from "@/lib/i18n";
import { useNfc } from "@/providers/nfc-provider";
import { modeLabel } from "@/lib/nfc/types";
import { cn } from "@/lib/utils";

export function ModeSelector({ className }: { className?: string }) {
  const { modes, active, busy, toggle } = useNfc();
  const { t, lang } = useLanguage();

  return (
    <div className={cn("grid grid-cols-2 gap-2 sm:grid-cols-3", className)}>
      {modes.map((mode) => {
        const isActive = active?.modeCode === mode.code;
        return (
          <button
            key={mode.code}
            type="button"
            disabled={busy}
            aria-pressed={isActive}
            onClick={() => void toggle({ modeCode: mode.code, source: "manual" })}
            className={cn(
              "surface surface-hover flex items-center gap-2.5 rounded-xl px-3 py-3 text-left transition-colors duration-200 ease-out-expo disabled:opacity-60",
              isActive && "border-brand/50 bg-brand-soft",
            )}
          >
            <span className="text-lg" aria-hidden>
              {mode.emoji}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-medium text-foreground">
                {modeLabel(mode, lang)}
              </span>
              <span
                className={cn(
                  "block text-[11px]",
                  isActive ? "text-violet-300" : "text-muted",
                )}
              >
                {isActive ? t.nfc.stop : t.nfc.start}
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
