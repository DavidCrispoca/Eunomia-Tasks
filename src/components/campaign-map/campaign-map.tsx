"use client";

import type { ReactNode } from "react";
import { Lock } from "lucide-react";
import { useLanguage } from "@/lib/i18n";
import { useGamification } from "@/providers/gamification-provider";
import { Mascot } from "@/components/mascot/mascot";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const SEA = "#7fb0c8";
const SEA_DEEP = "#4d86a4";
const LAND = "#c9dfbf";
const LAND_DEEP = "#8fbf8c";
const SAND = "#e6d2a4";
const CLAY = "#c07a55";
const GOLD = "#e0ad47";
const INK = "#2b2620";
const PAPER = "#f2ead6";
const GHOST_LAND = "#c3cdd1";
const GHOST_EDGE = "#aebbc0";

type IslandVariant = "coast" | "forest" | "ghost";

function Tree({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M0 0 v-6" stroke={CLAY} strokeWidth="3" strokeLinecap="round" />
      <path d="M-11 -6 L0 -30 L11 -6 Z" fill={LAND_DEEP} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M-8 -14 L0 -32 L8 -14 Z" fill={LAND} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
    </g>
  );
}

function IslandArt({
  variant,
  className,
}: {
  variant: IslandVariant;
  className?: string;
}) {
  const ghost = variant === "ghost";
  const forest = variant === "forest";
  const land = ghost ? GHOST_LAND : forest ? LAND_DEEP : LAND;
  const landEdge = ghost ? GHOST_EDGE : forest ? "#6fa977" : LAND_DEEP;
  const beach = ghost ? GHOST_EDGE : SAND;
  const opacity = ghost ? 0.9 : 1;

  return (
    <svg
      viewBox="0 0 220 160"
      className={cn("w-full", className)}
      opacity={opacity}
      aria-hidden
    >
      <ellipse cx="110" cy="142" rx="84" ry="13" fill={INK} opacity={ghost ? 0.1 : 0.14} />

      {/* Costa de arena */}
      <path
        d="M34 108 C 20 90, 30 72, 58 68 C 74 48, 108 46, 128 64 C 160 58, 188 74, 192 98 C 202 116, 184 134, 154 138 C 116 146, 72 146, 50 138 C 36 132, 42 122, 34 108 Z"
        fill={beach} stroke={INK} strokeWidth="2.4" strokeLinejoin="round"
      />
      {/* Interior de tierra */}
      <path
        d="M48 106 C 38 92, 48 80, 68 76 C 82 62, 108 60, 122 74 C 146 70, 168 82, 170 100 C 178 112, 164 124, 142 128 C 112 134, 78 134, 60 128 C 50 124, 52 116, 48 106 Z"
        fill={land} stroke={INK} strokeWidth="2.2" strokeLinejoin="round"
      />
      {/* Sombra interior de ladera */}
      <path
        d="M60 122 C 84 130, 122 130, 146 120 C 130 128, 96 132, 68 128 Z"
        fill={landEdge} opacity="0.5"
      />

      {!ghost && !forest && (
        <>
          {/* Faro */}
          <g>
            <rect x="58" y="58" width="16" height="34" rx="3" fill={PAPER} stroke={INK} strokeWidth="2.2" />
            <path d="M56 58 h20 l-5 -11 h-10 z" fill={CLAY} stroke={INK} strokeWidth="2.2" strokeLinejoin="round" />
            <circle cx="66" cy="42" r="3.6" fill={GOLD} stroke={INK} strokeWidth="2" />
          </g>
          {/* Palmeras */}
          <g stroke={INK} strokeWidth="2" strokeLinecap="round">
            <path d="M150 96 q-2 -16 2 -26" fill="none" />
            <path d="M152 70 q-12 -6 -20 -2 q10 -1 18 4" fill={LAND_DEEP} strokeWidth="1.6" />
            <path d="M152 70 q12 -7 20 -3 q-11 -1 -19 5" fill={LAND_DEEP} strokeWidth="1.6" />
            <path d="M152 70 q-4 -12 2 -18 q2 10 1 18" fill={LAND_DEEP} strokeWidth="1.6" />
          </g>
          <g stroke={INK} strokeWidth="2" strokeLinecap="round">
            <path d="M170 104 q-1 -12 2 -19" fill="none" />
            <path d="M172 86 q-9 -4 -15 -1 q8 -1 14 3" fill={LAND_DEEP} strokeWidth="1.5" />
            <path d="M172 86 q9 -5 15 -2 q-8 -1 -14 4" fill={LAND_DEEP} strokeWidth="1.5" />
          </g>
          {/* Rocas en la orilla */}
          <ellipse cx="44" cy="120" rx="7" ry="4.5" fill={GHOST_EDGE} stroke={INK} strokeWidth="1.8" />
          <ellipse cx="176" cy="116" rx="6" ry="4" fill={GHOST_EDGE} stroke={INK} strokeWidth="1.8" />
        </>
      )}

      {!ghost && forest && (
        <>
          {/* Colinas de fondo */}
          <path d="M74 84 q22 -22 44 0 z" fill={landEdge} opacity="0.55" />
          <path d="M110 88 q20 -20 40 0 z" fill={landEdge} opacity="0.4" />
          {/* Bosque */}
          <Tree x={92} y={104} s={1.05} />
          <Tree x={116} y={108} s={0.9} />
          <Tree x={138} y={102} s={1} />
        </>
      )}

      {ghost && (
        <path
          d="M112 60 q16 -14 30 -2 q-2 14 -16 14 q-16 2 -14 -12 z"
          fill={GHOST_LAND} stroke={INK} strokeWidth="1.6" opacity="0.6"
        />
      )}
    </svg>
  );
}

