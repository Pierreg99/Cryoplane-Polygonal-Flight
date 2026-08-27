import { PLANES, type PlaneId } from "./catalog";
import { heightAt } from "./noise";

export type TrafficCraft = {
  id: number;
  plane: PlaneId;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  bank: number;
  speed: number;
};

export const traffic: TrafficCraft[] = [];

const AI_PLANES: PlaneId[] = ["hauler", "glider", "borealis", "hopper"];

export function rebuildTraffic() {
  traffic.length = 0;
  for (let i = 0; i < 4; i++) {
    const yaw = (i / 4) * Math.PI * 2;
    const r = 110 + i * 36;
    const x = -Math.sin(yaw) * r;
    const z = -Math.cos(yaw) * r;
    const plane = AI_PLANES[i]!;
    traffic.push({
      id: i,
      plane,
      x,
      y: heightAt(x, z) + 28 + i * 8,
      z,
      yaw,
      pitch: -0.04,
      bank: 0.28,
      speed: PLANES[plane].cruise * 0.85,
    });
  }
}

export function stepTraffic(dt: number) {
  for (const c of traffic) {
    const plane = PLANES[c.plane];
    c.yaw += 0.22 * dt;
    const fx = -Math.sin(c.yaw);
    const fz = -Math.cos(c.yaw);
    c.x += fx * c.speed * dt;
    c.z += fz * c.speed * dt;
    const ground = heightAt(c.x, c.z);
    const wantY = ground + 24 + c.id * 7;
    c.y += (wantY - c.y) * (1 - Math.exp(-dt * 1.6));
    if (c.y < ground + 8) c.y = ground + 8;
    c.pitch += (-0.04 - c.pitch) * (1 - Math.exp(-dt * 4));
    c.bank += (0.32 - c.bank) * (1 - Math.exp(-dt * 5));
    c.speed += (plane.cruise * 0.85 - c.speed) * dt * 0.4;
  }
}

rebuildTraffic();
