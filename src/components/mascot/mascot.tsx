import { cn } from "@/lib/utils";

export type MascotState = "chill" | "work" | "sleep" | "learn";

export const MASCOT_STATES: MascotState[] = ["chill", "work", "sleep", "learn"];

/**
 * Placeholder provisional de "Nomo" (ver `docs/visual-identity.md` §6).
 * Dibujo SVG con los rasgos canónicos; se reemplazará por el asset aprobado
 * sin cambiar la API del componente. Paleta del mundo en literales: es arte,
 * no UI (los tokens de mundo no viven en `globals.css` hasta su aprobación).
 */
const INK = "#2b2620";
const SCARF = "#3e6ae0";
const FUR = "#e6d2a4";
const FUR_DEEP = "#d8bf8a";
const SATCHEL = "#c07a55";
const GOLD = "#e0ad47";
const PAGE = "#f2ead6";

const MOTION: Record<MascotState, string> = {
  chill: "world-float",
  work: "world-sway",
  sleep: "world-sleep",
  learn: "world-sway",
};

export function Mascot({
  state = "chill",
  size = 160,
  className,
  title,
}: {
  state?: MascotState;
  size?: number;
  className?: string;
  title?: string;
}) {
  const sleeping = state === "sleep";
  const working = state === "work";
  const learning = state === "learn";

  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      role={title ? "img" : "presentation"}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={cn("shrink-0", MOTION[state], className)}
    >
      <ellipse cx="100" cy="184" rx="42" ry="8" fill={INK} opacity="0.12" />

      <g>
        {/* Cola */}
        <ellipse cx="150" cy="150" rx="16" ry="11" fill={FUR_DEEP} stroke={INK} strokeWidth="2" />

        {/* Patas */}
        <ellipse cx="78" cy="172" rx="11" ry="9" fill={FUR_DEEP} stroke={INK} strokeWidth="2" />
        <ellipse cx="122" cy="172" rx="11" ry="9" fill={FUR_DEEP} stroke={INK} strokeWidth="2" />

        {/* Cuerpo */}
        <ellipse cx="100" cy="126" rx="48" ry="50" fill={FUR} stroke={INK} strokeWidth="2.4" />

        {/* Zurrón */}
        <path d="M62 138 q-14 6 -10 22 q4 16 22 14 q10 -1 10 -14 q0 -14 -10 -22 z"
          fill={SATCHEL} stroke={INK} strokeWidth="2" />
        <path d="M62 138 q10 8 12 22" fill="none" stroke={INK} strokeWidth="2" opacity="0.5" />

        {/* Orejas */}
        <g>
          <ellipse cx="74" cy="72" rx="16" ry="21" fill={FUR} stroke={INK} strokeWidth="2.4" />
          <ellipse cx="74" cy="74" rx="8" ry="12" fill={FUR_DEEP} opacity="0.7" />
          <ellipse cx="126" cy="72" rx="16" ry="21" fill={FUR} stroke={INK} strokeWidth="2.4" />
          <ellipse cx="126" cy="74" rx="8" ry="12" fill={FUR_DEEP} opacity="0.7" />
        </g>

        {/* Mejillas */}
        <circle cx="76" cy="132" r="7" fill="#e7a58a" opacity="0.5" />
        <circle cx="124" cy="132" r="7" fill="#e7a58a" opacity="0.5" />

        {/* Ojos */}
        {sleeping ? (
          <>
            <path d="M78 120 q7 6 14 0" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
            <path d="M108 120 q7 6 14 0" fill="none" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
          </>
        ) : (
          <>
            <circle cx="85" cy="118" r="5.2" fill={INK} />
            <circle cx="115" cy="118" r="5.2" fill={INK} />
            <circle cx="86.8" cy="116" r="1.6" fill="#fff" />
            <circle cx="116.8" cy="116" r="1.6" fill="#fff" />
            {/* Gafas de lectura (modo estudio) */}
            {learning && (
              <g fill="none" stroke={INK} strokeWidth="1.8" opacity="0.85">
                <circle cx="85" cy="118" r="9.5" />
                <circle cx="115" cy="118" r="9.5" />
                <path d="M94.5 118 h11" />
              </g>
            )}
          </>
        )}

        {/* Hocico + boca */}
        <ellipse cx="100" cy="132" rx="7" ry="5" fill={FUR_DEEP} />
        <path d="M100 132 v4 M100 136 q-5 5 -9 1 M100 136 q5 5 9 1"
          fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />

        {/* Bufanda */}
        <path d="M60 152 q40 16 80 0 q-2 16 -40 16 q-38 0 -40 -16 z"
          fill={SCARF} stroke={INK} strokeWidth="2" />
        <path d="M128 158 q10 4 8 22 q-2 12 -14 10 q10 -12 6 -32 z"
          fill={SCARF} stroke={INK} strokeWidth="2" />

        {/* Modo trabajo: lápiz y mapa */}
        {working && (
          <>
            <g transform="rotate(24 120 150)">
              <rect x="112" y="146" width="6" height="34" rx="2" fill={GOLD} stroke={INK} strokeWidth="2" />
              <path d="M112 180 l3 8 l3 -8 z" fill={FUR_DEEP} stroke={INK} strokeWidth="2" />
            </g>
            <path d="M74 150 q16 -10 34 -2 q-6 14 -30 10 z"
              fill={PAGE} stroke={INK} strokeWidth="1.8" />
          </>
        )}

        {/* Modo estudio: libro abierto */}
        {learning && (
          <g>
            <path d="M64 148 q18 -12 36 0 q18 -12 36 0 q-2 16 -36 14 q-34 2 -36 -14 z"
              fill={PAGE} stroke={INK} strokeWidth="2" />
            <path d="M100 148 v11" fill="none" stroke={INK} strokeWidth="1.8" />
            <path d="M72 150 q12 -6 22 -1 M106 149 q10 -5 22 1"
              fill="none" stroke={INK} strokeWidth="1.4" opacity="0.6" />
          </g>
        )}
      </g>

      {/* Modo sueño: Zzz */}
      {sleeping && (
        <g fill="none" stroke={INK} strokeWidth="2.4" strokeLinecap="round" opacity="0.7">
          <path d="M150 70 h12 l-12 12 h12" />
          <path d="M166 50 h10 l-10 10 h10" />
        </g>
      )}
    </svg>
  );
}
