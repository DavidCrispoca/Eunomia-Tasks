/**
 * Conversión entre horas locales de una zona horaria IANA y UTC.
 * Los bloques de la app guardan fecha (YYYY-MM-DD) y hora (HH:mm)
 * locales del perfil; Google Calendar necesita instantes RFC3339.
 */

/** Offset en ms de `timeZone` en el instante dado (DST incluido). */
function zoneOffsetMs(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour") % 24,
    get("minute"),
    get("second"),
  );
  return asUtc - instant.getTime();
}

export function isTimeZoneValid(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * Instante UTC de la fecha/hora local `dateStr` `hhmm` en `timeZone`.
 * Recorre el offset dos veces para resolver ambigüedades de DST.
 */
export function zonedTimeToUtc(
  dateStr: string,
  hhmm: string,
  timeZone: string,
): Date {
  const zone = isTimeZoneValid(timeZone) ? timeZone : "UTC";
  const [year, month, day] = dateStr.split("-").map(Number);
  const [hour, minute] = hhmm.split(":").map(Number);
  const guess = Date.UTC(year, month - 1, day, hour, minute);
  const offset = zoneOffsetMs(new Date(guess), zone);
  const instant = guess - offset;
  const adjustedOffset = zoneOffsetMs(new Date(instant), zone);
  return new Date(guess - adjustedOffset);
}

export function addDaysToISO(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}
