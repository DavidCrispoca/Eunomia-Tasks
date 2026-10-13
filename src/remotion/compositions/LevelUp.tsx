import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing, spring } from "remotion";
import { theme } from "../theme";
import { Sparkle } from "../fx";

export const LevelUp: React.FC<{ level?: number }> = ({ level = 2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 180, stiffness: 130 } });
  const y = interpolate(frame, [0.25 * fps, 0.7 * fps], [24, 0], { extrapolateRight: "clamp", easing: Easing.bezier(...theme.ease) });
  const o = interpolate(frame, [0.25 * fps, 0.7 * fps], [0, 1], { extrapolateRight: "clamp" });
  const outO = interpolate(frame, [1.6 * fps, 2.0 * fps], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "transparent" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%,-50%) scale(${scale})`, opacity: outO }}>
        <div style={{ textAlign: "center", transform: `translateY(${y}px)`, opacity: o }}>
          <div style={{ fontSize: 20, letterSpacing: 6, textTransform: "uppercase", color: theme.textSecondary }}>Subes de nivel</div>
          <div style={{ fontSize: 72, fontWeight: 800, color: theme.brand, marginTop: 4 }}>Nivel {level}</div>
        </div>
      </div>
      <Sparkle x={400} y={500} delay={10} />
      <Sparkle x={680} y={480} delay={20} />
    </AbsoluteFill>
  );
};
