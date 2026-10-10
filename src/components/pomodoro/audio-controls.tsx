"use client";

import { useEffect, useRef } from "react";
import {
  CloudLightning,
  CloudRain,
  Coffee,
  Flame,
  Headphones,
  Music2,
  Radio,
  TreePine,
  Volume2,
  VolumeX,
  Waves,
  Wind,
} from "lucide-react";
import type { AmbienceType } from "@/lib/flight/types";
import {
  playBackgroundAudio,
  stopBackgroundAudio,
  updateAudioVolume,
} from "@/lib/flight/audio";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";

interface AudioOption {
  type: AmbienceType;
  icon: typeof CloudRain;
  labelKey: string;
  descriptionKey: string;
}

interface AudioControlsProps {
  ambience: AmbienceType;
  volume: number;
  onChange: (type: AmbienceType) => void;
  onChangeVolume: (volume: number) => void;
  disabled?: boolean;
  compact?: boolean;
  /** Permite oír la escena antes de empezar (cuando no hay sesión activa). */
  preview?: boolean;
}

const SPOTIFY_URL = "https://open.spotify.com/search/lo-fi%20study";

const NONE_OPTION: AudioOption = {
  type: "none",
  icon: VolumeX,
  labelKey: "audioNone",
  descriptionKey: "audioNoneDesc",
};

const AMBIENCE_OPTIONS: AudioOption[] = [
  { type: "storm", icon: CloudLightning, labelKey: "audioStorm", descriptionKey: "audioStormDesc" },
  { type: "rain", icon: CloudRain, labelKey: "audioRain", descriptionKey: "audioRainDesc" },
  { type: "forest-night", icon: TreePine, labelKey: "audioForestNight", descriptionKey: "audioForestNightDesc" },
  { type: "fireplace", icon: Flame, labelKey: "audioFireplace", descriptionKey: "audioFireplaceDesc" },
  { type: "cabin", icon: Wind, labelKey: "audioCabin", descriptionKey: "audioCabinDesc" },
  { type: "coffee", icon: Coffee, labelKey: "audioCoffee", descriptionKey: "audioCoffeeDesc" },
  { type: "lofi", icon: Music2, labelKey: "audioLoFi", descriptionKey: "audioLoFiDesc" },
];

const NOISE_OPTIONS: AudioOption[] = [
  { type: "white", icon: Waves, labelKey: "audioWhite", descriptionKey: "audioWhiteDesc" },
  { type: "brown", icon: Headphones, labelKey: "audioBrown", descriptionKey: "audioBrownDesc" },
];

function GroupLabel({ children }: { children: string }) {
  return (
    <p className="px-1 pb-1 pt-2.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted/70">
      {children}
    </p>
  );
}

export function AudioControls({
  ambience,
  volume,
  onChange,
  onChangeVolume,
  disabled,
  compact,
  preview,
}: AudioControlsProps) {
  const { t } = useLanguage();
  const previewRef = useRef(preview);

  useEffect(() => {
    previewRef.current = preview;
  }, [preview]);

  // Si el usuario sale de la página con una previsualización sonando, se corta.
  useEffect(
    () => () => {
      if (previewRef.current) stopBackgroundAudio();
    },
    [],
  );

  function describe(option: AudioOption) {
    return t.pomodoro[option.descriptionKey as keyof typeof t.pomodoro];
  }

  function renderOption(option: AudioOption) {
    const selected = ambience === option.type;
    const Icon = option.icon;
    const label = t.pomodoro[option.labelKey as keyof typeof t.pomodoro];

    return (
      <button
        key={option.type}
        type="button"
        role="radio"
        aria-checked={selected}
        disabled={disabled}
        title={describe(option)}
        onClick={() => select(option.type)}
        className={cn(
          "flex min-h-11 w-full items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition-all duration-200 ease-out-expo active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40",
          selected
            ? "border-violet-500/45 bg-violet-500/15 hover:border-violet-500/60 hover:bg-violet-500/25"
            : "border-white/10 bg-white/[0.03] surface-hover",
        )}
      >
        <span
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md border",
            selected
              ? "border-violet-500/40 bg-violet-500/20 text-violet-200"
              : "border-white/10 bg-white/[0.04] text-muted",
          )}
        >
          <Icon size={15} />
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              "block truncate text-[12.5px] font-medium",
              selected ? "text-violet-200" : "text-foreground",
            )}
          >
            {label}
          </span>
          <span className="block truncate text-[10.5px] text-muted">{describe(option)}</span>
        </span>
        <span
          aria-hidden
          className={cn(
            "size-2 shrink-0 rounded-full border transition-colors duration-200 ease-out-expo",
            selected ? "border-violet-300 bg-violet-400" : "border-white/25 bg-transparent",
          )}
        />
      </button>
    );
  }

  function select(type: AmbienceType) {
    onChange(type);
    if (!preview || disabled) return;
    if (type === "none") {
      stopBackgroundAudio();
      return;
    }
    playBackgroundAudio(type, volume);
  }

  function handleVolume(value: number) {
    onChangeVolume(value);
    if (preview && !disabled) updateAudioVolume(value);
  }

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
          className="flex items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[10.5px] font-medium text-emerald-300 transition-colors hover:bg-emerald-500/20"
        >
          <Music2 size={12} />
          Spotify
        </a>
      </div>

      <div
        role="radiogroup"
        aria-label={t.pomodoro.audio}
        className="flex max-h-[264px] flex-col gap-1.5 overflow-y-auto pr-0.5"
      >
        {renderOption(NONE_OPTION)}
        <GroupLabel>{t.pomodoro.audioGroupAmbience}</GroupLabel>
        {AMBIENCE_OPTIONS.map(renderOption)}
        <GroupLabel>{t.pomodoro.audioGroupNoise}</GroupLabel>
        {NOISE_OPTIONS.map(renderOption)}
      </div>

      <div className="flex items-center gap-2.5 pt-0.5">
        <Volume2 size={14} className="shrink-0 text-muted" />
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={volume}
          disabled={disabled}
          onChange={(event) => handleVolume(parseFloat(event.target.value))}
          aria-label={t.pomodoro.volume}
          className="h-1.5 flex-1 cursor-pointer appearance-none rounded-full bg-white/10 accent-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        />
        <span
          className={cn(
            "w-9 shrink-0 text-right font-mono text-[10.5px] text-tabular",
            compact ? "text-muted" : "text-muted/80",
          )}
        >
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
}
