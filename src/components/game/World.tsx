import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { tickAudio } from "@/game/audio";
import { CraftMesh } from "@/components/game/CraftMesh";
import { MAPS, MODE_ORDER, MODES } from "@/game/catalog";
import { combat, hostiles, shots, stepCombat, tryPlayerFire } from "@/game/combat";
import { FOG_FAR, FOG_NEAR, WORLD } from "@/game/constants";
import {
  applyLook,
  cameraFollow,
  craftMatrix,
  flyer,
  stepFlyer,
} from "@/game/flyer";
import { writeHud, hud } from "@/game/hud";
import {
  attachInput,
  consumeLook,
  detachInput,
  readActions,
  snapshotHeld,
} from "@/game/input";
import { mission, stepMission } from "@/game/mission";
import { useGame } from "@/game/store";
import {
  buildTerrainGeometry,
  findFlatPad,
  placeIcebergs,
  placeSpires,
  placeVents,
  RUNWAY,
  runwayY,
} from "@/game/terrain";
import { stepTraffic, traffic } from "@/game/traffic";

const daySky = new THREE.Color("#9eb4c4");
const nightSky = new THREE.Color("#07090c");
const dayFog = new THREE.Color("#8ea8b8");
const nightFog = new THREE.Color("#0b1016");
const daySun = new THREE.Color("#f2f0ea");
const nightSun = new THREE.Color("#c5d4de");
const dayHemiSky = new THREE.Color("#c9d8e2");
const nightHemiSky = new THREE.Color("#1b2a38");
const dayHemiGround = new THREE.Color("#6a7a82");
const nightHemiGround = new THREE.Color("#12181e");
const skyMix = new THREE.Color();
const fogMix = new THREE.Color();

export function World() {
  const mapId = useGame((s) => s.mapId);
  return (
    <>
      <color attach="background" args={["#9eb4c4"]} />
      <fog attach="fog" args={["#8ea8b8", FOG_NEAR, FOG_FAR]} />
      <Lights />
      <SkyDome />
      <Clouds />
      <Celestials />
      <group key={mapId}>
        <Terrain />
        <Sea />
        <Spires />
        <Icebergs />
        <Vents />
        <Runway />
        <Rings />
        <Outpost />
        <Parked />
      </group>
      <Traffic />
      <Hostiles />
      <Tracers />
      <Aurora />
      <StarField />
      <Snow />
      <Craft />
      <Bursts />
      <SimLoop />
    </>
  );
}

function Lights() {
  const amb = useRef<THREE.AmbientLight>(null);
  const hemi = useRef<THREE.HemisphereLight>(null);
  const sun = useRef<THREE.DirectionalLight>(null);
  const moon = useRef<THREE.DirectionalLight>(null);
  const mix = useRef(useGame.getState().night ? 1 : 0);
  const { scene } = useThree();

  useFrame((_, dt) => {
    const map = MAPS[useGame.getState().mapId];
    const d = Math.min(dt, 0.1);
    const target = useGame.getState().night ? 1 : 0;
    mix.current += (target - mix.current) * (1 - Math.exp(-d * 1.7));
    const m = mix.current;
    daySky.set(map.skyDay);
    dayFog.set(map.fogDay);
    skyMix.copy(daySky).lerp(nightSky, m);
    fogMix.copy(dayFog).lerp(nightFog, m);
    scene.background = skyMix;
    if (scene.fog && "color" in scene.fog) {
      scene.fog.color.copy(fogMix);
      (scene.fog as THREE.Fog).near = FOG_NEAR + m * 18;
      (scene.fog as THREE.Fog).far = FOG_FAR - m * 90;
    }
    if (amb.current) amb.current.intensity = 0.28 - m * 0.18;
    if (hemi.current) {
      hemi.current.intensity = 0.72 - m * 0.32;
      hemi.current.color.copy(dayHemiSky).lerp(nightHemiSky, m);
      hemi.current.groundColor.copy(dayHemiGround).lerp(nightHemiGround, m);
    }
    if (sun.current) {
      const elev = Math.max(0.08, 0.92 - m * 0.85);
      sun.current.position.set(-180, 240 * elev, 120);
      sun.current.intensity = 1.85 - m * 1.55;
      sun.current.color.copy(daySun).lerp(nightSun, m);
    }
    if (moon.current) {
      moon.current.position.set(90, 80 + m * 60, -160);
      moon.current.intensity = 0.08 + m * 0.55;
    }
    writeHud({ nightMix: m });
  });

  return (
    <>
      <ambientLight ref={amb} intensity={0.28} />
      <hemisphereLight ref={hemi} args={["#c9d8e2", "#6a7a82", 0.72]} />
      <directionalLight ref={sun} position={[-180, 240, 120]} intensity={1.85} />
      <directionalLight
        ref={moon}
        position={[90, 80, -160]}
        intensity={0.08}
        color="#9ec4d4"
      />
    </>
  );
}

