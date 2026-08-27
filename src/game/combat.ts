import * as THREE from "three";
import { PLANES, type FlyMode, type PlaneId } from "./catalog";
import { flyer, getForward } from "./flyer";
import { heightAt } from "./noise";
import { useGame } from "./store";

export type Shot = {
  live: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  from: "player" | "enemy";
};

export type Hostile = {
  id: number;
  live: boolean;
  plane: PlaneId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  bank: number;
  hp: number;
  cool: number;
  respawn: number;
};

const SHOT_N = 28;
const HOSTILE_N = 3;
const fwd = new THREE.Vector3();
const HOSTILE_PLANES: PlaneId[] = ["dart", "borealis", "hauler"];

export const shots: Shot[] = Array.from({ length: SHOT_N }, () => ({
  live: false,
  x: 0,
  y: 0,
  z: 0,
  vx: 0,
  vy: 0,
  vz: 0,
  life: 0,
  from: "player",
}));

export const hostiles: Hostile[] = [];

export const combat = {
  kills: 0,
  hits: 0,
  playerCool: 0,
  flash: 0,
};

export function resetCombat() {
  combat.kills = 0;
  combat.hits = 0;
  combat.playerCool = 0;
  combat.flash = 0;
  for (const s of shots) s.live = false;
  hostiles.length = 0;
  for (let i = 0; i < HOSTILE_N; i++) spawnHostile(i, true);
}

function spawnHostile(id: number, init: boolean) {
  const yaw = (id / HOSTILE_N) * Math.PI * 2 + 0.4;
  const r = 220 + id * 40;
  const x = -Math.sin(yaw) * r;
  const z = -Math.cos(yaw) * r;
  const existing = hostiles[id];
  const h: Hostile = existing ?? {
    id,
    live: true,
    plane: HOSTILE_PLANES[id]!,
    x,
    y: 0,
    z,
    yaw: yaw + Math.PI,
    pitch: 0.02,
    bank: 0,
    hp: 1,
    cool: 1.2,
    respawn: 0,
  };
  h.live = true;
  h.plane = HOSTILE_PLANES[id]!;
  h.x = x;
  h.z = z;
  h.y = heightAt(x, z) + 42 + id * 10;
  h.yaw = yaw + Math.PI;
  h.pitch = 0.02;
  h.bank = 0.2;
  h.hp = 1;
  h.cool = 1.4 + id * 0.4;
  h.respawn = 0;
  if (!existing) hostiles.push(h);
  void init;
}

function fireShot(
  x: number,
  y: number,
  z: number,
  dirx: number,
  diry: number,
  dirz: number,
  from: "player" | "enemy",
  speed: number,
) {
  const s = shots.find((sh) => !sh.live);
  if (!s) return;
  s.live = true;
  s.x = x + dirx * 3.2;
  s.y = y + diry * 3.2;
  s.z = z + dirz * 3.2;
  s.vx = dirx * speed;
  s.vy = diry * speed;
  s.vz = dirz * speed;
  s.life = from === "player" ? 1.15 : 0.95;
  s.from = from;
}

export function tryPlayerFire(dt: number, firing: boolean, flyMode: FlyMode) {
  combat.playerCool = Math.max(0, combat.playerCool - dt);
  if (!firing || combat.playerCool > 0) return;
  const guns = useGame.getState().guns;
  const rate = flyMode === "combat" ? 0.09 : 0.16;
  combat.playerCool = Math.max(0.06, rate - guns * 0.02);
  getForward(fwd);
  const spd = 210 + guns * 28;
  fireShot(flyer.x, flyer.y, flyer.z, fwd.x, fwd.y, fwd.z, "player", spd);
  flyer.trauma = Math.min(1, flyer.trauma + 0.08);
}

function hitPlayer(dmg: number) {
  if (flyer.grace > 0 || flyer.crashed) return;
  const armor = useGame.getState().armor;
  flyer.integrity = Math.max(0, flyer.integrity - dmg / (1 + armor * 0.35));
  flyer.trauma = Math.min(1, flyer.trauma + 0.45);
  combat.flash = 1;
  if (flyer.integrity <= 0) {
    flyer.crashed = true;
    flyer.integrity = 0;
    flyer.airspeed = 0;
    flyer.vx = 0;
    flyer.vy = 0;
    flyer.vz = 0;
    flyer.throttle = 0;
  }
}

export function stepCombat(dt: number, playing: boolean, flyMode: FlyMode) {
  combat.flash = Math.max(0, combat.flash - dt * 3.2);
  if (!playing) return;
  const hunt = flyMode === "combat";
  const guns = useGame.getState().guns;

  for (const s of shots) {
    if (!s.live) continue;
    s.life -= dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.z += s.vz * dt;
    if (s.life <= 0 || s.y < heightAt(s.x, s.z) + 1.2) {
      s.live = false;
      continue;
    }
    if (s.from === "player") {
      for (const h of hostiles) {
        if (!h.live) continue;
        const dx = h.x - s.x;
        const dy = h.y - s.y;
        const dz = h.z - s.z;
        if (dx * dx + dy * dy + dz * dz < 36) {
          s.live = false;
          h.hp -= 0.34 + guns * 0.18;
          combat.hits += 1;
          flyer.trauma = Math.min(1, flyer.trauma + 0.12);
          if (h.hp <= 0) {
            h.live = false;
            h.respawn = 4.5;
            combat.kills += 1;
          }
          break;
        }
      }
    } else {
      const dx = flyer.x - s.x;
      const dy = flyer.y - s.y;
      const dz = flyer.z - s.z;
      if (dx * dx + dy * dy + dz * dz < 16) {
        s.live = false;
        hitPlayer(0.14);
      }
    }
  }

  for (const h of hostiles) {
    if (!h.live) {
      h.respawn -= dt;
      if (h.respawn <= 0) spawnHostile(h.id, false);
      continue;
    }
    const dx = flyer.x - h.x;
    const dy = flyer.y - h.y;
    const dz = flyer.z - h.z;
    const dist = Math.hypot(dx, dy, dz);
    const wantYaw = Math.atan2(-dx, -dz);
    let yawErr = wantYaw - h.yaw;
    yawErr = Math.atan2(Math.sin(yawErr), Math.cos(yawErr));
    const turn = hunt ? 1.15 : 0.45;
    h.yaw += THREE.MathUtils.clamp(yawErr, -turn * dt, turn * dt);
    const wantPitch = THREE.MathUtils.clamp(dy / Math.max(40, dist), -0.35, 0.35);
    h.pitch += (wantPitch - h.pitch) * (1 - Math.exp(-dt * 3));
    h.bank += (THREE.MathUtils.clamp(-yawErr * 1.4, -0.7, 0.7) - h.bank) * (1 - Math.exp(-dt * 5));
    const spd = PLANES[h.plane].cruise * (hunt ? 1.05 : 0.78);
    const fx = -Math.sin(h.yaw) * Math.cos(h.pitch);
    const fy = Math.sin(h.pitch);
    const fz = -Math.cos(h.yaw) * Math.cos(h.pitch);
    h.x += fx * spd * dt;
    h.y += fy * spd * dt;
    h.z += fz * spd * dt;
    const floor = heightAt(h.x, h.z) + 12;
    if (h.y < floor) h.y = floor;
    if (h.y > 200) h.y = 200;

    h.cool -= dt;
    if (hunt && h.cool <= 0 && dist < 170 && Math.abs(yawErr) < 0.45) {
      h.cool = 1.1 + Math.random() * 0.5;
      fireShot(h.x, h.y, h.z, fx, fy, fz, "enemy", 160);
    }
  }
}

resetCombat();
