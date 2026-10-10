export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
}

export interface FlightInfo {
  origin: Airport;
  destination: Airport;
  distanceKm: number;
  durationMin: number;
}

export type AmbienceType =
  | "none"
  | "storm"
  | "rain"
  | "forest-night"
  | "cabin"
  | "coffee"
  | "lofi"
  | "fireplace"
  | "white"
  | "brown";

export type FlightMode = "simple" | "flight";
export type FlightPick = "minutes" | "route";