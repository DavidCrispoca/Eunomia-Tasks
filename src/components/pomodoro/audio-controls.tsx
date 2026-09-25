"use client";

import { CloudRain, Radio, Settings, Volume2, VolumeX, Wind } from "lucide-react";
import type { AmbienceType } from "@/lib/flight/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

interface AudioControlsProps {
  ambience: AmbienceType;
  volume: number;
  onChange: (type: AmbienceType) => void;
  onChangeVolume: (volume: number) => void;
  disabled?: boolean;
  compact?: boolean;
}

const OPTIONS: Array<{ type: AmbienceType; icon: typeof VolumeX }> = [
  { type: "none", icon: VolumeX },
  { type: "white", icon: Settings },
  { type: "rain", icon: CloudRain },
  { type: "engine", icon: Wind },
];

export function AudioControls({
  ambience,
  volume,
  onChange,
  onChangeVolume,
  disabled,
  compact,
}: AudioControlsProps) {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">
          <Radio size={12} className={ambience !== "none" ? "text-amber-300" : "text-muted"} />
          {t.pomodoro.audio}
        </span>
        <div className="flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-0.5">
          {OPTIONS.map(({ type, icon: Icon }) => (
            <button
              key={type}
              type="button"
              disabled={disabled}
              aria-label={t.pomodoro[`audio${capitalize(type)}` as "audioNone"]}
              title={t.pomodoro[`audio${capitalize(type)}` as "audioNone"]}
              onClick={() => onChange(type)}
              className={cn(
                "grid h-7 w-7 place-items-center rounded-full transition-all duration-200 ease-out-expo active:scale-95 disabled:cursor-not-allowed disabled:opacity-40",
                ambience === type
                  ? "bg-amber-500/15 text-amber-300 shadow-[inset_0_1px_0_var(--inset-top)]"
                  : "text-muted hover:text-foreground",
              )}
            >
              <Icon size={14} />
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Volume2 size={14} className="shrink-0 text-muted" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          disabled={disabled}
          onChange={(e) => onChangeVolume(parseFloat(e.target.value))}
          aria-label={t.pomodoro.volume}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-amber-400 disabled:cursor-not-allowed disabled:opacity-40"
        />
        <span className={cn("w-9 shrink-0 text-right font-mono text-[10.5px]", compact ? "text-muted" : "text-muted/80")}>
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}