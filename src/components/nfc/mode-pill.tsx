"use client";

import Link from "next/link";
import { Activity } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useNfc } from "@/providers/nfc-provider";
import { modeLabel } from "@/lib/nfc/types";
import { cn } from "@/lib/utils";

export function ModePill({ className }: { className?: string }) {
  const { active, modes } = useNfc();
  const { t, lang } = useLanguage();
  const mode = active
    ? (modes.find((item) => item.code === active.modeCode) ?? null)
    : null;

  return (
    <Link
      href="/pomodoro"
      aria-label={t.nfc.openModes}
      className={cn(
        "chip inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-foreground transition-colors duration-200 ease-out-expo hover:bg-surface-hover",
        className,
      )}
    >
      {mode ? (
        <span aria-hidden>{mode.emoji}</span>
      ) : (
        <Activity size={12} className="text-teal" aria-hidden />
      )}
      <span className="hidden sm:inline">
        {mode ? modeLabel(mode, lang) : t.nfc.navLabel}
      </span>
    </Link>
  );
}
