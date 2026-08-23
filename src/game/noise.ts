import { createNoise2D } from "simplex-noise";
import { SEED } from "./constants";

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const elevNoise = createNoise2D(mulberry32(SEED));
const ridgeNoise = createNoise2D(mulberry32(SEED ^ 0x9e3779b9));
const warpNoise = createNoise2D(mulberry32(SEED ^ 0x85ebca6b));
const moistNoise = createNoise2D(mulberry32(SEED ^ 0xc2b2ae35));

function fbm(
  noise: (x: number, y: number) => number,
  x: number,
  z: number,
  octaves = 5,
  lacunarity = 2.02,
  gain = 0.5,
): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += noise(x * freq, z * freq) * amp;
    norm += amp;
    amp *= gain;
    freq *= lacunarity;
  }
  return sum / norm;
}

function ridged(x: number, z: number): number {
  const n = 1 - Math.abs(fbm(ridgeNoise, x, z, 4, 2.15, 0.48));
  return n * n;
}

export function moistureAt(x: number, z: number): number {
  return fbm(moistNoise, x * 0.0018 + 11, z * 0.0018, 4) * 0.5 + 0.5;
}

export function heightAt(x: number, z: number): number {
  const worldR = 980 * 0.46;
  const r = Math.hypot(x, z) / worldR;
  const island = smoothstep(1.08, 0.52, r);
  if (island <= 0.002) return 0.4;

  const nx = x * 0.00255;
  const nz = z * 0.00255;
  const wx = nx + fbm(warpNoise, nx + 4.2, nz, 3) * 0.55;
  const wz = nz + fbm(warpNoise, nx, nz + 9.1, 3) * 0.55;

  let h = 0;
  h += (fbm(elevNoise, wx, wz, 5) * 0.5 + 0.5) * 34;
  h += ridged(wx * 1.45, wz * 1.45) * 48;
  h += fbm(elevNoise, wx * 3.4 + 2, wz * 3.4, 3) * 7;

  const basin = fbm(elevNoise, wx * 0.62 + 18, wz * 0.62, 3) * 0.5 + 0.5;
  if (basin < 0.34) h -= (0.34 - basin) * 52;

  h = Math.pow(Math.max(h, 0) / 90, 1.12) * 90;
  h *= island;

  if (r > 0.74) {
    const shelf = smoothstep(0.74, 1.0, r);
    h = h * (1 - shelf) + 1.6 * shelf;
  }

  return h;
}

export function slopeAt(x: number, z: number): number {
  const e = 3.2;
  const dx = heightAt(x + e, z) - heightAt(x - e, z);
  const dz = heightAt(x, z + e) - heightAt(x, z - e);
  const ny = (2 * e) / Math.hypot(dx, 2 * e, dz);
  return 1 - ny;
}

function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