function IslandNode({
  variant,
  name,
  status,
  cost,
  locked,
  mascot,
  action,
  className,
}: {
  variant: IslandVariant;
  name: string;
  status: string;
  cost?: number;
  locked?: boolean;
  mascot?: boolean;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex w-[150px] flex-col items-center gap-1 sm:w-[190px]", className)}>
      <div className={cn("relative w-full", locked ? "opacity-95" : "")}>
        {mascot && (
          <div className="absolute -top-10 left-1/2 -translate-x-1/2">
            <Mascot state="chill" size={58} />
          </div>
        )}
        <IslandArt variant={variant} />
        {locked && (
          <span className="absolute right-2 top-1 grid h-7 w-7 place-items-center rounded-full bg-[#2b2620]/85 text-[#f2ead6] ring-1 ring-white/20">
            <Lock size={13} />
          </span>
        )}
      </div>
      <div className="surface-raised flex w-full flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-center">
        <span className="text-[13px] font-semibold text-foreground">{name}</span>
        <span className={cn("text-[11px]", locked ? "text-muted" : "text-emerald-400")}>
          {status}
        </span>
        {typeof cost === "number" && locked && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[11px] font-medium text-gold">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-gold" aria-hidden />
            <span className="text-tabular">{cost}</span>
          </span>
        )}
      </div>
      {action}
    </div>
  );
}

