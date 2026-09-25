"use client";

import { useMemo, useState } from "react";
import { Compass, Plane } from "lucide-react";
import {
  AIRPORTS,
  buildFlightInfo,
  buildRecommendations,
  formatFlightDuration,
  routeLabel,
} from "@/lib/flight/flight";
import type { FlightInfo, FlightPick } from "@/lib/flight/types";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";

interface FlightControlsProps {
  disabled?: boolean;
  onStart: (durationMin: number, route: string) => void;
}

function formatKm(km: number): string {
  return `${Math.round(km).toLocaleString("es-CO")} km`;
}

export function FlightControls({ disabled, onStart }: FlightControlsProps) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<FlightPick>("minutes");
  const [desired, setDesired] = useState(30);
  const [selected, setSelected] = useState<FlightInfo | null>(null);
  const [originIata, setOriginIata] = useState("");
  const [destIata, setDestIata] = useState("");

  const recommendations = useMemo(
    () => buildRecommendations(desired),
    [desired],
  );

  const routeInfo = useMemo(() => {
    if (!originIata || !destIata) return null;
    const origin = AIRPORTS.find((a) => a.iata === originIata);
    const destination = AIRPORTS.find((a) => a.iata === destIata);
    if (!origin || !destination || origin.iata === destination.iata) return null;
    return buildFlightInfo(origin, destination);
  }, [originIata, destIata]);

  const flight = mode === "route" ? routeInfo : selected;
  const valid = flight !== null;
  const ongoing = disabled;

  function start() {
    if (!flight) return;
    onStart(flight.durationMin, routeLabel(flight));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <Plane size={13} className="text-amber-300" />
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
          {t.pomodoro.flight}
        </span>
        <div className="ml-auto flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.03] p-0.5">
          {(["minutes", "route"] as const).map((pick) => (
            <button
              key={pick}
              type="button"
              disabled={ongoing}
              onClick={() => setMode(pick)}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-medium transition-all duration-200 ease-out-expo",
                mode === pick
                  ? "bg-amber-500/15 text-amber-200"
                  : "text-muted hover:text-foreground",
              )}
            >
              {pick === "minutes" ? t.pomodoro.byMinutes : t.pomodoro.byRoute}
            </button>
          ))}
        </div>
      </div>

      {mode === "minutes" ? (
        <div className="flex flex-col gap-2.5">
          <label className="flex items-center gap-2 text-[12.5px] text-muted">
            {t.pomodoro.desiredMinutes}
            <Input
              type="number"
              min={10}
              max={900}
              value={desired}
              disabled={ongoing}
              onChange={(e) => {
                const value = Math.max(1, Number(e.target.value) || 1);
                setDesired(value);
                setSelected((prev) =>
                  prev && Math.abs(prev.durationMin - value) <= 20
                    ? prev
                    : null,
                );
              }}
              className="w-20 text-center font-mono"
            />
            <span className="font-mono text-[10.5px] text-muted">min</span>
          </label>

          <p className="text-[10.5px] uppercase tracking-wider text-muted/70">
            {t.pomodoro.routeSuggestions}
          </p>
          {recommendations.length === 0 ? (
            <p className="rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2.5 text-[12px] text-muted">
              {t.pomodoro.noRoutes}
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {recommendations.map((rec) => {
                const active = selected?.origin.iata === rec.origin.iata &&
                  selected?.destination.iata === rec.destination.iata;
                return (
                  <li key={`${rec.origin.iata}-${rec.destination.iata}`}>
                    <button
                      type="button"
                      disabled={ongoing}
                      onClick={() => setSelected(rec)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-all duration-200 ease-out-expo",
                        active
                          ? "border-amber-500/40 bg-amber-500/10 shadow-[0_0_14px_rgba(245,158,11,0.12)]"
                          : "border-white/10 bg-white/[0.02] hover:border-amber-500/25 hover:bg-white/[0.04]",
                      )}
                    >
                      <Compass
                        size={14}
                        className={active ? "text-amber-300" : "text-muted"}
                      />
                      <span className="font-mono text-[13px] font-semibold text-amber-100">
                        {routeLabel(rec)}
                      </span>
                      <span className="ml-auto flex items-center gap-2 font-mono text-[11px] text-muted">
                        <span>{formatKm(rec.distanceKm)}</span>
                        <span className="text-amber-200">
                          {formatFlightDuration(rec.durationMin)}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2.5">
          <label className="flex flex-col gap-1 text-[12.5px] text-muted">
            {t.pomodoro.origin}
            <Select
              value={originIata}
              disabled={ongoing}
              onChange={(e) => {
                setOriginIata(e.target.value);
                if (e.target.value === destIata) setDestIata("");
              }}
            >
              <option value="">{t.pomodoro.selectAirport}</option>
              {AIRPORTS.map((a) => (
                <option key={a.iata} value={a.iata}>
                  {a.iata} · {a.city} ({a.country})
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-1 text-[12.5px] text-muted">
            {t.pomodoro.destination}
            <Select
              value={destIata}
              disabled={ongoing}
              onChange={(e) => {
                setDestIata(e.target.value);
                if (e.target.value === originIata) setOriginIata("");
              }}
            >
              <option value="">{t.pomodoro.selectAirport}</option>
              {AIRPORTS.map((a) => (
                <option key={a.iata} value={a.iata}>
                  {a.iata} · {a.city} ({a.country})
                </option>
              ))}
            </Select>
          </label>

          <div className="flex items-center justify-between rounded-lg border border-amber-500/20 bg-amber-500/[0.05] px-3 py-2.5">
            <span className="flex items-center gap-1.5 text-[12px] text-amber-200/90">
              <Compass size={13} />
              {t.pomodoro.flightDuration}
            </span>
            <span className="font-mono text-[13px] font-semibold text-amber-200">
              {flight ? formatFlightDuration(flight.durationMin) : "——"}
            </span>
          </div>
        </div>
      )}

      <Button
        variant="primary"
        size="sm"
        disabled={!valid || ongoing}
        onClick={start}
        className="w-full justify-center disabled:cursor-not-allowed"
      >
        <Plane size={14} />
        {t.pomodoro.startFlight}
      </Button>
    </div>
  );
}