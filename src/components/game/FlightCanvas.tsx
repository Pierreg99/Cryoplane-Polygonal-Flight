import { Canvas } from "@react-three/fiber";
import * as THREE from "three";
import { World } from "@/components/game/World";
import { useGame } from "@/game/store";

export default function FlightCanvas() {
  const playing = useGame((s) => s.phase === "play");
  return (
    <Canvas
      camera={{ fov: 62, near: 0.15, far: 1900, position: [28, 72, 228] }}
      dpr={[1, 1.6]}
      style={{ pointerEvents: playing ? "auto" : "none" }}
      gl={{ antialias: true, powerPreference: "high-performance", toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.22 }}
      onCreated={({ gl }) => {
        gl.outputColorSpace = THREE.SRGBColorSpace;
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.18;
        gl.domElement.addEventListener("webglcontextlost", (e) => e.preventDefault());
      }}
      onPointerDown={(e) => {
        if (useGame.getState().phase !== "play") return;
        const el = e.target as HTMLElement;
        if (!el.requestPointerLock) return;
        if (document.pointerLockElement === el) return;
        const attempt = el.requestPointerLock();
        if (attempt && typeof (attempt as Promise<void>).catch === "function") {
          (attempt as Promise<void>).catch(() => useGame.getState().setLookHint("drag"));
        }
      }}
    >
      <World />
    </Canvas>
  );
}