function SkyDome() {
  const geo = useMemo(() => {
    const g = new THREE.SphereGeometry(780, 24, 16);
    const colors = new Float32Array(g.attributes.position.count * 3);
    const zenith = new THREE.Color("#d7e4ec");
    const horizon = new THREE.Color("#8aa3b4");
    const c = new THREE.Color();
    for (let i = 0; i < g.attributes.position.count; i++) {
      const y = g.attributes.position.getY(i) / 780;
      c.copy(horizon).lerp(zenith, Math.max(0, y));
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    g.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    return g;
  }, []);
  const mat = useRef<THREE.MeshBasicMaterial>(null);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame(() => {
    if (mat.current) mat.current.opacity = 1 - hud.nightMix * 0.94;
  });
  return (
    <mesh geometry={geo} renderOrder={-1} frustumCulled={false}>
      <meshBasicMaterial
        ref={mat}
        vertexColors
        side={THREE.BackSide}
        fog={false}
        depthWrite={false}
        transparent
        opacity={1}
      />
    </mesh>
  );
}

function Celestials() {
  const sun = useRef<THREE.Mesh>(null);
  const moon = useRef<THREE.Mesh>(null);
  const sunMat = useRef<THREE.MeshBasicMaterial>(null);
  const moonMat = useRef<THREE.MeshBasicMaterial>(null);

  useFrame(() => {
    const m = hud.nightMix;
    const elev = Math.max(0.08, 0.92 - m * 0.85);
    if (sun.current) sun.current.position.set(-180, 220 * elev, 120);
    if (moon.current) moon.current.position.set(90, 80 + m * 60, -160);
    if (sunMat.current) sunMat.current.opacity = Math.max(0, 1 - m * 1.15);
    if (moonMat.current) moonMat.current.opacity = m * 0.92;
  });

  return (
    <>
      <mesh ref={sun} position={[-180, 220, 120]} frustumCulled={false}>
        <sphereGeometry args={[14, 12, 12]} />
        <meshBasicMaterial
          ref={sunMat}
          color="#f4f1e6"
          fog={false}
          transparent
          depthWrite={false}
        />
      </mesh>
      <mesh ref={moon} position={[90, 140, -160]} frustumCulled={false}>
        <sphereGeometry args={[9, 10, 10]} />
        <meshBasicMaterial
          ref={moonMat}
          color="#d5e2ea"
          fog={false}
          transparent
          opacity={0}
          depthWrite={false}
        />
      </mesh>
    </>
  );
}

function Clouds() {
  const group = useRef<THREE.Group>(null);
  const mats = useRef<THREE.MeshLambertMaterial[]>([]);
  useFrame((_, dt) => {
    if (!group.current) return;
    group.current.rotation.y += dt * 0.012;
    const m = hud.nightMix;
    for (const mat of mats.current) {
      mat.opacity = 0.42 * (1 - m * 0.75);
    }
  });
  const puffs = useMemo(
    () =>
      [
        [80, 118, -40, 46, 8, 22],
        [-120, 132, 60, 38, 7, 18],
        [40, 124, 140, 52, 9, 24],
        [-60, 140, -160, 34, 6, 16],
        [170, 126, 20, 28, 6, 14],
        [-20, 136, 200, 40, 7, 20],
      ] as const,
    [],
  );
  return (
    <group ref={group}>
      {puffs.map((p, i) => (
        <mesh key={i} position={[p[0], p[1], p[2]]} frustumCulled={false}>
          <boxGeometry args={[p[3], p[4], p[5]]} />
          <meshLambertMaterial
            ref={(el) => {
              if (el) mats.current[i] = el;
            }}
            color="#e8eef2"
            transparent
            opacity={0.42}
            depthWrite={false}
            flatShading
          />
        </mesh>
      ))}
    </group>
  );
}

function Terrain() {
  const mapId = useGame((s) => s.mapId);
  const geo = useMemo(() => buildTerrainGeometry(mapId), [mapId]);
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const wireframe = useGame((s) => s.wireframe);
  const night = useGame((s) => s.night);

  useEffect(() => () => geo.dispose(), [geo]);

  useEffect(() => {
    if (!mat.current) return;
    mat.current.wireframe = wireframe;
    mat.current.emissive.set(wireframe ? "#2a4450" : night ? "#0c1a22" : "#000000");
    mat.current.emissiveIntensity = wireframe ? 0.55 : night ? 0.22 : 0;
  }, [wireframe, night]);

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial
        ref={mat}
        vertexColors
        flatShading
        roughness={0.88}
        metalness={0.04}
        wireframe={wireframe}
        emissive="#000000"
      />
    </mesh>
  );
}

