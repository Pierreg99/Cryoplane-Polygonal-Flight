import { MAPS, type MapId } from "./catalog";
import { flyer } from "./flyer";
import { heightAt } from "./noise";
import { RUNWAY, runwayY } from "./terrain";

export type Ring = { x: number; y: number; z: number; hit: boolean };

export const mission = {
  rings: [] as Ring[],
  index: 0,
  scored: 0,
  landings: 0,
  landingCool: 0,
  lastLanding: 0,
  wpDist: 0,
  onRunway: 0,
};

export function resetMission(mapId: MapId) {
  const rings: Ring[] = [];
  const sea = MAPS[mapId].sea;
  const spots = [
    { a: 0.15, r: 90, h: 38 },
    { a: 1.05, r: 160, h: 44 },
    { a: 2.1, r: 210, h: 36 },
    { a: 3.2, r: 150, h: 52 },
    { a: 4.3, r: 240, h: 32 },
    { a: 5.4, r: 120, h: 48 },
  ];
  for (const s of spots) {
    const x = Math.cos(s.a) * s.r;
    const z = Math.sin(s.a) * s.r;
    const ground = heightAt(x, z);
    rings.push({
      x,
      y: Math.max(ground + 16, sea + s.h * 0.45),
      z,
      hit: false,
    });
  }
  mission.rings = rings;
  mission.index = 0;
  mission.scored = 0;
  mission.landings = 0;
  mission.landingCool = 0;
  mission.lastLanding = 0;
  mission.wpDist = 0;
  mission.onRunway = 0;
}

resetMission("pack");


export function stepMission(dt: number) {
  const rings = mission.rings;
  if (!rings.length) return;
  if (mission.index >= rings.length) mission.index = 0;
  const ring = rings[mission.index]!;
  const dx = flyer.x - ring.x;
  const dy = flyer.y - ring.y;
  const dz = flyer.z - ring.z;
  mission.wpDist = Math.hypot(dx, dy, dz);
  if (mission.wpDist < 10) {
    ring.hit = true;
    mission.scored += 1;
    mission.index = (mission.index + 1) % rings.length;
    flyer.trauma = Math.min(1, flyer.trauma + 0.18);
  }

  mission.landingCool = Math.max(0, mission.landingCool - dt);
  const localZ = flyer.z - RUNWAY.z;
  const localX = flyer.x - RUNWAY.x;
  const onStrip =
    Math.abs(localX) < RUNWAY.width * 0.55 &&
    localZ < RUNWAY.length * 0.55 &&
    localZ > -RUNWAY.length * 0.55;
  const padY = runwayY();
  const aglPad = flyer.y - padY;
  mission.onRunway = onStrip ? 1 : 0;
  if (
    onStrip &&
    aglPad < 7 &&
    flyer.speed < 26 &&
    flyer.pitch < 0.22 &&
    mission.landingCool <= 0
  ) {
    mission.landings += 1;
    mission.lastLanding = Math.max(0, 100 - flyer.speed * 2.2 - Math.abs(flyer.pitch) * 40);
    mission.landingCool = 4;
    flyer.trauma = Math.min(1, flyer.trauma + 0.12);
  }
}
