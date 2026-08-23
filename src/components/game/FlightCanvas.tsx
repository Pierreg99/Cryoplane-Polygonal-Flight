import { Canvas } from "@react-three/fiber";
import { World } from "@/components/game/World";
import { useGame } from "@/game/store";

export default function FlightCanvas() {
  const playing = useGame((s) => s.phase === "play");
  return (
    <Canvas
      camera={{ fov: 68, near: 0.15, far: 1800, position: [28, 56, 224] }}
      dpr={[1, 1.75]}
      style={{ pointerEvents: playing ? "auto" : "none" }}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      onCreated={({ gl }) => {
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
