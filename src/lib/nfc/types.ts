import type { AwardResult } from "@/lib/gamification/rules";
import type { MascotState } from "@/components/mascot/mascot";

/** De dónde viene la sesión: tarjeta tocada, selector manual o lector Web NFC. */
export type NfcSessionSource = "nfc" | "manual" | "webnfc";

export interface ActivityModeView {
  code: string;
  nameEs: string;
  nameEn: string;
  emoji: string;
  sort: number;
}

export interface NfcSessionView {
  id: string;
  modeCode: string;
  source: NfcSessionSource;
  startedAt: string;
  endedAt: string | null;
  minutes: number | null;
}

export type ToggleErrorKind =
  | "not-ready"
  | "unknown"
  | "invalid-token"
  | "mode-not-found";

export type ToggleResult =
  | {
      ok: true;
      action: "started";
      mode: ActivityModeView;
      session: NfcSessionView;
      /** Premio de una sesión de enfoque que se cerró al cambiar de modo. */
      award: AwardResult | null;
    }
  | {
      ok: true;
      action: "ended";
      mode: ActivityModeView;
      session: NfcSessionView;
      minutes: number;
      award: AwardResult | null;
    }
  | { ok: false; reason: ToggleErrorKind };

/**
 * Catálogo de modos por defecto (isomorfo). La BD (`activity_modes`) es la fuente
 * autoritativa; esto permite mostrar la UI aunque la nube aún no responda.
 */
export const NFC_MODES: ActivityModeView[] = [
  { code: "focus", nameEs: "Enfoque", nameEn: "Focus", emoji: "🎯", sort: 1 },
  { code: "work", nameEs: "Trabajo", nameEn: "Work", emoji: "💼", sort: 2 },
  { code: "study", nameEs: "Estudio", nameEn: "Study", emoji: "📚", sort: 3 },
  { code: "sleep", nameEs: "Sueño", nameEn: "Sleep", emoji: "🌙", sort: 4 },
  { code: "break", nameEs: "Descanso", nameEn: "Break", emoji: "☕", sort: 5 },
  { code: "review", nameEs: "Revisión", nameEn: "Review", emoji: "🧭", sort: 6 },
];

export function modeLabel(mode: ActivityModeView, lang: "es" | "en"): string {
  return lang === "es" ? mode.nameEs : mode.nameEn;
}

export function findMode(code: string): ActivityModeView | null {
  return NFC_MODES.find((mode) => mode.code === code) ?? null;
}

/** Pose de la mascota asociada a cada modo (Enfoque/Trabajo → trabajo, etc.). */
export function mascotStateForMode(code: string | null): MascotState {
  switch (code) {
    case "focus":
    case "work":
      return "work";
    case "study":
      return "learn";
    case "sleep":
      return "sleep";
    default:
      return "chill";
  }
}
