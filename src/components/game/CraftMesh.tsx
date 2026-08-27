import type { Ref } from "react";
import * as THREE from "three";
import { PLANES, type PlaneId } from "@/game/catalog";

export function CraftMesh({
  planeId,
  trailRef,
}: {
  planeId: PlaneId;
  trailRef?: Ref<THREE.Mesh>;
}) {
  const p = PLANES[planeId];
  if (planeId === "hauler") return <Hauler c={p.colors} trailRef={trailRef} />;
  if (planeId === "glider") return <Glider c={p.colors} trailRef={trailRef} />;
  if (planeId === "borealis") return <Borealis c={p.colors} trailRef={trailRef} />;
  if (planeId === "hopper") return <Hopper c={p.colors} trailRef={trailRef} />;
  return <Dart c={p.colors} trailRef={trailRef} />;
}

type Col = { body: number; wing: number; accent: number };

function Dart({ c, trailRef }: { c: Col; trailRef?: Ref<THREE.Mesh> }) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.15]}>
        <coneGeometry args={[0.32, 2.4, 6]} />
        <meshLambertMaterial color={c.body} flatShading />
      </mesh>
      <mesh position={[0, 0, -0.55]}>
        <boxGeometry args={[0.48, 0.24, 1.2]} />
        <meshLambertMaterial color={c.accent} flatShading />
      </mesh>
      <mesh position={[0, -0.02, -0.05]}>
        <boxGeometry args={[3.8, 0.07, 0.55]} />
        <meshLambertMaterial color={c.wing} flatShading />
      </mesh>
      <mesh position={[0, 0.08, -1.15]}>
        <boxGeometry args={[1.4, 0.05, 0.32]} />
        <meshLambertMaterial color={c.body} flatShading />
      </mesh>
      <mesh position={[0, 0.32, -0.85]}>
        <boxGeometry args={[0.07, 0.5, 0.36]} />
        <meshLambertMaterial color={c.body} flatShading />
      </mesh>
      <Trail trailRef={trailRef} z={-1.55} />
    </group>
  );
}

function Hauler({ c, trailRef }: { c: Col; trailRef?: Ref<THREE.Mesh> }) {
  return (
    <group>
      <mesh position={[0, 0.12, -0.2]}>
        <boxGeometry args={[1.1, 0.7, 3.4]} />
        <meshLambertMaterial color={c.body} flatShading />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 1.55]}>
        <coneGeometry args={[0.42, 1.4, 6]} />
        <meshLambertMaterial color={c.accent} flatShading />
      </mesh>
      <mesh position={[0, 0.02, -0.1]}>
        <boxGeometry args={[5.4, 0.1, 0.9]} />
        <meshLambertMaterial color={c.wing} flatShading />
      </mesh>
      <mesh position={[0, 0.55, -1.7]}>
        <boxGeometry args={[2.2, 0.08, 0.5]} />
        <meshLambertMaterial color={c.wing} flatShading />
      </mesh>
      <mesh position={[0, 0.7, -1.55]}>
        <boxGeometry args={[0.1, 0.7, 0.4]} />
        <meshLambertMaterial color={c.body} flatShading />
      </mesh>
      <Trail trailRef={trailRef} z={-2.1} />
    </group>
  );
}

function Glider({ c, trailRef }: { c: Col; trailRef?: Ref<THREE.Mesh> }) {
  return (
    <group>
      <mesh position={[0, 0, 0.2]}>
        <boxGeometry args={[0.28, 0.16, 2.8]} />
        <meshLambertMaterial color={c.body} flatShading />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[6.4, 0.05, 0.7]} />
        <meshLambertMaterial color={c.wing} flatShading />
      </mesh>
      <mesh position={[0, 0.02, -1.3]}>
        <boxGeometry args={[2.4, 0.04, 0.28]} />
        <meshLambertMaterial color={c.accent} flatShading />
      </mesh>
      <mesh position={[0, 0.28, -1.15]}>
        <boxGeometry args={[0.05, 0.5, 0.28]} />
        <meshLambertMaterial color={c.body} flatShading />
      </mesh>
      <Trail trailRef={trailRef} z={-1.6} />
    </group>
  );
}

function Borealis({ c, trailRef }: { c: Col; trailRef?: Ref<THREE.Mesh> }) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.4]}>
        <coneGeometry args={[0.38, 3.2, 7]} />
        <meshLambertMaterial color={c.body} flatShading />
      </mesh>
      <mesh position={[0, 0, -0.9]}>
        <boxGeometry args={[0.7, 0.28, 1.6]} />
        <meshLambertMaterial color={c.accent} flatShading />
      </mesh>
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[4.6, 0.06, 0.85]} />
        <meshLambertMaterial color={c.wing} flatShading />
      </mesh>
      <mesh position={[1.6, -0.12, -0.5]}>
        <boxGeometry args={[0.22, 0.18, 0.7]} />
        <meshLambertMaterial color={c.accent} flatShading />
      </mesh>
      <mesh position={[-1.6, -0.12, -0.5]}>
        <boxGeometry args={[0.22, 0.18, 0.7]} />
        <meshLambertMaterial color={c.accent} flatShading />
      </mesh>
      <mesh position={[0, 0.12, -1.6]}>
        <boxGeometry args={[1.6, 0.05, 0.4]} />
        <meshLambertMaterial color={c.wing} flatShading />
      </mesh>
      <Trail trailRef={trailRef} z={-1.95} />
    </group>
  );
}

function Hopper({ c, trailRef }: { c: Col; trailRef?: Ref<THREE.Mesh> }) {
  return (
    <group>
      <mesh position={[0, 0.15, 0]}>
        <boxGeometry args={[0.9, 0.45, 1.8]} />
        <meshLambertMaterial color={c.body} flatShading />
      </mesh>
      <mesh position={[0, 0.08, 0.1]}>
        <boxGeometry args={[3.2, 0.08, 0.7]} />
        <meshLambertMaterial color={c.wing} flatShading />
      </mesh>
      <mesh position={[1.1, 0.35, 0.1]}>
        <cylinderGeometry args={[0.28, 0.28, 0.12, 8]} />
        <meshLambertMaterial color={c.accent} flatShading />
      </mesh>
      <mesh position={[-1.1, 0.35, 0.1]}>
        <cylinderGeometry args={[0.28, 0.28, 0.12, 8]} />
        <meshLambertMaterial color={c.accent} flatShading />
      </mesh>
      <mesh position={[0.55, -0.22, 0.4]}>
        <boxGeometry args={[0.12, 0.35, 0.12]} />
        <meshLambertMaterial color={c.accent} flatShading />
      </mesh>
      <mesh position={[-0.55, -0.22, 0.4]}>
        <boxGeometry args={[0.12, 0.35, 0.12]} />
        <meshLambertMaterial color={c.accent} flatShading />
      </mesh>
      <Trail trailRef={trailRef} z={-1.15} />
    </group>
  );
}

function Trail({ z, trailRef }: { z: number; trailRef?: Ref<THREE.Mesh> }) {
  return (
    <mesh ref={trailRef} position={[0, 0, z]} rotation={[-Math.PI / 2, 0, 0]}>
      <coneGeometry args={[0.14, 0.9, 5]} />
      <meshBasicMaterial
        color="#cfe4ec"
        transparent
        opacity={0}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
}
