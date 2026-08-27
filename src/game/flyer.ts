import * as THREE from "three";
import { MAPS, MODES, PLANES, type FlyMode, type MapId, type PlaneId } from "./catalog";
import {
  BANK_MAX,
  CLEARANCE,
  FOLLOW_HEIGHT,
  LOOK_SENS,
  PHYS_STEP,
  PITCH_LIMIT,
  SPAWN,
} from "./constants";
import { heightAt } from "./noise";
import type { Actions } from "./input";
import { useGame } from "./store";

export type FlyerState = {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  yaw: number;
  pitch: number;
  bank: number;
  throttle: number;
  airspeed: number;
  speed: number;
  agl: number;
  heading: number;
  scraping: number;
  trauma: number;
  stall: number;
  simTime: number;
  integrity: number;
  grace: number;
  crashed: boolean;
};

export const flyer: FlyerState = {
  x: SPAWN.x,
  y: SPAWN.y,
  z: SPAWN.z,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  pitch: 0.04,
  bank: 0,
  throttle: 0.58,
  airspeed: 46,
  speed: 46,
  agl: 40,
  heading: 0,
  scraping: 0,
  trauma: 0,
  stall: 0,
  simTime: 0,
  integrity: 1,
  grace: 2.8,
  crashed: false,
};

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);
const vel = new THREE.Vector3();
const wishVel = new THREE.Vector3();
const camDesired = new THREE.Vector3();
const lookAt = new THREE.Vector3();

let acc = 0;
let prevYaw = 0;
let camSnap = true;
let pitchRate = 0;
let spool = 0.62;
let activePlane: PlaneId = "dart";
let activeMode: FlyMode = "cruise";
let activeMap: MapId = "pack";

function wrapPi(a: number) {
  return Math.atan2(Math.sin(a), Math.cos(a));
}

export function resetFlyer(planeId: PlaneId = "dart", mapId: MapId = "pack") {
  activePlane = planeId;
  activeMap = mapId;
  const plane = PLANES[planeId];
  flyer.x = SPAWN.x;
  flyer.z = SPAWN.z;
  flyer.y = Math.max(SPAWN.y, heightAt(SPAWN.x, SPAWN.z) + 58);
  flyer.yaw = 0;
  flyer.pitch = 0.06;
  flyer.bank = 0;
  flyer.throttle = 0.58;
  flyer.airspeed = plane.cruise;
  getForward(forward);
  flyer.vx = forward.x * plane.cruise;
  flyer.vy = forward.y * plane.cruise * 0.15;
  flyer.vz = forward.z * plane.cruise;
  flyer.speed = plane.cruise;
  flyer.scraping = 0;
  flyer.trauma = 0;
  flyer.stall = 0;
  flyer.simTime = 0;
  flyer.integrity = 1;
  flyer.grace = 2.4;
  flyer.crashed = false;
  acc = 0;
  prevYaw = 0;
  pitchRate = 0;
  spool = 0.58;
  camSnap = true;
}

export function getForward(out = forward) {
  const cy = Math.cos(flyer.yaw);
  const sy = Math.sin(flyer.yaw);
  const cp = Math.cos(flyer.pitch);
  const sp = Math.sin(flyer.pitch);
  out.set(-sy * cp, sp, -cy * cp);
  return out;
}

export function getRight(out = right) {
  getForward(forward);
  out.crossVectors(forward, worldUp);
  if (out.lengthSq() < 1e-6) out.set(1, 0, 0);
  else out.normalize();
  return out;
}

export function applyLook(dx: number, dy: number) {
  flyer.yaw -= dx * LOOK_SENS;
  flyer.pitch -= dy * LOOK_SENS;
  if (flyer.pitch > PITCH_LIMIT) flyer.pitch = PITCH_LIMIT;
  if (flyer.pitch < -PITCH_LIMIT) flyer.pitch = -PITCH_LIMIT;
}

function collideFloor() {
  const ground = heightAt(flyer.x, flyer.z);
  const floor = ground + CLEARANCE;
  flyer.agl = flyer.y - ground;
  if (flyer.y >= floor) return;

  const vDown = Math.max(0, -flyer.vy);
  flyer.y = floor;

  if (flyer.grace > 0 || flyer.crashed) {
    if (flyer.vy < 0) flyer.vy = 0;
    return;
  }

  const flare =
    activeMode === "landing" &&
    flyer.airspeed < 32 &&
    flyer.pitch > -0.22 &&
    vDown < 16;

  if (flare) {
    flyer.vy = 0;
    flyer.airspeed *= 0.88;
    flyer.vx *= 0.88;
    flyer.vz *= 0.88;
    flyer.scraping = 0.18;
    return;
  }

  const hard = vDown > 18 || flyer.airspeed > 38 || flyer.pitch < -0.55;
  if (flyer.vy < 0) flyer.vy = Math.abs(flyer.vy) * (hard ? 0.04 : 0.18);
  flyer.airspeed *= hard ? 0.38 : 0.78;
  flyer.vx *= hard ? 0.38 : 0.78;
  flyer.vz *= hard ? 0.38 : 0.78;
  flyer.scraping = hard ? 1 : 0.42;
  flyer.trauma = Math.min(1, flyer.trauma + (hard ? 0.62 : 0.18));
  if (flyer.pitch < -0.05) flyer.pitch += 0.12;

  const armor = useGame.getState().armor;
  const dmg = (hard ? 0.2 + vDown * 0.016 : 0.045) / (1 + armor * 0.35);
  flyer.integrity = Math.max(0, flyer.integrity - dmg);
  if (flyer.integrity <= 0 || vDown > 42) {
    flyer.crashed = true;
    flyer.integrity = 0;
    flyer.airspeed = 0;
    flyer.vx = 0;
    flyer.vy = 0;
    flyer.vz = 0;
    flyer.throttle = 0;
    spool = 0;
  }
}

