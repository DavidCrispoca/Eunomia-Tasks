/**
 * Reglas de gamificación (Fase 2) — módulo isomorfo (cliente y servidor).
 * Fuente de verdad: `docs/gamification-rules.md`.
 *
 * El servidor es autoritativo: aquí solo viven constantes y fórmulas
 * deterministas para mostrar progreso. Ningún cliente envía XP ni saldo.
 */

export type RewardKind =
  | "focus_session"
  | "task_completed"
  | "milestone"
  | "goal_met"
  | "weekly_review"
  | "achievement";

export type AchievementCode =
  | "first_task"
  | "focus_10"
  | "week_review_1"
  | "island_1";

/** Recompensas base por evento. Escanear NFC no está aquí: no otorga nada. */
export const REWARD: Record<
  Exclude<RewardKind, "achievement">,
  { xp: number; coins: number }
> = {
  focus_session: { xp: 10, coins: 1 },
  task_completed: { xp: 20, coins: 2 },
  milestone: { xp: 50, coins: 5 },
  goal_met: { xp: 25, coins: 3 },
  weekly_review: { xp: 15, coins: 1 },
};

/** Una sesión de enfoque cuenta si dura al menos estos minutos. */
export const FOCUS_MIN_VALID_MINUTES = 10;
/** Tope de cordura por sesión (evita registros imposibles). */
export const FOCUS_MAX_MINUTES = 240;
/** Límite de sesiones premiables por día (anti-farmeo). */
export const FOCUS_DAILY_CAP = 12;

/** Nivel a partir del XP acumulado: `floor(sqrt(xp / 100)) + 1`. */
export function levelForXp(xp: number): number {
  return Math.max(1, Math.floor(Math.sqrt(Math.max(xp, 0) / 100)) + 1);
}

/** XP total necesario para alcanzar un nivel. */
export function xpForLevel(level: number): number {
  return 100 * Math.pow(Math.max(level, 1) - 1, 2);
}

export interface LevelProgress {
  level: number;
  xp: number;
  intoLevel: number;
  levelSpan: number;
  pct: number;
  toNext: number;
}

/** Progreso dentro del nivel actual, para barras de UI. */
export function levelProgress(xp: number): LevelProgress {
  const safeXp = Math.max(xp, 0);
  const level = levelForXp(safeXp);
  const floorXp = xpForLevel(level);
  const nextXp = xpForLevel(level + 1);
  const span = Math.max(1, nextXp - floorXp);
  const intoLevel = safeXp - floorXp;
  return {
    level,
    xp: safeXp,
    intoLevel,
    levelSpan: span,
    pct: Math.min(100, Math.max(0, (intoLevel / span) * 100)),
    toNext: Math.max(0, nextXp - safeXp),
  };
}

/** Catálogo de logros de referencia (la BD es la fuente autoritativa). */
export const ACHIEVEMENT_CODES: AchievementCode[] = [
  "first_task",
  "focus_10",
  "week_review_1",
  "island_1",
];

export interface GamificationEventView {
  id: string;
  kind: RewardKind | string;
  refId: string;
  xpDelta: number;
  coinDelta: number;
  createdAt: string;
}

export interface AchievementView {
  code: string;
  nameEs: string;
  nameEn: string;
  descriptionEs: string;
  descriptionEn: string;
  xpReward: number;
  coinReward: number;
  unlocked: boolean;
  unlockedAt?: string;
}

export interface GamificationSnapshot {
  xp: number;
  level: number;
  coins: number;
  events: GamificationEventView[];
  achievements: AchievementView[];
  /** true si los datos vienen del servidor; false = estimación local (demo). */
  serverBacked: boolean;
}

export interface AwardResult {
  awarded: boolean;
  xp: number;
  level: number;
  coins: number;
  xpDelta: number;
  coinDelta: number;
  levelUp: boolean;
  unlocked: AchievementView[];
  /** Evento recién concedido (para el feed optimista), si lo hubo. */
  event: GamificationEventView | null;
}

export const EMPTY_SNAPSHOT: GamificationSnapshot = {
  xp: 0,
  level: 1,
  coins: 0,
  events: [],
  achievements: [],
  serverBacked: true,
};
