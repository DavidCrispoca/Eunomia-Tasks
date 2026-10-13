import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing, spring } from "remotion";
import { theme } from "../theme";
import { Sparkle } from "../fx";

export const XpGain: React.FC<{ xp?: number; coins?: number }> = ({ xp = 10, coins = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 160, stiffness: 140 } });
  const y = interpolate(frame, [0.2 * fps, 0.6 * fps], [20, 0], { extrapolateRight: "clamp", easing: Easing.bezier(...theme.ease) });
  const o = interpolate(frame, [0.2 * fps, 0.6 * fps], [0, 1], { extrapolateRight: "clamp" });
  const outO = interpolate(frame, [1.2 * fps, 1.6 * fps], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "transparent" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%,-50%) scale(${scale})`, opacity: outO }}>
        <div style={{ padding: "12px 28px", borderRadius: 999, border: `1px solid ${theme.brand}`, background: "rgba(62,106,224,0.25)", backdropFilter: "blur(4px)", display: "flex", gap: 12, alignItems: "center", transform: `translateY(${y}px)`, opacity: o }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: theme.white }}>+{xp} XP</div>
          {coins > 0 && <div style={{ fontSize: 22, color: theme.gold }}>+{coins} coins</div>}
        </div>
      </div>
      <Sparkle x={440} y={520} delay={8} />
      <Sparkle x={640} y={500} delay={16} />
    </AbsoluteFill>
  );
};