export function CampaignMap() {
  const { t } = useLanguage();
  const { snapshot, world, worldLoaded, unlockingIsland, unlockIsland } =
    useGamification();

  const forest = world?.islands.find((island) => island.code === "forest") ?? null;
  const coast = world?.islands.find((island) => island.code === "coast") ?? null;
  const forestUnlocked = forest?.unlocked ?? false;
  const forestBusy = unlockingIsland === "forest";
  const forestCost = forest?.costCoins ?? 120;
  const hasWorld = worldLoaded && world !== null;

  const forestPurchase =
    hasWorld && !forestUnlocked ? (
      <div className="flex w-full flex-col items-center gap-1">
        <Button
          size="sm"
          variant="primary"
          className="w-full justify-center px-2 text-[12px]"
          onClick={() => void unlockIsland("forest")}
          disabled={forestBusy || snapshot.coins < forestCost}
        >
          {forestBusy ? (
            t.world.unlockingLabel
          ) : (
            <>
              {t.world.unlockButton}
              <span className="inline-flex items-center gap-1">
                <span className="inline-block h-2.5 w-2.5 rounded-full bg-white/80" aria-hidden />
                <span className="text-tabular">{forestCost}</span>
              </span>
            </>
          )}
        </Button>
        {!forestBusy && snapshot.coins < forestCost && (
          <span className="text-center text-[11px] text-muted">
            {t.world.insufficientBalance(forestCost - snapshot.coins)}
          </span>
        )}
      </div>
    ) : null;

  return (
    <div
      className="relative overflow-hidden rounded-xl border border-border"
      style={{ background: SEA }}
    >
      {/* Capa fondo: corrientes + viñeta de papel */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 800 460"
          preserveAspectRatio="none"
        >
          <path d="M40 120 q60 -34 140 -18" fill="none" stroke={SEA_DEEP} strokeWidth="3" strokeLinecap="round" opacity="0.45" />
          <path d="M600 60 q70 -22 150 -6" fill="none" stroke={SEA_DEEP} strokeWidth="3" strokeLinecap="round" opacity="0.35" />
          <path d="M60 400 q80 -28 170 -14" fill="none" stroke={SEA_DEEP} strokeWidth="3" strokeLinecap="round" opacity="0.35" />
          <path d="M620 400 q70 -26 150 -12" fill="none" stroke={SEA_DEEP} strokeWidth="3" strokeLinecap="round" opacity="0.3" />
        </svg>
        <div
          className="absolute inset-0"
          style={{ background: "radial-gradient(125% 95% at 50% 32%, transparent 46%, rgba(43,38,32,0.20) 100%)" }}
        />
      </div>

      {/* Barra superior */}
      <div className="relative z-10 flex items-start justify-between gap-2 p-3 sm:p-4">
        <span className="chip rounded-full px-3 py-1 text-[11px] font-medium text-muted">
          {t.world.biomeCoast}
        </span>
        <span className="chip inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-gold">
          <span className="inline-block h-3 w-3 rounded-full bg-gold" aria-hidden />
          <span className="text-tabular">{snapshot.coins}</span>
          <span className="text-muted">{t.world.coins}</span>
        </span>
      </div>

      {/* Área del mapa */}
      <div className="relative h-[320px] sm:h-[400px]">
        {/* Capa rutas + puente */}
        <svg
          className="pointer-events-none absolute inset-0 h-full w-full"
          viewBox="0 0 800 460"
          preserveAspectRatio="none"
          aria-hidden
        >
          {/* Tramo abierto: costa -> puente (dorado punteado) */}
          <path
            d="M150 336 C 230 306, 300 300, 366 258"
            fill="none" stroke={GOLD} strokeWidth="5" strokeLinecap="round"
            strokeDasharray="1 14" vectorEffect="non-scaling-stroke"
          />
          {/* Tramo al bosque: fantasma hasta que se desbloquea */}
          <path
            d="M412 232 C 470 196, 540 168, 650 118"
            fill="none"
            stroke={forestUnlocked ? GOLD : INK}
            strokeWidth={forestUnlocked ? 5 : 4}
            strokeLinecap="round"
            strokeDasharray="1 14"
            opacity={forestUnlocked ? 1 : 0.4}
            vectorEffect="non-scaling-stroke"
          />

          {/* Puente colgante de cuerda */}
          <g transform="translate(389 245) rotate(-25)">
            {/* tablones */}
            {[-26, -18, -10, -2, 6, 14, 22].map((x) => (
              <line key={x} x1={x} y1={-7} x2={x} y2={7} stroke={CLAY} strokeWidth="4" strokeLinecap="round" />
            ))}
            {/* largueros */}
            <line x1="-30" y1="0" x2="30" y2="0" stroke={INK} strokeWidth="2" opacity="0.7" />
            {/* barandas con caída */}
            <path d="M-30 -14 Q0 -22 30 -14" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
            <path d="M-30 14 Q0 22 30 14" fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" />
            {/* postes */}
            <line x1="-30" y1="-16" x2="-30" y2="16" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            <line x1="30" y1="-16" x2="30" y2="16" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          </g>
        </svg>

        {/* Nodo costa (disponible) con la mascota */}
        <div className="absolute" style={{ left: "16%", top: "74%", transform: "translate(-50%, -62%)" }}>
          <IslandNode
            variant="coast"
            name={t.world.islandCoast}
            status={hasWorld && coast?.unlocked ? t.world.statusUnlocked : t.world.statusAvailable}
            mascot
          />
        </div>

        {/* Nodo bosque (desbloqueable) */}
        <div className="absolute" style={{ left: "82%", top: "24%", transform: "translate(-50%, -62%)" }}>
          {hasWorld ? (
            <IslandNode
              variant={forestUnlocked ? "forest" : "ghost"}
              name={forest?.nameEs ?? t.world.islandForest}
              status={forestUnlocked ? t.world.statusUnlocked : t.world.statusLocked}
              cost={forestCost}
              locked={!forestUnlocked}
              action={forestPurchase}
            />
          ) : (
            <IslandNode
              variant="ghost"
              name={t.world.islandForest}
              status={t.world.statusLocked}
              cost={forestCost}
              locked
            />
          )}
        </div>
      </div>

      {/* Pie */}
      <div className="relative z-10 flex items-center justify-center p-3">
        <span className="chip rounded-full px-3 py-1 text-[11px] text-muted">
          <span className="text-gold">◆</span> {t.world.pathHint}
        </span>
      </div>
    </div>
  );
}
