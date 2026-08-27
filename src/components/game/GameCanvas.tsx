import { lazy, Suspense, useEffect, useState } from "react";
import { Overlay } from "@/components/game/Overlay";
import { TouchControls } from "@/components/game/TouchControls";
import { applyMute, resetAudioCues, unlockAudio } from "@/game/audio";
import { resetCombat } from "@/game/combat";
import { installControlsTest } from "@/game/controlsTest";
import { resetFlyer } from "@/game/flyer";
import { resetMission } from "@/game/mission";
import { hydratePrefs, useGame } from "@/game/store";
import { rebuildTraffic } from "@/game/traffic";

const FlightCanvas = lazy(() => import("@/components/game/FlightCanvas"));

export function GameApp() {
  const [world, setWorld] = useState(false);
  const setPhase = useGame((s) => s.setPhase);
  const setPointerLocked = useGame((s) => s.setPointerLocked);
  const setLookHint = useGame((s) => s.setLookHint);

  useEffect(() => {
    hydratePrefs();
    installControlsTest();
    const s = useGame.getState();
    if (s.phase === "boot") s.setPhase("start");
    resetMission(s.mapId);
    rebuildTraffic();
    resetCombat();
    resetFlyer(s.planeId, s.mapId);

    const onLockChange = () => {
      const locked = Boolean(document.pointerLockElement);
      setPointerLocked(locked);
    };
    const onLockError = () => setLookHint("drag");
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("pointerlockerror", onLockError);

    const paint = requestAnimationFrame(() => setWorld(true));
    return () => {
      cancelAnimationFrame(paint);
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("pointerlockerror", onLockError);
    };
  }, [setLookHint, setPointerLocked, setPhase]);

  const sortie = () => {
    const s = useGame.getState();
    resetMission(s.mapId);
    rebuildTraffic();
    resetCombat();
    resetFlyer(s.planeId, s.mapId);
    resetAudioCues();
  };

  const lockPointer = () => {
    const canvas = document.querySelector("canvas");
    if (canvas && canvas.requestPointerLock) {
      const attempt = canvas.requestPointerLock();
      if (attempt && typeof (attempt as Promise<void>).catch === "function") {
        (attempt as Promise<void>).catch(() => setLookHint("drag"));
      }
    } else {
      setLookHint("drag");
    }
  };

  const onPlay = () => {
    unlockAudio();
    applyMute(useGame.getState().muted);
    const s = useGame.getState();
    if (s.phase === "start" || s.phase === "boot" || s.phase === "crashed") {
      sortie();
    }
    setPhase("play");
    lockPointer();
  };

  const onRestart = () => {
    unlockAudio();
    applyMute(useGame.getState().muted);
    sortie();
    setPhase("play");
    lockPointer();
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg">
      {world ? (
        <Suspense fallback={null}>
          <FlightCanvas />
        </Suspense>
      ) : null}
      <Overlay onPlay={onPlay} onRestart={onRestart} />
      {world ? <TouchControls /> : null}
    </main>
  );
}
