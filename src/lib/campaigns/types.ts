export interface IslandView {
  code: string;
  nameEs: string;
  nameEn: string;
  biome: string;
  costCoins: number;
  requiresIslandCode: string | null;
  sort: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface WorldView {
  islands: IslandView[];
}

export type UnlockErrorKind =
  | "unknown"
  | "already-unlocked"
  | "insufficient"
  | "prerequisite";

export interface UnlockOutcome {
  ok: boolean;
  /** Solo tiene sentido cuando `ok` es false. */
  reason: UnlockErrorKind;
  /** Saldo de monedas tras el intento. */
  coins: number;
  /** La isla objetivo con su estado actualizado. */
  island: IslandView | null;
}