import { useFrame } from "@react-three/fiber";
import { useRef, type Ref } from "react";
import * as THREE from "three";
import { PLANES, type PlaneId } from "@/game/catalog";
import { flyer } from "@/game/flyer";

export function CraftMesh({
  planeId,
  trailRef,
  live = false,
}: {
  planeId: PlaneId;
  trailRef?: Ref<THREE.Mesh>;
  live?: boolean;
}) {
  const p = PLANES[planeId];
  return (
    <group>
      {planeId === "hauler" ? (
        <Hauler c={p.colors} trailRef={trailRef} />
      ) : planeId === "glider" ? (
        <Glider c={p.colors} trailRef={trailRef} />
      ) : planeId === "borealis" ? (
        <Borealis c={p.colors} trailRef={trailRef} />
      ) : planeId === "hopper" ? (
        <Hopper c={p.colors} trailRef={trailRef} />
      ) : (
        <Dart c={p.colors} trailRef={trailRef} />
      )}
      <FlightRig live={live} />
    </group>
  );
}

function FlightRig({ live }: { live: boolean }) {
  const left = useRef<THREE.Mesh>(null);
  const right = useRef<THREE.Mesh>(null);
  const elev = useRef<THREE.Mesh>(null);
  const prop = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    const b = live ? flyer.bank : 0;
    const p = live ? flyer.pitch : 0;
    if (left.current) left.current.rotation.z = -b * 0.55;
    if (right.current) right.current.rotation.z = -b * 0.55;
    if (elev.current) elev.current.rotation.x = p * 0.4;
    if (prop.current) {
      const rpm = live ? 22 + flyer.throttle * 70 + flyer.airspeed * 0.35 : 8;
      prop.current.rotation.z += dt * rpm;
    }
  });
  return (
    <group>
      <mesh ref={left} position={[1.55, 0.02, 0.12]}>
        <boxGeometry args={[1.05, 0.035, 0.26]} />
        <meshStandardMaterial color="#c5d0d6" flatShading roughness={0.5} metalness={0.12} />
      </mesh>
      <mesh ref={right} position={[-1.55, 0.02, 0.12]}>
        <boxGeometry args={[1.05, 0.035, 0.26]} />
        <meshStandardMaterial color="#c5d0d6" flatShading roughness={0.5} metalness={0.12} />
      </mesh>
      <mesh ref={elev} position={[0, 0.06, -1.28]}>
        <boxGeometry args={[0.95, 0.03, 0.22]} />
        <meshStandardMaterial color="#9ec4d4" flatShading roughness={0.45} metalness={0.14} />
      </mesh>
      <mesh ref={prop} position={[0, 0.02, 1.22]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.06, 1.35, 0.035]} />
        <meshStandardMaterial color="#e8eef2" flatShading roughness={0.35} metalness={0.2} />
      </mesh>
    </group>
  );
}

type Col = { body: number; wing: number; accent: number };

