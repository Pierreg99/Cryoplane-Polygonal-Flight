import * as THREE from "three";
import {
  CLEARANCE,
  DRAG,
  FOLLOW_DIST,
  FOLLOW_HEIGHT,
  LIFT,
  LOOK_SENS,
  MAX_SPEED,
  PHYS_STEP,
  PITCH_LIMIT,
  SPAWN,
  STRAFE,
  THRUST,
} from "./constants";
import { heightAt } from "./noise";
import type { Actions } from "./input";

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
  speed: number;
  agl: number;
  heading: number;
  scraping: number;
  trauma: number;
};

export const flyer: FlyerState = {
  x: SPAWN.x,
  y: SPAWN.y,
  z: SPAWN.z,
  vx: 0,
  vy: 0,
  vz: 0,
  yaw: 0,
  pitch: -0.12,
  bank: 0,
  speed: 0,
  agl: 40,
  heading: 0,
  scraping: 0,
  trauma: 0,
};

const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const worldUp = new THREE.Vector3(0, 1, 0);
const vel = new THREE.Vector3();
const wish = new THREE.Vector3();
const camDesired = new THREE.Vector3();
const lookAt = new THREE.Vector3();

let acc = 0;

export function resetFlyer() {
  flyer.x = SPAWN.x;
  flyer.z = SPAWN.z;
  flyer.y = Math.max(SPAWN.y, heightAt(SPAWN.x, SPAWN.z) + 22);
  flyer.vx = 0;
  flyer.vy = 0;
  flyer.vz = 0;
  flyer.yaw = 0;
  flyer.pitch = -0.12;
  flyer.bank = 0;
  flyer.speed = 0;
  flyer.scraping = 0;
  flyer.trauma = 0;
  acc = 0;
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
  if (flyer.y < floor) {
    flyer.y = floor;
    if (flyer.vy < 0) flyer.vy *= -0.18;
    flyer.vx *= 0.88;
    flyer.vz *= 0.88;
    flyer.scraping = 1;
    flyer.trauma = Math.min(1, flyer.trauma + 0.28);
  }
}

function integrate(dt: number, actions: Actions) {
  getForward(forward);
  getRight(right);

  wish.set(0, 0, 0);
  wish.addScaledVector(forward, actions.thrust * THRUST);
  wish.addScaledVector(right, actions.strafe * STRAFE);
  wish.y += actions.lift * LIFT;

  flyer.vx += wish.x * dt;
  flyer.vy += wish.y * dt;
  flyer.vz += wish.z * dt;

  const damp = Math.exp(-DRAG * dt);
  flyer.vx *= damp;
  flyer.vy *= Math.exp(-(DRAG + 0.35) * dt);
  flyer.vz *= damp;

  vel.set(flyer.vx, flyer.vy, flyer.vz);
  const spd = vel.length();
  if (spd > MAX_SPEED) {
    vel.multiplyScalar(MAX_SPEED / spd);
    flyer.vx = vel.x;
    flyer.vy = vel.y;
    flyer.vz = vel.z;
  }

  const travel = vel.length() * dt;
  const steps = Math.max(1, Math.min(8, Math.ceil(travel / 2.4)));
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
  }

  if (flyer.y > 220) {
    flyer.y = 220;
    flyer.vy = Math.min(flyer.vy, 0);
  }

  vel.set(flyer.vx, flyer.vy, flyer.vz);
  flyer.speed = vel.length();
  flyer.heading = ((flyer.yaw % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
}

export function stepFlyer(dt: number, actions: Actions, playing: boolean) {
  const cap = Math.min(dt, 0.1);
  flyer.scraping = Math.max(0, flyer.scraping - cap * 2.4);
  flyer.trauma = Math.max(0, flyer.trauma - cap * 2.6);

  const targetBank = playing ? -actions.strafe * 0.52 : 0;
  flyer.bank += (targetBank - flyer.bank) * (1 - Math.exp(-cap * 10));

  if (!playing) {
    acc = 0;
    return;
  }

  acc += cap;
  if (acc > 0.2) acc = 0.2;
  while (acc >= PHYS_STEP) {
    integrate(PHYS_STEP, actions);
    acc -= PHYS_STEP;
  }
}

export function cameraFollow(camera: THREE.Camera, dt: number) {
  getForward(forward);
  camDesired.set(flyer.x, flyer.y, flyer.z);
  camDesired.addScaledVector(forward, -FOLLOW_DIST);
  camDesired.y += FOLLOW_HEIGHT;
  const t = 1 - Math.exp(-dt * 7.5);
  camera.position.x += (camDesired.x - camera.position.x) * t;
  camera.position.y += (camDesired.y - camera.position.y) * t;
  camera.position.z += (camDesired.z - camera.position.z) * t;

  const shake = flyer.trauma * flyer.trauma;
  if (shake > 0.002) {
    const w = dt * 60;
    camera.position.x += Math.sin(w * 19.1) * shake * 0.32;
    camera.position.y += Math.cos(w * 23.7) * shake * 0.22;
  }

  lookAt.set(flyer.x, flyer.y + 0.6, flyer.z);
  lookAt.addScaledVector(forward, 6);
  camera.lookAt(lookAt);
  const persp = camera as THREE.PerspectiveCamera;
  if (persp.isPerspectiveCamera) {
    const targetFov = 64 + (flyer.speed / MAX_SPEED) * 14;
    persp.fov += (targetFov - persp.fov) * (1 - Math.exp(-dt * 4));
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