function Sea() {
  const night = useGame((s) => s.night);
  const mapId = useGame((s) => s.mapId);
  const sea = MAPS[mapId].sea;
  const geo = useMemo(() => new THREE.PlaneGeometry(WORLD * 1.35, WORLD * 1.35, 36, 36), []);
  const ref = useRef<THREE.Mesh>(null);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame(({ clock }) => {
    const mesh = ref.current;
    if (!mesh) return;
    const pos = mesh.geometry.attributes.position;
    const t = clock.elapsedTime;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const h =
        Math.sin(x * 0.018 + t * 0.7) * 0.45 +
        Math.sin(y * 0.022 + t * 0.55) * 0.32 +
        Math.sin((x + y) * 0.01 + t * 0.35) * 0.2;
      pos.setZ(i, h);
    }
    pos.needsUpdate = true;
  });
  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, sea, 0]} geometry={geo}>
      <meshStandardMaterial
        color={night ? "#1b3c48" : "#4e8fa4"}
        transparent
        opacity={0.88}
        roughness={0.22}
        metalness={0.28}
        flatShading
      />
    </mesh>
  );
}

function Spires() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mapId = useGame((s) => s.mapId);
  const poses = useMemo(() => placeSpires(MAPS[mapId].spires), [mapId]);
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.55, 1, 5);
    g.translate(0, 0.5, 0);
    return g;
  }, []);
  useEffect(() => {
    if (!mesh.current) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const e = new THREE.Euler();
    poses.forEach((pose, i) => {
      p.set(pose.x, pose.y, pose.z);
      e.set(0, pose.ry, 0);
      q.setFromEuler(e);
      s.set(pose.s * 0.35, pose.s, pose.s * 0.35);
      m.compose(p, q, s);
      mesh.current!.setMatrixAt(i, m);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [poses]);
  useEffect(
    () => () => {
      geo.dispose();
    },
    [geo],
  );
  const night = useGame((s) => s.night);
  return (
    <instancedMesh ref={mesh} args={[geo, undefined, poses.length]}>
      <meshStandardMaterial
        color={night ? "#8aa0ac" : "#c5d2da"}
        flatShading
        roughness={0.62}
        metalness={0.08}
        emissive={night ? "#142028" : "#000000"}
      />
    </instancedMesh>
  );
}

function Icebergs() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const mapId = useGame((s) => s.mapId);
  const poses = useMemo(
    () => placeIcebergs(MAPS[mapId].icebergs, MAPS[mapId].sea),
    [mapId],
  );
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.7, 1.4, 5);
    g.translate(0, 0.45, 0);
    return g;
  }, []);
  useEffect(() => {
    if (!mesh.current) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const e = new THREE.Euler();
    poses.forEach((pose, i) => {
      p.set(pose.x, pose.y, pose.z);
      e.set(0.08, pose.ry, 0.04);
      q.setFromEuler(e);
      s.set(pose.s * 0.55, pose.s, pose.s * 0.55);
      m.compose(p, q, s);
      mesh.current!.setMatrixAt(i, m);
    });
    mesh.current.instanceMatrix.needsUpdate = true;
  }, [poses]);
  useFrame(({ clock }) => {
    const inst = mesh.current;
    if (!inst) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    const e = new THREE.Euler();
    const t = clock.elapsedTime;
    poses.forEach((pose, i) => {
      p.set(pose.x, pose.y + Math.sin(t * 0.55 + i) * 0.4, pose.z);
      e.set(0.08, pose.ry + t * 0.015, 0.04);
      q.setFromEuler(e);
      s.set(pose.s * 0.55, pose.s, pose.s * 0.55);
      m.compose(p, q, s);
      inst.setMatrixAt(i, m);
    });
    inst.instanceMatrix.needsUpdate = true;
  });
  useEffect(
    () => () => {
      geo.dispose();
    },
    [geo],
  );
  const night = useGame((s) => s.night);
  return (
    <instancedMesh ref={mesh} args={[geo, undefined, poses.length]}>
      <meshStandardMaterial
        color={night ? "#9bb3be" : "#e4eef2"}
        flatShading
        roughness={0.48}
        metalness={0.12}
        emissive={night ? "#152028" : "#000000"}
      />
    </instancedMesh>
  );
}

