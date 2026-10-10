import { getISOWeek, getISOWeekYear } from "date-fns";

/**
 * Clave canónica de semana ISO (inicio en lunes), p. ej. `2026-W41`.
 * Es aritmética determinista (date-fns) y se usa igual en cliente y servidor.
 */
export function isoWeekKey(date: Date): string {
  const year = getISOWeekYear(date);
  const week = String(getISOWeek(date)).padStart(2, "0");
  return `${year}-W${week}`;
}