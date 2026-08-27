import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { Overlay } from "@/components/game/Overlay";
import { TouchControls } from "@/components/game/TouchControls";
import { resetCombat } from "@/game/combat";
import { installControlsTest } from "@/game/controlsTest";
import { resetFlyer } from "@/game/flyer";
import { resetMission } from "@/game/mission";
import { hydratePrefs, useGame } from "@/game/store";
import { rebuildTraffic } from "@/game/traffic";

const flightMod = import("@/components/game/FlightCanvas");
const FlightCanvas = lazy(() => flightMod);

export function GameApp() {
  const [client, setClient] = useState(false);
  const setPhase = useGame((s) => s.setPhase);
  const setPointerLocked = useGame((s) => s.setPointerLocked);
  const setLookHint = useGame((s) => s.setLookHint);
  const opened = useRef(false);

  const openHangar = () => {
    if (opened.current) return;
    opened.current = true;
    if (useGame.getState().phase === "boot") setPhase("start");
  };

  useEffect(() => {
    hydratePrefs();
    installControlsTest();
    const s = useGame.getState();
    resetMission(s.mapId);
    rebuildTraffic();
    resetCombat();
    resetFlyer(s.planeId, s.mapId);
    setClient(true);

    const failsafe = window.setTimeout(openHangar, 4500);

    const onLockChange = () => {
      const locked = Boolean(document.pointerLockElement);
      setPointerLocked(locked);
    };
    const onLockError = () => setLookHint("drag");
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("pointerlockerror", onLockError);
    return () => {
      window.clearTimeout(failsafe);
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
    const s = useGame.getState();
    if (s.phase === "start" || s.phase === "boot" || s.phase === "crashed") {
      sortie();
    }
    setPhase("play");
    lockPointer();
  };

  const onRestart = () => {
    sortie();
    setPhase("play");
    lockPointer();
  };

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg">
      {client ? (
        <Suspense fallback={null}>
          <FlightCanvas onReady={openHangar} />
        </Suspense>
      ) : null}
      <Overlay onPlay={onPlay} onRestart={onRestart} />
      {client ? <TouchControls /> : null}
    </main>
  );
}
