"use client";

import {
  CloudRain,
  Coffee,
  Flame,
  Headphones,
  Music2,
  Radio,
  Volume2,
  VolumeX,
  Waves,
  Wind,
} from "lucide-react";
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

const SPOTIFY_URL = "https://open.spotify.com/search/lo-fi%20study";

const OPTIONS: Array<{
  type: AmbienceType;
  icon: typeof VolumeX;
  labelKey: string;
  descriptionKey: string;
}> = [
  { type: "none", icon: VolumeX, labelKey: "audioNone", descriptionKey: "audioNoneDesc" },
  { type: "cabin", icon: Wind, labelKey: "audioCabin", descriptionKey: "audioCabinDesc" },
  { type: "rain", icon: CloudRain, labelKey: "audioRain", descriptionKey: "audioRainDesc" },
  { type: "white", icon: Waves, labelKey: "audioWhite", descriptionKey: "audioWhiteDesc" },
  { type: "brown", icon: Headphones, labelKey: "audioBrown", descriptionKey: "audioBrownDesc" },
  { type: "lofi", icon: Music2, labelKey: "audioLoFi", descriptionKey: "audioLoFiDesc" },
  { type: "coffee", icon: Coffee, labelKey: "audioCoffee", descriptionKey: "audioCoffeeDesc" },
  { type: "fireplace", icon: Flame, labelKey: "audioFireplace", descriptionKey: "audioFireplaceDesc" },
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
          <Radio size={12} className={ambience !== "none" ? "text-violet-300" : "text-muted"} />
          {t.pomodoro.audio}
        </span>
        <a
          href={SPOTIFY_URL}
          target="_blank"
          rel="noopener noreferrer"
          title={t.pomodoro.audioSpotifyDesc}
          className="flex items-center gap-1.5 rounded-full border border-green-500/25 bg-green-500/10 px-2.5 py-1 text-[10.5px] font-medium text-green-300 transition-colors hover:bg-green-500/20"
        >
          <Music2 size={12} />
          Spotify
        </a>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map(({ type, icon: Icon, labelKey, descriptionKey }) => (
          <button
            key={type}
            type="button"
            disabled={disabled}
            title={t.pomodoro[descriptionKey as keyof typeof t.pomodoro]}
            onClick={() => onChange(type)}
            className={cn(
              "flex min-h-11 items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium transition-all duration-200 ease-out-expo active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 max-sm:min-h-0",
              ambience === type
                ? "border-violet-500/45 bg-violet-500/15 text-violet-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
                : "border-white/10 bg-white/[0.03] text-muted hover:border-white/20 hover:text-foreground",
            )}
          >
            <Icon size={13} className="shrink-0" />
            <span className="whitespace-nowrap">
              {t.pomodoro[labelKey as keyof typeof t.pomodoro]}
            </span>
          </button>
        ))}
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
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        />
        <span className={cn("w-9 shrink-0 text-right font-mono text-[10.5px]", compact ? "text-muted" : "text-muted/80")}>
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
}