function Dart({ c, trailRef }: { c: Col; trailRef?: Ref<THREE.Mesh> }) {
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.15]}>
        <coneGeometry args={[0.32, 2.4, 6]} />
        <meshStandardMaterial color={c.body} flatShading roughness={0.46} metalness={0.16} />
      </mesh>
      <mesh position={[0, 0, -0.55]}>
        <boxGeometry args={[0.48, 0.24, 1.2]} />
        <meshStandardMaterial color={c.accent} flatShading roughness={0.42} metalness={0.22} />
      </mesh>
      <mesh position={[0, -0.02, -0.05]}>
        <boxGeometry args={[3.8, 0.07, 0.55]} />
        <meshStandardMaterial color={c.wing} flatShading roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.08, -1.15]}>
        <boxGeometry args={[1.4, 0.05, 0.32]} />
        <meshStandardMaterial color={c.body} flatShading roughness={0.46} metalness={0.16} />
      </mesh>
      <mesh position={[0, 0.32, -0.85]}>
        <boxGeometry args={[0.07, 0.5, 0.36]} />
        <meshStandardMaterial color={c.body} flatShading roughness={0.46} metalness={0.16} />
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
        <meshStandardMaterial color={c.body} flatShading roughness={0.46} metalness={0.16} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.1, 1.55]}>
        <coneGeometry args={[0.42, 1.4, 6]} />
        <meshStandardMaterial color={c.accent} flatShading roughness={0.42} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0.02, -0.1]}>
        <boxGeometry args={[5.4, 0.1, 0.9]} />
        <meshStandardMaterial color={c.wing} flatShading roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.55, -1.7]}>
        <boxGeometry args={[2.2, 0.08, 0.5]} />
        <meshStandardMaterial color={c.wing} flatShading roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.7, -1.55]}>
        <boxGeometry args={[0.1, 0.7, 0.4]} />
        <meshStandardMaterial color={c.body} flatShading roughness={0.46} metalness={0.16} />
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
        <meshStandardMaterial color={c.body} flatShading roughness={0.46} metalness={0.16} />
      </mesh>
      <mesh position={[0, 0.02, 0]}>
        <boxGeometry args={[6.4, 0.05, 0.7]} />
        <meshStandardMaterial color={c.wing} flatShading roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.02, -1.3]}>
        <boxGeometry args={[2.4, 0.04, 0.28]} />
        <meshStandardMaterial color={c.accent} flatShading roughness={0.42} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0.28, -1.15]}>
        <boxGeometry args={[0.05, 0.5, 0.28]} />
        <meshStandardMaterial color={c.body} flatShading roughness={0.46} metalness={0.16} />
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
        <meshStandardMaterial color={c.body} flatShading roughness={0.46} metalness={0.16} />
      </mesh>
      <mesh position={[0, 0, -0.9]}>
        <boxGeometry args={[0.7, 0.28, 1.6]} />
        <meshStandardMaterial color={c.accent} flatShading roughness={0.42} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0, 0.1]}>
        <boxGeometry args={[4.6, 0.06, 0.85]} />
        <meshStandardMaterial color={c.wing} flatShading roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[1.6, -0.12, -0.5]}>
        <boxGeometry args={[0.22, 0.18, 0.7]} />
        <meshStandardMaterial color={c.accent} flatShading roughness={0.42} metalness={0.22} />
      </mesh>
      <mesh position={[-1.6, -0.12, -0.5]}>
        <boxGeometry args={[0.22, 0.18, 0.7]} />
        <meshStandardMaterial color={c.accent} flatShading roughness={0.42} metalness={0.22} />
      </mesh>
      <mesh position={[0, 0.12, -1.6]}>
        <boxGeometry args={[1.6, 0.05, 0.4]} />
        <meshStandardMaterial color={c.wing} flatShading roughness={0.5} metalness={0.1} />
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
        <meshStandardMaterial color={c.body} flatShading roughness={0.46} metalness={0.16} />
      </mesh>
      <mesh position={[0, 0.08, 0.1]}>
        <boxGeometry args={[3.2, 0.08, 0.7]} />
        <meshStandardMaterial color={c.wing} flatShading roughness={0.5} metalness={0.1} />
      </mesh>
      <mesh position={[1.1, 0.35, 0.1]}>
        <cylinderGeometry args={[0.28, 0.28, 0.12, 8]} />
        <meshStandardMaterial color={c.accent} flatShading roughness={0.42} metalness={0.22} />
      </mesh>
      <mesh position={[-1.1, 0.35, 0.1]}>
        <cylinderGeometry args={[0.28, 0.28, 0.12, 8]} />
        <meshStandardMaterial color={c.accent} flatShading roughness={0.42} metalness={0.22} />
      </mesh>
      <mesh position={[0.55, -0.22, 0.4]}>
        <boxGeometry args={[0.12, 0.35, 0.12]} />
        <meshStandardMaterial color={c.accent} flatShading roughness={0.42} metalness={0.22} />
      </mesh>
      <mesh position={[-0.55, -0.22, 0.4]}>
        <boxGeometry args={[0.12, 0.35, 0.12]} />
        <meshStandardMaterial color={c.accent} flatShading roughness={0.42} metalness={0.22} />
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
