export type PlaneId = "dart" | "hauler" | "glider" | "borealis" | "hopper";
export type MapId = "pack" | "fjord" | "nunatak" | "berg" | "rift";
export type FlyMode = "cruise" | "combat" | "glide" | "hover" | "landing" | "photo";

export type TerrainParams = {
  seed: number;
  freq: number;
  elev: number;
  ridge: number;
  detail: number;
  warp: number;
  basin: number;
  basinDepth: number;
  power: number;
  island: number;
};

export type PlaneDef = {
  id: PlaneId;
  name: string;
  tag: string;
  maxSpeed: number;
  cruise: number;
  stall: number;
  thrust: number;
  turn: number;
  elevator: number;
  gravity: number;
  slip: number;
  vtol: boolean;
  follow: number;
  colors: { body: number; wing: number; accent: number };
};

export type ModeDef = {
  id: FlyMode;
  name: string;
  tag: string;
  thrust: number;
  turn: number;
  drag: number;
  gravity: number;
  stall: number;
  lift: number;
  cam: number;
};

export type MapDef = {
  id: MapId;
  name: string;
  tag: string;
  terrain: TerrainParams;
  sea: number;
  wind: { x: number; z: number; gust: number };
  icebergs: number;
  spires: number;
  vents: number;
  snow: boolean;
  skyDay: number;
  fogDay: number;
  bands: {
    deep: number;
    fjord: number;
    ice: number;
    pack: number;
    snow: number;
    alpine: number;
    peak: number;
    rock: number;
    scree: number;
  };
};

export const PLANES: Record<PlaneId, PlaneDef> = {
  dart: {
    id: "dart",
    name: "Ice Dart",
    tag: "Scout",
    maxSpeed: 96,
    cruise: 46,
    stall: 17,
    thrust: 34,
    turn: 1.62,
    elevator: 0.92,
    gravity: 19,
    slip: 3.4,
    vtol: false,
    follow: 16.5,
    colors: { body: 0xe8eef2, wing: 0x9ec4d4, accent: 0x7a9aa8 },
  },
  hauler: {
    id: "hauler",
    name: "Pack Hauler",
    tag: "Cargo",
    maxSpeed: 68,
    cruise: 38,
    stall: 14,
    thrust: 26,
    turn: 1.12,
    elevator: 0.7,
    gravity: 22,
    slip: 2.4,
    vtol: false,
    follow: 22,
    colors: { body: 0xc5b7a4, wing: 0x8a9aa4, accent: 0x6e5a4e },
  },
  glider: {
    id: "glider",
    name: "Ridge Glider",
    tag: "Sail",
    maxSpeed: 72,
    cruise: 34,
    stall: 11,
    thrust: 16,
    turn: 1.35,
    elevator: 0.78,
    gravity: 14,
    slip: 2.8,
    vtol: false,
    follow: 18,
    colors: { body: 0xf3f7f9, wing: 0xb7c9d2, accent: 0x9ec4d4 },
  },
  borealis: {
    id: "borealis",
    name: "Borealis",
    tag: "Jet",
    maxSpeed: 128,
    cruise: 72,
    stall: 28,
    thrust: 52,
    turn: 1.28,
    elevator: 1.05,
    gravity: 21,
    slip: 4.2,
    vtol: false,
    follow: 20,
    colors: { body: 0xd5e2ea, wing: 0x4f6d78, accent: 0x9ec4d4 },
  },
  hopper: {
    id: "hopper",
    name: "Lift Hopper",
    tag: "VTOL",
    maxSpeed: 58,
    cruise: 28,
    stall: 6,
    thrust: 30,
    turn: 1.85,
    elevator: 1.1,
    gravity: 16,
    slip: 5.2,
    vtol: true,
    follow: 14,
    colors: { body: 0xb8c4b0, wing: 0x8fa08c, accent: 0x6a7a68 },
  },
};

export const PLANE_ORDER: PlaneId[] = ["dart", "hauler", "glider", "borealis", "hopper"];

export const MODES: Record<FlyMode, ModeDef> = {
  cruise: {
    id: "cruise",
    name: "Cruise",
    tag: "Energy",
    thrust: 1,
    turn: 1,
    drag: 1,
    gravity: 1,
    stall: 1,
    lift: 1,
    cam: 1,
  },
  combat: {
    id: "combat",
    name: "Combat",
    tag: "Agile",
    thrust: 1.12,
    turn: 1.42,
    drag: 1.28,
    gravity: 1.08,
    stall: 1.12,
    lift: 0.92,
    cam: 0.82,
  },
  glide: {
    id: "glide",
    name: "Glide",
    tag: "Sail",
    thrust: 0.22,
    turn: 0.92,
    drag: 0.52,
    gravity: 0.7,
    stall: 0.68,
    lift: 1.18,
    cam: 1.12,
  },
  hover: {
    id: "hover",
    name: "Hover",
    tag: "VTOL",
    thrust: 0.72,
    turn: 1.2,
    drag: 1.45,
    gravity: 0.22,
    stall: 0.15,
    lift: 1.65,
    cam: 0.9,
  },
  landing: {
    id: "landing",
    name: "Landing",
    tag: "Flaps",
    thrust: 0.78,
    turn: 1.08,
    drag: 1.7,
    gravity: 0.86,
    stall: 0.62,
    lift: 1.45,
    cam: 0.95,
  },
  photo: {
    id: "photo",
    name: "Photo",
    tag: "Cine",
    thrust: 0.7,
    turn: 0.78,
    drag: 0.9,
    gravity: 0.92,
    stall: 0.9,
    lift: 1.05,
    cam: 1.55,
  },
};

