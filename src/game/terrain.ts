import * as THREE from "three";
import { MAPS, type MapId } from "./catalog";
import { SEGS, WORLD } from "./constants";
import { heightAt, moistureAt, slopeAt } from "./noise";

const tmp = new THREE.Color();
const cDeep = new THREE.Color();
const cFjord = new THREE.Color();
const cIce = new THREE.Color();
const cPack = new THREE.Color();
const cSnow = new THREE.Color();
const cAlpine = new THREE.Color();
const cPeak = new THREE.Color();
const cRock = new THREE.Color();
const cScree = new THREE.Color();

function bindBands(mapId: MapId) {
  const b = MAPS[mapId].bands;
  cDeep.set(b.deep);
  cFjord.set(b.fjord);
  cIce.set(b.ice);
  cPack.set(b.pack);
  cSnow.set(b.snow);
  cAlpine.set(b.alpine);
  cPeak.set(b.peak);
  cRock.set(b.rock);
  cScree.set(b.scree);
}

function colorFor(h: number, slope: number, moist: number, sea: number, out: THREE.Color) {
  if (slope > 0.55) {
    out.copy(cRock).lerp(cScree, THREE.MathUtils.clamp((slope - 0.55) * 2.4, 0, 1));
    return;
  }
  if (h < sea + 0.4) {
    out.copy(cDeep);
    return;
  }
  if (h < 7) {
    out.copy(cDeep).lerp(cFjord, (h - sea) / 4.6);
    return;
  }
  if (h < 13) {
    out.copy(cFjord).lerp(cIce, (h - 7) / 6);
    return;
  }
  if (h < 24) {
    const t = (h - 13) / 11;
    out.copy(cIce).lerp(moist > 0.55 ? cPack : cSnow, t);
    return;
  }
  if (h < 50) {
    out.copy(cSnow).lerp(cAlpine, (h - 24) / 26);
    if (slope > 0.38) out.lerp(cScree, (slope - 0.38) * 2.2);
    return;
  }
  if (h < 72) {
    out.copy(cAlpine).lerp(cPeak, (h - 50) / 22);
    return;
  }
  out.copy(cPeak);
}

export function buildTerrainGeometry(mapId: MapId): THREE.BufferGeometry {
  bindBands(mapId);
  const sea = MAPS[mapId].sea;
  const plane = new THREE.PlaneGeometry(WORLD, WORLD, SEGS, SEGS);
  plane.rotateX(-Math.PI / 2);
  const pos = plane.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    pos.setY(i, heightAt(x, z));
  }
  const geo = plane.toNonIndexed();
  plane.dispose();

  const p = geo.attributes.position;
  const colors = new Float32Array(p.count * 3);
  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const n = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();

  for (let i = 0; i < p.count; i += 3) {
    a.fromBufferAttribute(p, i);
    b.fromBufferAttribute(p, i + 1);
    c.fromBufferAttribute(p, i + 2);
    ab.subVectors(b, a);
    ac.subVectors(c, a);
    n.crossVectors(ab, ac).normalize();
    const slope = 1 - Math.abs(n.y);
    const mx = (a.x + b.x + c.x) / 3;
    const mz = (a.z + b.z + c.z) / 3;
    const h = (a.y + b.y + c.y) / 3;
    colorFor(h, slope, moistureAt(mx, mz), sea, tmp);
    const shade = 1 - slope * 0.34;
    tmp.r *= shade;
    tmp.g *= shade;
    tmp.b *= shade;
    if (h > 30 && ((i * 17 + Math.floor(mx)) % 19) === 0) {
      tmp.lerp(cPeak, 0.22);
    }
    for (let j = 0; j < 3; j++) {
      const k = (i + j) * 3;
      colors[k] = tmp.r;
      colors[k + 1] = tmp.g;
      colors[k + 2] = tmp.b;
    }
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  geo.computeBoundingSphere();
  geo.computeBoundingBox();
  return geo;
}

export type PropPose = {
  x: number;
  y: number;
  z: number;
  s: number;
  ry: number;
};

export function placeSpires(count = 110): PropPose[] {
  const out: PropPose[] = [];
  let guard = 0;
  while (out.length < count && guard < count * 40) {
    guard += 1;
    const x = (hash(out.length + guard * 17) - 0.5) * WORLD * 0.78;
    const z = (hash(out.length + guard * 41 + 9) - 0.5) * WORLD * 0.78;
    const h = heightAt(x, z);
    const s = slopeAt(x, z);
    if (h < 18 || h > 78 || s < 0.18) continue;
    out.push({
      x,
      y: h - 0.4,
      z,
      s: 2.2 + hash(guard * 3) * 7.5,
      ry: hash(guard * 11) * Math.PI * 2,
    });
  }
  return out;
}

export function placeIcebergs(count = 72, sea = 2.4): PropPose[] {
  const out: PropPose[] = [];
  let guard = 0;
  while (out.length < count && guard < count * 50) {
    guard += 1;
    const ang = hash(guard * 13) * Math.PI * 2;
    const rad = 160 + hash(guard * 29) * 280;
    const x = Math.cos(ang) * rad;
    const z = Math.sin(ang) * rad;
    const h = heightAt(x, z);
    if (h > sea + 1.2) continue;
    out.push({
      x,
      y: sea - 0.6,
      z,
      s: 3.2 + hash(guard * 7) * 9,
      ry: hash(guard * 19) * Math.PI * 2,
    });
  }
  return out;
}

export function placeVents(count = 48): PropPose[] {
  const out: PropPose[] = [];
  let guard = 0;
  while (out.length < count && guard < count * 40) {
    guard += 1;
    const x = (hash(guard * 23) - 0.5) * WORLD * 0.55;
    const z = (hash(guard * 47) - 0.5) * WORLD * 0.55;
    const h = heightAt(x, z);
    const s = slopeAt(x, z);
    if (h < 8 || h > 36 || s > 0.4) continue;
    out.push({
      x,
      y: h,
      z,
      s: 1.4 + hash(guard) * 2.2,
      ry: hash(guard * 5) * Math.PI * 2,
    });
  }
  return out;
}

export const RUNWAY = { x: 28, z: 168, yaw: 0, length: 92, width: 10 };

export function runwayY(): number {
  return heightAt(RUNWAY.x, RUNWAY.z);
}

export function findFlatPad(
  targetH = 16,
  radius = 220,
): { x: number; z: number; y: number } {
  let best = { x: -40, z: -30, y: heightAt(-40, -30), score: 99 };
  for (let i = 0; i < 80; i++) {
    const a = (i / 80) * Math.PI * 2;
    const r = 40 + (i % 7) * 18;
    const x = Math.cos(a) * r;
    const z = Math.sin(a) * r;
    if (Math.hypot(x, z) > radius) continue;
    const y = heightAt(x, z);
    const s = slopeAt(x, z);
    const score = Math.abs(y - targetH) + s * 40;
    if (score < best.score && y > 8) best = { x, z, y, score };
  }
  return best;
}

export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}