function integrate(dt: number, actions: Actions) {
  const plane = PLANES[activePlane];
  const mode = MODES[activeMode];
  const map = MAPS[activeMap];
  const vtolHover = mode.id === "hover" && plane.vtol;
  const engine = 1 + useGame.getState().engine * 0.12;
  const mass = 0.78 + (42 - plane.thrust) * 0.012;

  if (actions.thrust > 0.05) {
    flyer.throttle += 0.55 * actions.thrust * dt;
  } else if (actions.thrust < -0.05) {
    flyer.throttle += 0.9 * actions.thrust * dt;
  }
  if (flyer.throttle > 1) flyer.throttle = 1;
  if (flyer.throttle < 0) flyer.throttle = 0;
  spool += (flyer.throttle - spool) * (1 - Math.exp(-dt * 2.35));

  pitchRate += actions.lift * plane.elevator * mode.lift * (2.8 / mass) * dt;
  pitchRate *= Math.exp(-5.2 * dt);
  flyer.pitch += pitchRate * dt;
  if (flyer.pitch > PITCH_LIMIT) {
    flyer.pitch = PITCH_LIMIT;
    pitchRate = 0;
  }
  if (flyer.pitch < -PITCH_LIMIT) {
    flyer.pitch = -PITCH_LIMIT;
    pitchRate = 0;
  }

  const speedK = THREE.MathUtils.clamp(flyer.airspeed / 28, 0.16, 1.25);
  flyer.yaw += -actions.strafe * plane.turn * mode.turn * speedK * dt;

  const climb = Math.sin(flyer.pitch);
  const load = 1 + Math.abs(flyer.bank) * 0.62 + Math.abs(pitchRate) * 1.6;
  flyer.airspeed += (spool * plane.thrust * mode.thrust * engine * dt) / mass;
  flyer.airspeed -= climb * plane.gravity * mode.gravity * (1.12 + Math.max(0, climb) * 0.7) * dt;
  flyer.airspeed += Math.max(0, -climb) * 11 * dt;
  const drag =
    (0.13 + (1 - spool) * 0.34 + Math.max(0, climb) * 0.26) * mode.drag * load;
  flyer.airspeed *= Math.exp(-drag * dt);
  if (flyer.airspeed > plane.maxSpeed) flyer.airspeed = plane.maxSpeed;
  if (flyer.airspeed < 0) flyer.airspeed = 0;

  const stallSpeed = plane.stall * mode.stall;
  const stall = THREE.MathUtils.clamp(
    stallSpeed <= 0.01 ? 0 : (stallSpeed - flyer.airspeed) / Math.max(stallSpeed, 0.01),
    0,
    1,
  );
  flyer.stall += (stall - flyer.stall) * (1 - Math.exp(-dt * 7));
  if (stall > 0 && !vtolHover) {
    pitchRate -= stall * 1.8 * dt;
    flyer.vy -= stall * 32 * dt;
    flyer.trauma = Math.max(flyer.trauma, stall * 0.35);
    flyer.bank += Math.sin(flyer.simTime * 18) * stall * 0.35 * dt;
  }

  if (vtolHover) {
    flyer.vy += actions.lift * 30 * dt;
    flyer.vy += (spool - 0.4) * 20 * dt;
    flyer.vy *= Math.exp(-1.7 * dt);
  }

  getForward(forward);
  wishVel.copy(forward).multiplyScalar(flyer.airspeed);
  const slip = 1 - Math.exp(-(plane.slip / mass) * dt);
  flyer.vx += (wishVel.x - flyer.vx) * slip;
  flyer.vy += (wishVel.y - flyer.vy) * slip;
  flyer.vz += (wishVel.z - flyer.vz) * slip;

  const gust = Math.sin(flyer.simTime * 0.55) * map.wind.gust;
  flyer.vx += (map.wind.x + gust) * dt * 0.42;
  flyer.vz += (map.wind.z - gust * 0.45) * dt * 0.42;

  if (flyer.agl < 16) {
    const ge = (1 - flyer.agl / 16) * 14 * mode.lift * dt;
    flyer.vy += ge;
    flyer.airspeed *= Math.exp(-0.08 * (1 - flyer.agl / 16) * dt);
  }

  vel.set(flyer.vx, flyer.vy, flyer.vz);
  const travel = vel.length() * dt;
  const steps = Math.max(1, Math.min(8, Math.ceil(travel / 2.2)));
  const sdt = dt / steps;
  for (let i = 0; i < steps; i++) {
    flyer.x += flyer.vx * sdt;
    flyer.y += flyer.vy * sdt;
    flyer.z += flyer.vz * sdt;
    collideFloor();
  }

  const limit = 980 * 0.46;
  const radial = Math.hypot(flyer.x, flyer.z);
  if (radial > limit) {
    const k = limit / radial;
    flyer.x *= k;
    flyer.z *= k;
    flyer.vx *= 0.4;
    flyer.vz *= 0.4;
    flyer.airspeed *= 0.7;
  }

  if (flyer.y > 260) {
    flyer.y = 260;
    flyer.vy = Math.min(flyer.vy, 0);
    if (flyer.pitch > 0) flyer.pitch *= 0.94;
  }

  vel.set(flyer.vx, flyer.vy, flyer.vz);
  flyer.speed = vel.length();
  flyer.heading = ((flyer.yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

export function stepFlyer(
  dt: number,
  actions: Actions,
  playing: boolean,
  planeId: PlaneId,
  flyMode: FlyMode,
  mapId: MapId,
) {
  activePlane = planeId;
  activeMode = flyMode;
  activeMap = mapId;
  const cap = Math.min(dt, 0.1);
  flyer.scraping = Math.max(0, flyer.scraping - cap * 2.4);
  flyer.trauma = Math.max(0, flyer.trauma - cap * 2.6);
  if (playing) {
    flyer.simTime += cap;
    flyer.grace = Math.max(0, flyer.grace - cap);
  }

  const yawRate = wrapPi(flyer.yaw - prevYaw) / Math.max(cap, 1 / 120);
  const targetBank = THREE.MathUtils.clamp(
    -actions.strafe * BANK_MAX + yawRate * 0.18,
    -0.92,
    0.92,
  );
  flyer.bank += (targetBank - flyer.bank) * (1 - Math.exp(-cap * 8));
  prevYaw = flyer.yaw;

  if (!playing || flyer.crashed) {
    acc = 0;
    if (flyer.crashed) collideFloor();
    return;
  }

  acc += cap;
  if (acc > 0.2) acc = 0.2;
  while (acc >= PHYS_STEP) {
    integrate(PHYS_STEP, actions);
    acc -= PHYS_STEP;
  }
}

export function cameraFollow(camera: THREE.Camera, dt: number, flyMode: FlyMode, planeId: PlaneId) {
  const plane = PLANES[planeId];
  const mode = MODES[flyMode];
  getForward(forward);
  const rush = THREE.MathUtils.clamp(flyer.speed / plane.maxSpeed, 0, 1);
  const dist = (plane.follow + rush * 7) * mode.cam;
  camDesired.set(flyer.x, flyer.y, flyer.z);
  camDesired.addScaledVector(forward, -dist);
  camDesired.y += FOLLOW_HEIGHT + rush * 1.4 + (flyMode === "photo" ? 4 : 0);
  if (camSnap) {
    camera.position.copy(camDesired);
    camSnap = false;
  } else {
    const lag = flyMode === "photo" ? 2.4 : 5.2;
    const t = 1 - Math.exp(-dt * lag);
    camera.position.x += (camDesired.x - camera.position.x) * t;
    camera.position.y += (camDesired.y - camera.position.y) * t;
    camera.position.z += (camDesired.z - camera.position.z) * t;
  }

  const shake = flyer.trauma * flyer.trauma;
  if (shake > 0.002) {
    const w = dt * 60;
    camera.position.x += Math.sin(w * 19.1) * shake * 0.32;
    camera.position.y += Math.cos(w * 23.7) * shake * 0.22;
  }

  lookAt.set(flyer.x, flyer.y + 0.55, flyer.z);
  lookAt.addScaledVector(forward, 7 + rush * 4);
  camera.lookAt(lookAt);
  const persp = camera as THREE.PerspectiveCamera;
  if (persp.isPerspectiveCamera) {
    const targetFov = (flyMode === "photo" ? 52 : 62) + rush * 16;
    persp.fov += (targetFov - persp.fov) * (1 - Math.exp(-dt * 3.5));
    persp.updateProjectionMatrix();
  }
}

export function craftMatrix(target: THREE.Object3D) {
  target.position.set(flyer.x, flyer.y, flyer.z);
  getForward(forward);
  lookAt.set(flyer.x, flyer.y, flyer.z).add(forward);
  target.up.set(0, 1, 0);
  target.lookAt(lookAt);
  target.rotateZ(flyer.bank);
}