export const MODE_ORDER: FlyMode[] = [
  "cruise",
  "combat",
  "glide",
  "hover",
  "landing",
  "photo",
];

const PACK_BANDS = {
  deep: 0x143c4a,
  fjord: 0x2f7a88,
  ice: 0x8fb9c8,
  pack: 0xd4e6ee,
  snow: 0xf3f7f9,
  alpine: 0xc4d0d6,
  peak: 0xffffff,
  rock: 0x6a6158,
  scree: 0x7d766c,
};

export const MAPS: Record<MapId, MapDef> = {
  pack: {
    id: "pack",
    name: "Pack Ice",
    tag: "Continent",
    terrain: {
      seed: 0xc4e05,
      freq: 0.00255,
      elev: 34,
      ridge: 48,
      detail: 7,
      warp: 0.55,
      basin: 0.34,
      basinDepth: 52,
      power: 1.12,
      island: 0.52,
    },
    sea: 2.4,
    wind: { x: 2.2, z: -1.4, gust: 3.5 },
    icebergs: 72,
    spires: 110,
    vents: 0,
    snow: true,
    skyDay: 0x9eb4c4,
    fogDay: 0x8ea8b8,
    bands: PACK_BANDS,
  },
  fjord: {
    id: "fjord",
    name: "Fjord Coast",
    tag: "Inlets",
    terrain: {
      seed: 0xa71c3,
      freq: 0.0021,
      elev: 28,
      ridge: 62,
      detail: 9,
      warp: 0.82,
      basin: 0.46,
      basinDepth: 78,
      power: 1.18,
      island: 0.58,
    },
    sea: 2.8,
    wind: { x: -3.4, z: 1.8, gust: 5.2 },
    icebergs: 40,
    spires: 86,
    vents: 0,
    snow: true,
    skyDay: 0x8aa8b6,
    fogDay: 0x7a96a4,
    bands: {
      ...PACK_BANDS,
      deep: 0x0f3344,
      fjord: 0x1f6b7a,
      ice: 0x7eafbe,
    },
  },
  nunatak: {
    id: "nunatak",
    name: "Nunatak Range",
    tag: "Peaks",
    terrain: {
      seed: 0x5e0d2,
      freq: 0.0031,
      elev: 40,
      ridge: 72,
      detail: 8,
      warp: 0.38,
      basin: 0.22,
      basinDepth: 28,
      power: 1.22,
      island: 0.48,
    },
    sea: 1.6,
    wind: { x: 4.1, z: 2.6, gust: 6.4 },
    icebergs: 18,
    spires: 160,
    vents: 0,
    snow: true,
    skyDay: 0xb0c2cc,
    fogDay: 0x9aafb8,
    bands: {
      ...PACK_BANDS,
      alpine: 0xb8c2c8,
      rock: 0x5c564e,
      peak: 0xffffff,
    },
  },
  berg: {
    id: "berg",
    name: "Berg Sea",
    tag: "Archipelago",
    terrain: {
      seed: 0x33ab7,
      freq: 0.0036,
      elev: 22,
      ridge: 30,
      detail: 6,
      warp: 0.7,
      basin: 0.52,
      basinDepth: 64,
      power: 1.05,
      island: 0.62,
    },
    sea: 3.1,
    wind: { x: 1.2, z: -4.8, gust: 4.4 },
    icebergs: 140,
    spires: 36,
    vents: 0,
    snow: true,
    skyDay: 0x8eb0c0,
    fogDay: 0x7a9aaa,
    bands: {
      ...PACK_BANDS,
      deep: 0x123848,
      pack: 0xe2eef4,
    },
  },
  rift: {
    id: "rift",
    name: "Rift Shelf",
    tag: "Geothermal",
    terrain: {
      seed: 0x91fe2,
      freq: 0.0028,
      elev: 36,
      ridge: 44,
      detail: 11,
      warp: 0.95,
      basin: 0.38,
      basinDepth: 46,
      power: 1.14,
      island: 0.5,
    },
    sea: 2.2,
    wind: { x: -1.1, z: 3.2, gust: 2.8 },
    icebergs: 24,
    spires: 70,
    vents: 48,
    snow: false,
    skyDay: 0xa8b4b0,
    fogDay: 0x8e9c96,
    bands: {
      deep: 0x1a3a3c,
      fjord: 0x2f6a68,
      ice: 0x8aafa8,
      pack: 0xc8d6d0,
      snow: 0xe8eeea,
      alpine: 0xb4c0b8,
      peak: 0xf4f6f2,
      rock: 0x5a5048,
      scree: 0x7a6a58,
    },
  },
};

export const MAP_ORDER: MapId[] = ["pack", "fjord", "nunatak", "berg", "rift"];

export function nextId<T extends string>(order: T[], current: T): T {
  const i = order.indexOf(current);
  return order[(i + 1) % order.length]!;
}
