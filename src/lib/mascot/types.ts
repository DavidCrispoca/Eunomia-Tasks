/**
 * Catálogo de mascotas de Eunomia.
 *
 * Conviven tres especies (Pegaso, Lechuza, Fénix) y cada una tiene dos etapas
 * de evolución (`bebe`, `adulto`). Más adelante cada etapa sumará una pose por
 * estado de actividad.
 *
 * El arte vive en `public/assets/mascot/{species}/{stage}.webp` (WebP con
 * transparencia). Mientras un archivo no exista, `Mascot` degrada al SVG
 * provisional, de modo que añadir imágenes no requiere tocar componentes.
 */

export type MascotSpecies = "pegaso" | "lechuza" | "fenix";

export type MascotStage = "bebe" | "adulto";

export interface MascotSelection {
  species: MascotSpecies;
  stage: MascotStage;
}

export const MASCOT_SPECIES: readonly MascotSpecies[] = [
  "pegaso",
  "lechuza",
  "fenix",
];

export const MASCOT_STAGES: readonly MascotStage[] = ["bebe", "adulto"];

export const DEFAULT_MASCOT: MascotSelection = { species: "pegaso", stage: "bebe" };

/**
 * Especies cuyo arte ya está en `public/assets/mascot/`. Evita peticiones 404
 * mientras se generan los assets restantes: al añadir arte, agrega la especie
 * aquí. (Si un archivo concreto falta, `Mascot` cae al SVG con `onError`.)
 */
export const MASCOT_ART_AVAILABLE: ReadonlySet<MascotSpecies> = new Set<MascotSpecies>([
  "pegaso",
]);

export function hasMascotArt(species: MascotSpecies): boolean {
  return MASCOT_ART_AVAILABLE.has(species);
}

function isMember<T extends string>(list: readonly T[], value: unknown): value is T {
  return typeof value === "string" && (list as readonly string[]).includes(value);
}

export function isMascotSpecies(value: unknown): value is MascotSpecies {
  return isMember(MASCOT_SPECIES, value);
}

export function isMascotStage(value: unknown): value is MascotStage {
  return isMember(MASCOT_STAGES, value);
}

/** Ruta pública del arte de una mascota en una etapa. */
export function mascotAssetPath(species: MascotSpecies, stage: MascotStage): string {
  return `/assets/mascot/${species}/${stage}.webp`;
}

/** Parsea el valor persistido (JSON) tolerando datos incompletos o corruptos. */
export function parseMascot(raw: string | null): MascotSelection | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<MascotSelection>;
    if (isMascotSpecies(parsed.species) && isMascotStage(parsed.stage)) {
      return { species: parsed.species, stage: parsed.stage };
    }
    if (isMascotSpecies(parsed.species)) {
      return { species: parsed.species, stage: DEFAULT_MASCOT.stage };
    }
    if (isMascotStage(parsed.stage)) {
      return { species: DEFAULT_MASCOT.species, stage: parsed.stage };
    }
  } catch {
    // valor corrupto: se ignora y se usa el default
  }
  return null;
}