function Outpost() {
  const pad = useMemo(() => findFlatPad(18), []);
  const y = pad.y + 0.2;
  return (
    <group position={[pad.x, y, pad.z]}>
      <mesh position={[0, 1.1, 0]}>
        <boxGeometry args={[6.4, 2.2, 4.2]} />
        <meshStandardMaterial color="#8a6e5e" flatShading roughness={0.78} metalness={0.04} />
      </mesh>
      <mesh position={[3.6, 2.4, 0.4]}>
        <boxGeometry args={[1.6, 4.8, 1.6]} />
        <meshStandardMaterial color="#6e5a4e" flatShading roughness={0.8} />
      </mesh>
      <mesh position={[-2.2, 0.15, 3.2]}>
        <boxGeometry args={[2.2, 0.3, 3.4]} />
        <meshStandardMaterial color="#c5d0d6" flatShading roughness={0.55} metalness={0.08} />
      </mesh>
      <mesh position={[0, 3.6, 0]}>
        <boxGeometry args={[1.1, 0.2, 3.8]} />
        <meshStandardMaterial color="#9ec4d4" flatShading roughness={0.4} metalness={0.18} />
      </mesh>
    </group>
  );
}

function Aurora() {
  const group = useRef<THREE.Group>(null);
  const night = useGame((s) => s.night);
  const geos = useMemo(() => {
    return [0, 1, 2].map((i) => makeRibbon(i));
  }, []);
  useEffect(
    () => () => {
      geos.forEach((g) => g.dispose());
    },
    [geos],
  );
  useFrame(({ clock }) => {
    if (!group.current) return;
    const t = clock.elapsedTime;
    group.current.children.forEach((child, i) => {
      child.rotation.y = Math.sin(t * 0.07 + i) * 0.15;
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      mat.opacity = (night ? 0.22 : 0) * (0.7 + Math.sin(t * 0.6 + i) * 0.3);
    });
  });
  return (
    <group ref={group} position={[0, 92, -40]}>
      {geos.map((geo, i) => (
        <mesh key={i} geometry={geo} rotation={[0.15, i * 0.4, 0]}>
          <meshBasicMaterial
            color={i === 1 ? "#7eb8a4" : "#6aa8c2"}
            transparent
            opacity={0}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function makeRibbon(seed: number) {
  const w = 220;
  const h = 28;
  const seg = 28;
  const geo = new THREE.PlaneGeometry(w, h, seg, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const wave = Math.sin(x * 0.035 + seed * 1.7) * 10 + Math.sin(x * 0.09 + seed) * 4;
    pos.setZ(i, wave);
    pos.setY(i, pos.getY(i) + Math.sin(x * 0.02 + seed) * 6);
  }
  geo.computeVertexNormals();
  return geo;
}

function StarField() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const count = 700;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 420 + Math.random() * 280;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.random() * 0.9;
      pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
      pos[i * 3 + 1] = 40 + r * Math.cos(ph);
      pos[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th);
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const mat = useRef<THREE.PointsMaterial>(null);
  const night = useGame((s) => s.night);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame(() => {
    if (mat.current) mat.current.opacity = night ? 0.9 : 0;
  });
  return (
    <points geometry={geo}>
      <pointsMaterial
        ref={mat}
        color="#e8eef2"
        size={1.4}
        sizeAttenuation
        transparent
        opacity={0}
        depthWrite={false}
        fog={false}
      />
    </points>
  );
}

function Snow() {
  const mapId = useGame((s) => s.mapId);
  if (!MAPS[mapId].snow) return null;
  return <SnowField />;
}

function SnowField() {
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry();
    const count = 360;
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 220;
      pos[i * 3 + 1] = Math.random() * 80;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 220;
    }
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    return g;
  }, []);
  const ref = useRef<THREE.Points>(null);
  useEffect(() => () => geo.dispose(), [geo]);
  useFrame((_, dt) => {
    const points = ref.current;
    if (!points) return;
    const arr = points.geometry.attributes.position.array as Float32Array;
    const d = Math.min(dt, 0.1);
    for (let i = 0; i < arr.length; i += 3) {
      arr[i] += d * 2.4;
      arr[i + 1] -= d * 6.5;
      arr[i + 2] += d * 1.2;
      if (arr[i + 1] < 0) arr[i + 1] = 70 + Math.random() * 20;
      const dx = arr[i] - flyer.x;
      const dz = arr[i + 2] - flyer.z;
      if (dx > 110) arr[i] -= 220;
      if (dx < -110) arr[i] += 220;
      if (dz > 110) arr[i + 2] -= 220;
      if (dz < -110) arr[i + 2] += 220;
    }
    points.geometry.attributes.position.needsUpdate = true;
  });
  return (
    <points ref={ref} geometry={geo}>
      <pointsMaterial
        color="#eef3f6"
        size={0.55}
        transparent
        opacity={0.55}
        depthWrite={false}
      />
    </points>
  );
}

function Craft() {
  const group = useRef<THREE.Group>(null);
  const trail = useRef<THREE.Mesh>(null);
  const muzzle = useRef<THREE.Mesh>(null);
  const planeId = useGame((s) => s.planeId);

  useFrame((_, dt) => {
    if (!group.current) return;
    craftMatrix(group.current);
    if (trail.current) {
      const mat = trail.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(0.82, flyer.throttle * 0.6 + flyer.speed / 100);
      trail.current.scale.set(1, 0.55 + flyer.throttle * 1.35 + flyer.airspeed * 0.01, 1);
    }
    if (muzzle.current) {
      const mat = muzzle.current.material as THREE.MeshBasicMaterial;
      const on = combat.playerCool > 0.04 ? 1 : 0;
      mat.opacity += (on * 0.85 - mat.opacity) * (1 - Math.exp(-dt * 28));
      muzzle.current.scale.setScalar(0.7 + combat.playerCool * 4);
    }
  });

  return (
    <group ref={group}>
      <CraftMesh planeId={planeId} trailRef={trail} live />
      <mesh ref={muzzle} position={[0, 0.02, 1.55]}>
        <sphereGeometry args={[0.22, 6, 6]} />
        <meshBasicMaterial
          color="#e8eef2"
          transparent
          opacity={0}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

function SimLoop() {
  const { camera, gl } = useThree();

  useEffect(() => {
    attachInput(gl.domElement);
    gl.domElement.style.touchAction = "none";
    return () => detachInput();
  }, [gl]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.1);
    const state = useGame.getState();
    const active = state.phase === "play";
    const look = consumeLook();
    if (active) applyLook(look.x, look.y);
    const actions = readActions();
    if (actions.wireframe) state.toggleWireframe();
    if (actions.night) state.toggleNight();
    if (actions.cycleMode) state.cycleMode();
    if (actions.mode) state.setMode(MODE_ORDER[actions.mode - 1]!);
    if (active && actions.pause) {
      document.exitPointerLock?.();
      state.setPhase("paused");
    }
    stepFlyer(dt, actions, active, state.planeId, state.flyMode, state.mapId);
    if (active && flyer.crashed) {
      document.exitPointerLock?.();
      state.setPhase("crashed");
    }
    if (active && !flyer.crashed) {
      tryPlayerFire(dt, actions.fire, state.flyMode);
      stepMission(dt);
      stepTraffic(dt);
      stepCombat(dt, true, state.flyMode);
    } else {
      stepCombat(dt, false, state.flyMode);
    }
    cameraFollow(camera, dt, state.flyMode, state.planeId);
    tickAudio(active);
    const map = MAPS[state.mapId];
    writeHud({
      altitude: flyer.agl,
      speed: flyer.speed,
      heading: (flyer.heading * 180) / Math.PI,
      scraping: flyer.scraping,
      stall: flyer.stall,
      throttle: flyer.throttle,
      mode: MODES[state.flyMode].name,
      wpDist: mission.wpDist,
      rings: mission.scored,
      landings: mission.landings,
      landingScore: mission.lastLanding,
      onRunway: mission.onRunway,
      wind: Math.hypot(map.wind.x, map.wind.z),
      hull: flyer.integrity,
      kills: combat.kills,
      crashed: flyer.crashed ? 1 : 0,
    });
    snapshotHeld();
  });

  return null;
}

function Vents() {
  const mapId = useGame((s) => s.mapId);
  const count = MAPS[mapId].vents;
  const poses = useMemo(() => (count ? placeVents(count) : []), [mapId, count]);
  const mesh = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.35, 0.7, 1.2, 6);
    g.translate(0, 0.6, 0);
    return g;
  }, []);
  useEffect(() => {
    if (!mesh.current) return;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const p = new THREE.Vector3();
    const s = new THREE.Vector3();
    poses.forEach((pose, i) => {
      p.set(pose.x, pose.y, pose.z);
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), pose.ry);
      s.set(pose.s, pose.s, pose.s);
      m.compose(p, q, s);
      mesh.current!.setMatrixAt(i, m);
    });
    if (mesh.current) mesh.current.instanceMatrix.needsUpdate = true;
  }, [poses]);
  useEffect(() => () => geo.dispose(), [geo]);
  if (!count) return null;
  return (
    <instancedMesh ref={mesh} args={[geo, undefined, poses.length]}>
      <meshLambertMaterial color="#6a5a4a" flatShading emissive="#3a2820" emissiveIntensity={0.45} />
    </instancedMesh>
  );
}

