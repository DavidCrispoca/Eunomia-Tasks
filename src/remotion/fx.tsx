import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing } from "remotion";
import { theme } from "./theme";

export const CheckRing: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = interpolate(frame, [0, 0.4 * fps], [0, 1], { extrapolateRight: "clamp", easing: Easing.bezier(...theme.ease) });
  const dash = 2 * Math.PI * 44;
  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <svg width="120" height="120" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="44" stroke={theme.border} strokeWidth="8" fill="none" />
        <circle cx="50" cy="50" r="44" stroke={theme.success} strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={dash} strokeDashoffset={dash * (1 - t)} transform="rotate(-90 50 50)" />
        <path d="M32 52 L44 64 L68 40" stroke={theme.white} strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={t} style={{ strokeDasharray: 60, strokeDashoffset: interpolate(frame, [0.25*fps, 0.5*fps], [60, 0], { extrapolateRight: "clamp" }) }} />
      </svg>
    </AbsoluteFill>
  );
};

export const Sparkle: React.FC<{ x: number; y: number; delay: number }> = ({ x, y, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - delay;
  if (f < 0) return null;
  const s = interpolate(f, [0, 0.25 * fps], [0, 1], { easing: Easing.bezier(...theme.ease) });
  const o = interpolate(f, [0.15 * fps, 0.35 * fps], [1, 0], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) scale(${s})`, opacity: o }}>
        <svg width="16" height="16" viewBox="0 0 24 24">
          <path d="M12 2 L14 8 L20 8 L15 12 L17 18 L12 14 L7 18 L9 12 L4 8 L10 8 Z" fill={theme.gold} />
        </svg>
      </div>
    </AbsoluteFill>
  );
};

export const ConfettiBurst: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / (0.6 * fps);
  if (t > 1) return null;
  const pieces = Array.from({ length: 16 }).map((_, i) => {
    const angle = (i / 16) * Math.PI * 2;
    const dist = 60 + i * 4;
    const x = 540 + Math.cos(angle) * dist * t;
    const y = 540 + Math.sin(angle) * dist * t + 20 * t * t;
    const rot = t * 360 * (i % 2 ? 1 : -1);
    const color = i % 3 === 0 ? theme.brand : i % 3 === 1 ? theme.gold : theme.success;
    return (
      <div key={i} style={{ position: "absolute", left: x, top: y, transform: `translate(-50%,-50%) rotate(${rot}deg)`, opacity: 1 - t }}>
        <div style={{ width: 8, height: 12, background: color, borderRadius: 2 }} />
      </div>
    );
  });
  return <AbsoluteFill>{pieces}</AbsoluteFill>;
};
