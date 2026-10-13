import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Easing, spring } from "remotion";
import { theme } from "../theme";
import { CheckRing, Sparkle, ConfettiBurst } from "../fx";

export const PomodoroSuccess: React.FC<{ taskTitle?: string; minutes?: number }> = ({ taskTitle = "Tarea", minutes = 25 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const scale = spring({ frame, fps, config: { damping: 200, stiffness: 120 } });
  const titleY = interpolate(frame, [0.6 * fps, 0.9 * fps], [40, 0], { extrapolateRight: "clamp", easing: Easing.bezier(...theme.ease) });
  const titleO = interpolate(frame, [0.6 * fps, 0.9 * fps], [0, 1], { extrapolateRight: "clamp" });
  const subY = interpolate(frame, [0.8 * fps, 1.1 * fps], [30, 0], { extrapolateRight: "clamp", easing: Easing.bezier(...theme.ease) });
  const subO = interpolate(frame, [0.8 * fps, 1.1 * fps], [0, 1], { extrapolateRight: "clamp" });
  const doneY = interpolate(frame, [1.0 * fps, 1.3 * fps], [25, 0], { extrapolateRight: "clamp", easing: Easing.bezier(...theme.ease) });
  const doneO = interpolate(frame, [1.0 * fps, 1.3 * fps], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, #0f1320 0%, #05070D 70%)" }}>
      <div style={{ position: "absolute", left: "50%", top: "46%", transform: `translate(-50%,-50%) scale(${scale})` }}>
        <CheckRing />
      </div>
      <ConfettiBurst />
      <Sparkle x={380} y={480} delay={20} />
      <Sparkle x={700} y={520} delay={30} />
      <Sparkle x={580} y={400} delay={40} />
      <Sparkle x={500} y={600} delay={50} />
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 220 }}>
        <div style={{ textAlign: "center", transform: `translateY(${titleY}px)`, opacity: titleO }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: theme.textPrimary, letterSpacing: -1 }}>{taskTitle}</div>
        </div>
        <div style={{ textAlign: "center", marginTop: 16, transform: `translateY(${subY}px)`, opacity: subO }}>
          <div style={{ fontSize: 22, color: theme.textSecondary }}>Pomodoro completado · {minutes} min</div>
        </div>
        <div style={{ textAlign: "center", marginTop: 16, transform: `translateY(${doneY}px)`, opacity: doneO }}>
          <div style={{ fontSize: 26, fontWeight: 700, color: theme.success, letterSpacing: 2, textTransform: "uppercase" }}>¡Bien hecho!</div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
