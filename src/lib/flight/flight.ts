import type { Airport, FlightInfo } from "./types";
import airportsData from "./airports.json";

const CRUISE_SPEED_KMH = 850;
const BUFFER_MIN = 10;
export const TOLERANCE_MIN = 20;
export const TOP_RECOMMENDATIONS = 5;

export const AIRPORTS = airportsData as Airport[];

export function findAirportByIata(iata: string): Airport | undefined {
  return AIRPORTS.find((a) => a.iata === iata);
}

/**
 * Distancia en km entre dos aeropuertos (fórmula de Haversine).
 */
export function haversine(a: Airport, b: Airport): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

/**
 * Tiempo de vuelo estimado en minutos: distancia / velocidad + buffer.
 * Fórmula del proyecto PomodoroFlight.
 */
export function calcFlightDurationKm(distKm: number): number {
  const hours = distKm / CRUISE_SPEED_KMH;
  return Math.round(hours * 60) + BUFFER_MIN;
}

export function buildFlightInfo(
  origin: Airport,
  destination: Airport,
): FlightInfo {
  const distanceKm = haversine(origin, destination);
  const durationMin = calcFlightDurationKm(distanceKm);
  return { origin, destination, distanceKm, durationMin };
}

/**
 * Top de rutas reales cuya duración cae dentro de la tolerancia (±20 min)
 * del tiempo deseado. Portado de PomodoroFlight (FlightContext).
 */
export function buildRecommendations(
  desiredMinutes: number,
): FlightInfo[] {
  const recs: FlightInfo[] = [];
  for (let i = 0; i < AIRPORTS.length; i++) {
    for (let j = 0; j < AIRPORTS.length; j++) {
      if (i === j) continue;
      const info = buildFlightInfo(AIRPORTS[i], AIRPORTS[j]);
      if (Math.abs(info.durationMin - desiredMinutes) <= TOLERANCE_MIN) {
        recs.push(info);
      }
    }
  }
  recs.sort(
    (a, b) =>
      Math.abs(a.durationMin - desiredMinutes) -
      Math.abs(b.durationMin - desiredMinutes),
  );
  return recs.slice(0, TOP_RECOMMENDATIONS);
}

/** Etiqueta legible de una ruta: "BOG · MAD" */
export function routeLabel(info: FlightInfo): string {
  return `${info.origin.iata} · ${info.destination.iata}`;
}

/** "4h 22m" para vuelos, "52m" para los cortos. */
export function formatFlightDuration(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "0m";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}