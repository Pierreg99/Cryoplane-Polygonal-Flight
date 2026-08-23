import { lazy, Suspense, useEffect, useState } from "react";
import { Overlay } from "@/components/game/Overlay";
import { TouchControls } from "@/components/game/TouchControls";
import { installControlsTest } from "@/game/controlsTest";
import { resetFlyer } from "@/game/flyer";
import { hydratePrefs, useGame } from "@/game/store";

const FlightCanvas = lazy(() => import("@/components/game/FlightCanvas"));

export function GameApp() {
  const [ready, setReady] = useState(false);
  const setPhase = useGame((s) => s.setPhase);
  const setPointerLocked = useGame((s) => s.setPointerLocked);
  const setLookHint = useGame((s) => s.setLookHint);

  useEffect(() => {
    hydratePrefs();
    installControlsTest();
    setReady(true);

    const onLockChange = () => {
      const locked = Boolean(document.pointerLockElement);
      setPointerLocked(locked);
    };
    const onLockError = () => setLookHint("drag");
    document.addEventListener("pointerlockchange", onLockChange);
    document.addEventListener("pointerlockerror", onLockError);
    return () => {
      document.removeEventListener("pointerlockchange", onLockChange);
      document.removeEventListener("pointerlockerror", onLockError);
    };
  }, [setLookHint, setPointerLocked]);

  const onPlay = () => {
    if (useGame.getState().phase === "start") resetFlyer();
    setPhase("play");
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

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-bg">
      {ready ? (
        <Suspense fallback={<div className="absolute inset-0 bg-bg" />}>
          <FlightCanvas />
        </Suspense>
      ) : null}
      <Overlay onPlay={onPlay} />
      {ready ? <TouchControls /> : null}
    </main>
  );
}
