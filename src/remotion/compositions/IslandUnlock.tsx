import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing, spring } from "remotion";
import { theme } from "../theme";
import { Sparkle } from "../fx";

export const IslandUnlock: React.FC<{ island?: string }> = ({ island = "Nueva isla" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 170, stiffness: 130 } });
  const y = interpolate(frame, [0.3 * fps, 0.8 * fps], [28, 0], { extrapolateRight: "clamp", easing: Easing.bezier(...theme.ease) });
  const o = interpolate(frame, [0.3 * fps, 0.8 * fps], [0, 1], { extrapolateRight: "clamp" });
  const outO = interpolate(frame, [1.8 * fps, 2.2 * fps], [1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "transparent" }}>
      <div style={{ position: "absolute", left: "50%", top: "50%", transform: `translate(-50%,-50%) scale(${scale})`, opacity: outO }}>
        <div style={{ textAlign: "center", transform: `translateY(${y}px)`, opacity: o }}>
          <div style={{ fontSize: 18, letterSpacing: 6, textTransform: "uppercase", color: theme.gold }}>Desbloqueado</div>
          <div style={{ fontSize: 56, fontWeight: 800, color: theme.white, marginTop: 4 }}>{island}</div>
        </div>
      </div>
      <Sparkle x={380} y={520} delay={12} />
      <Sparkle x={700} y={500} delay={24} />
      <Sparkle x={540} y={440} delay={36} />
    </AbsoluteFill>
  );
};
