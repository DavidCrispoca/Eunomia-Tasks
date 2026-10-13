import { Composition } from "remotion";
import { PomodoroSuccess } from "./compositions/PomodoroSuccess";
import { XpGain } from "./compositions/XpGain";
import { LevelUp } from "./compositions/LevelUp";
import { IslandUnlock } from "./compositions/IslandUnlock";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="pomodoro-success"
        component={PomodoroSuccess}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ taskTitle: "Tarea de ejemplo", minutes: 25 }}
      />
      <Composition
        id="xp-gain"
        component={XpGain}
        durationInFrames={120}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ xp: 10, coins: 0 }}
      />
      <Composition
        id="level-up"
        component={LevelUp}
        durationInFrames={150}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ level: 2 }}
      />
      <Composition
        id="island-unlock"
        component={IslandUnlock}
        durationInFrames={180}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={{ island: "Nueva isla" }}
      />
    </>
  );
};