function Runway() {
  const y = runwayY();
  return (
    <group position={[RUNWAY.x, y + 0.15, RUNWAY.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[RUNWAY.width, RUNWAY.length]} />
        <meshLambertMaterial color="#3d454c" flatShading />
      </mesh>
      <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[0.35, RUNWAY.length * 0.9]} />
        <meshLambertMaterial color="#d8e2e8" emissive="#c5d0d6" emissiveIntensity={0.2} />
      </mesh>
      {[-1, 1].map((side) =>
        [-36, -18, 0, 18, 36].map((z) => (
          <mesh key={`${side}-${z}`} position={[side * 4.6, 0.45, z]}>
            <boxGeometry args={[0.22, 0.9, 0.22]} />
            <meshLambertMaterial color="#9ec4d4" emissive="#9ec4d4" emissiveIntensity={0.35} />
          </mesh>
        )),
      )}
    </group>
  );
}

function Rings() {
  const group = useRef<THREE.Group>(null);
  useFrame(() => {
    const g = group.current;
    if (!g) return;
    g.children.forEach((child, i) => {
      const ring = mission.rings[i];
      if (!ring) return;
      const active = i === mission.index;
      child.position.set(ring.x, ring.y, ring.z);
      child.rotation.y += active ? 0.028 : 0.01;
      child.rotation.z = Math.sin(flyer.simTime * 2.2 + i) * (active ? 0.12 : 0.04);
      const mat = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
      const hit = ring.hit;
      mat.color.set(active ? "#9ec4d4" : hit ? "#6b7680" : "#8b98a3");
      mat.opacity = active ? 0.55 + Math.sin(flyer.simTime * 6) * 0.28 : 0.32;
      const pulse = active ? 1 + Math.sin(flyer.simTime * 5) * 0.08 : 1;
      child.scale.setScalar(pulse);
    });
  });
  const count = 6;
  return (
    <group ref={group}>
      {Array.from({ length: count }, (_, i) => (
        <mesh key={i} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[7.2, 0.28, 6, 18]} />
          <meshBasicMaterial
            color="#9ec4d4"
            transparent
            opacity={0.4}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

function Parked() {
  const y = runwayY();
  return (
    <group>
      <group position={[RUNWAY.x + 16, y + 3.2, RUNWAY.z + 28]} rotation={[0, 0.6, 0]}>
        <CraftMesh planeId="hauler" />
      </group>
      <group position={[RUNWAY.x - 18, y + 2.4, RUNWAY.z + 22]} rotation={[0, -0.4, 0]}>
        <CraftMesh planeId="glider" />
      </group>
    </group>
  );
}

function Traffic() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    traffic.forEach((c, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.position.set(c.x, c.y, c.z);
      g.rotation.set(c.pitch, c.yaw, c.bank, "YXZ");
    });
  });
  return (
    <group>
      {traffic.map((c, i) => (
        <group
          key={c.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <CraftMesh planeId={c.plane} />
        </group>
      ))}
    </group>
  );
}

function Bursts() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const items = useRef(
    Array.from({ length: 8 }, () => ({ live: 0, x: 0, y: 0, z: 0, age: 0 })),
  );
  const seenKills = useRef(0);
  useFrame((_, dt) => {
    if (combat.kills > seenKills.current) {
      const h = hostiles.find((en) => !en.live) ?? hostiles[0];
      const slot = items.current.find((it) => it.live <= 0);
      if (slot && h) {
        slot.live = 1;
        slot.age = 0;
        slot.x = h.x;
        slot.y = h.y;
        slot.z = h.z;
      }
      seenKills.current = combat.kills;
    }
    const m = mesh.current;
    if (!m) return;
    items.current.forEach((it, i) => {
      if (it.live > 0) {
        it.age += dt;
        const k = Math.min(1, it.age / 0.55);
        dummy.position.set(it.x, it.y, it.z);
        dummy.scale.setScalar(1.2 + k * 6);
        if (it.age > 0.55) it.live = 0;
      } else {
        dummy.scale.setScalar(0);
        dummy.position.set(0, -40, 0);
      }
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, 8]}>
      <sphereGeometry args={[0.7, 6, 6]} />
      <meshBasicMaterial
        color="#c9867a"
        transparent
        opacity={0.35}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

function Hostiles() {
  const refs = useRef<(THREE.Group | null)[]>([]);
  useFrame(() => {
    hostiles.forEach((h, i) => {
      const g = refs.current[i];
      if (!g) return;
      g.visible = h.live;
      if (!h.live) return;
      g.position.set(h.x, h.y, h.z);
      g.rotation.set(h.pitch, h.yaw, h.bank, "YXZ");
    });
  });
  return (
    <group>
      {hostiles.map((h, i) => (
        <group
          key={h.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
        >
          <CraftMesh planeId={h.plane} />
          <mesh position={[0, 0.55, 0.2]}>
            <boxGeometry args={[0.18, 0.18, 0.18]} />
            <meshBasicMaterial color="#c9867a" />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function Tracers() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const playerCol = useMemo(() => new THREE.Color("#e8eef2"), []);
  const enemyCol = useMemo(() => new THREE.Color("#c9867a"), []);
  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    shots.forEach((s, i) => {
      if (!s.live) {
        dummy.scale.set(0, 0, 0);
        dummy.position.set(0, -20, 0);
      } else {
        dummy.scale.set(1, 1, 1);
        dummy.position.set(s.x, s.y, s.z);
        dummy.lookAt(s.x + s.vx, s.y + s.vy, s.z + s.vz);
      }
      dummy.updateMatrix();
      m.setMatrixAt(i, dummy.matrix);
      m.setColorAt(i, s.from === "player" ? playerCol : enemyCol);
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
  });
  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, shots.length]}>
      <boxGeometry args={[0.07, 0.07, 2.2]} />
      <meshBasicMaterial />
    </instancedMesh>
  );
}

