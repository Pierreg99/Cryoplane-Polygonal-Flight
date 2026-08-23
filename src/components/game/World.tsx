import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { FOG_FAR, FOG_NEAR, SEA_LEVEL, WORLD } from "@/game/constants";
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
import { useGame } from "@/game/store";
import {
  buildTerrainGeometry,
  findFlatPad,
  placeIcebergs,
  placeSpires,
} from "@/game/terrain";

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
  return (
    <>
      <color attach="background" args={["#9eb4c4"]} />
      <fog attach="fog" args={["#8ea8b8", FOG_NEAR, FOG_FAR]} />
      <Lights />
      <SkyDome />
      <Celestials />
      <Terrain />
      <Sea />
      <Spires />
      <Icebergs />
      <Outpost />
      <Aurora />
      <StarField />
      <Snow />
      <Craft />
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
    const d = Math.min(dt, 0.1);
    const target = useGame.getState().night ? 1 : 0;
    mix.current += (target - mix.current) * (1 - Math.exp(-d * 1.7));
    const m = mix.current;
    skyMix.copy(daySky).lerp(nightSky, m);
    fogMix.copy(dayFog).lerp(nightFog, m);
    scene.background = skyMix;
    if (scene.fog && "color" in scene.fog) {
      scene.fog.color.copy(fogMix);
      (scene.fog as THREE.Fog).near = FOG_NEAR + m * 18;
      (scene.fog as THREE.Fog).far = FOG_FAR - m * 90;
    }
    if (amb.current) amb.current.intensity = 0.42 - m * 0.32;
    if (hemi.current) {
      hemi.current.intensity = 0.55 - m * 0.28;
      hemi.current.color.copy(dayHemiSky).lerp(nightHemiSky, m);
      hemi.current.groundColor.copy(dayHemiGround).lerp(nightHemiGround, m);
    }
    if (sun.current) {
      const elev = Math.max(0.08, 0.92 - m * 0.85);
      sun.current.position.set(-180, 220 * elev, 120);
      sun.current.intensity = 1.35 - m * 1.18;
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
      <ambientLight ref={amb} intensity={0.42} />
      <hemisphereLight ref={hemi} args={["#c9d8e2", "#6a7a82", 0.55]} />
      <directionalLight ref={sun} position={[-180, 220, 120]} intensity={1.35} />
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

function Terrain() {
  const geo = useMemo(() => buildTerrainGeometry(), []);
  const mat = useRef<THREE.MeshLambertMaterial>(null);
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
      <meshLambertMaterial
        ref={mat}
        vertexColors
        flatShading
        wireframe={wireframe}
        emissive="#000000"
      />
    </mesh>
  );
}

function Sea() {
  const night = useGame((s) => s.night);
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_LEVEL, 0]}>
      <circleGeometry args={[WORLD * 0.7, 48]} />
      <meshLambertMaterial
        color={night ? "#1b3c48" : "#5e96a6"}
        transparent
        opacity={0.82}
        flatShading
      />
    </mesh>
  );
}

function Spires() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const poses = useMemo(() => placeSpires(110), []);
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
      <meshLambertMaterial
        color={night ? "#8aa0ac" : "#c5d2da"}
        flatShading
        emissive={night ? "#142028" : "#000000"}
      />
    </instancedMesh>
  );
}

function Icebergs() {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const poses = useMemo(() => placeIcebergs(72), []);
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
  useEffect(
    () => () => {
      geo.dispose();
    },
    [geo],
  );
  const night = useGame((s) => s.night);
  return (
    <instancedMesh ref={mesh} args={[geo, undefined, poses.length]}>
      <meshLambertMaterial
        color={night ? "#9bb3be" : "#e4eef2"}
        flatShading
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
        <meshLambertMaterial color="#8a6e5e" flatShading />
      </mesh>
      <mesh position={[3.6, 2.4, 0.4]}>
        <boxGeometry args={[1.6, 4.8, 1.6]} />
        <meshLambertMaterial color="#6e5a4e" flatShading />
      </mesh>
      <mesh position={[-2.2, 0.15, 3.2]}>
        <boxGeometry args={[2.2, 0.3, 3.4]} />
        <meshLambertMaterial color="#c5d0d6" flatShading />
      </mesh>
      <mesh position={[0, 3.6, 0]}>
        <boxGeometry args={[1.1, 0.2, 3.8]} />
        <meshLambertMaterial color="#9ec4d4" flatShading />
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

  useFrame(() => {
    if (!group.current) return;
    craftMatrix(group.current);
    if (trail.current) {
      const mat = trail.current.material as THREE.MeshBasicMaterial;
      mat.opacity = Math.min(0.72, flyer.speed / 70);
      trail.current.scale.set(1, 0.6 + flyer.speed / 40, 1);
    }
  });

  return (
    <group ref={group}>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, 0.15]}>
        <coneGeometry args={[0.32, 2.4, 6]} />
        <meshLambertMaterial color="#e8eef2" flatShading />
      </mesh>
      <mesh position={[0, 0, -0.55]}>
        <boxGeometry args={[0.48, 0.24, 1.2]} />
        <meshLambertMaterial color="#9aa8b2" flatShading />
      </mesh>
      <mesh position={[0, -0.02, -0.05]}>
        <boxGeometry args={[3.2, 0.07, 0.52]} />
        <meshLambertMaterial color="#9ec4d4" flatShading />
      </mesh>
      <mesh position={[0, 0.32, -0.85]}>
        <boxGeometry args={[0.07, 0.5, 0.36]} />
        <meshLambertMaterial color="#c5d0d6" flatShading />
      </mesh>
      <mesh position={[0, 0.14, 0.35]}>
        <boxGeometry args={[0.3, 0.16, 0.55]} />
        <meshLambertMaterial color="#7a9aa8" flatShading />
      </mesh>
      <mesh ref={trail} position={[0, 0, -1.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.14, 0.9, 5]} />
        <meshBasicMaterial
          color="#cfe4ec"
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
    if (active && actions.pause) {
      document.exitPointerLock?.();
      state.setPhase("paused");
    }
    stepFlyer(dt, actions, active);
    cameraFollow(camera, dt);
    writeHud({
      altitude: flyer.agl,
      speed: flyer.speed,
      heading: (flyer.heading * 180) / Math.PI,
      scraping: flyer.scraping,
    });
    snapshotHeld();
  });

  return null;
}
