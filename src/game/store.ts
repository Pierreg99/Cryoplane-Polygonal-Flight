import { create } from "zustand";
import {
  MAPS,
  MODE_ORDER,
  type FlyMode,
  type MapId,
  type PlaneId,
} from "./catalog";
import { configureNoise } from "./noise";

export type Phase = "boot" | "start" | "play" | "paused" | "crashed";

type GameStore = {
  phase: Phase;
  wireframe: boolean;
  night: boolean;
  pointerLocked: boolean;
  lookHint: "lock" | "drag";
  planeId: PlaneId;
  mapId: MapId;
  flyMode: FlyMode;
  armor: number;
  guns: number;
  engine: number;
  setPhase: (phase: Phase) => void;
  toggleWireframe: () => void;
  toggleNight: () => void;
  setWireframe: (v: boolean) => void;
  setNight: (v: boolean) => void;
  setPointerLocked: (v: boolean) => void;
  setLookHint: (v: "lock" | "drag") => void;
  setPlane: (id: PlaneId) => void;
  setMap: (id: MapId) => void;
  setMode: (id: FlyMode) => void;
  cycleMode: () => void;
  setArmor: (n: number) => void;
  setGuns: (n: number) => void;
  setEngine: (n: number) => void;
};

function persist(key: string, value: string | boolean) {
  try {
    localStorage.setItem(key, typeof value === "boolean" ? (value ? "1" : "0") : value);
  } catch {
    /* ignore */
  }
}

export const useGame = create<GameStore>((set) => ({
  phase: "start",
  wireframe: false,
  night: false,
  pointerLocked: false,
  lookHint: "lock",
  planeId: "dart",
  mapId: "pack",
  flyMode: "cruise",
  armor: 1,
  guns: 1,
  engine: 1,
  setPhase: (phase) => set({ phase }),
  toggleWireframe: () =>
    set((s) => {
      const wireframe = !s.wireframe;
      persist("cryoplane.wireframe", wireframe);
      return { wireframe };
    }),
  toggleNight: () =>
    set((s) => {
      const night = !s.night;
      persist("cryoplane.night", night);
      return { night };
    }),
  setWireframe: (wireframe) => set({ wireframe }),
  setNight: (night) => set({ night }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  setLookHint: (lookHint) => set({ lookHint }),
  setPlane: (planeId) => {
    persist("cryoplane.plane", planeId);
    set({ planeId });
  },
  setMap: (mapId) => {
    if (!MAPS[mapId]) return;
    configureNoise(mapId);
    persist("cryoplane.map", mapId);
    set({ mapId });
  },
  setMode: (flyMode) => {
    persist("cryoplane.mode", flyMode);
    set({ flyMode });
  },
  cycleMode: () =>
    set((s) => {
      const i = MODE_ORDER.indexOf(s.flyMode);
      const flyMode = MODE_ORDER[(i + 1) % MODE_ORDER.length]!;
      persist("cryoplane.mode", flyMode);
      return { flyMode };
    }),
  setArmor: (armor) => {
    const n = Math.max(0, Math.min(2, Math.round(armor)));
    persist("cryoplane.armor", String(n));
    set({ armor: n });
  },
  setGuns: (guns) => {
    const n = Math.max(0, Math.min(2, Math.round(guns)));
    persist("cryoplane.guns", String(n));
    set({ guns: n });
  },
  setEngine: (engine) => {
    const n = Math.max(0, Math.min(2, Math.round(engine)));
    persist("cryoplane.engine", String(n));
    set({ engine: n });
  },
}));

export function hydratePrefs() {
  try {
    const night = localStorage.getItem("cryoplane.night") === "1";
    const wireframe = localStorage.getItem("cryoplane.wireframe") === "1";
    const planeRaw = localStorage.getItem("cryoplane.plane");
    const mapRaw = localStorage.getItem("cryoplane.map");
    const modeRaw = localStorage.getItem("cryoplane.mode");
    const armor = clampTier(localStorage.getItem("cryoplane.armor"), 1);
    const guns = clampTier(localStorage.getItem("cryoplane.guns"), 1);
    const engine = clampTier(localStorage.getItem("cryoplane.engine"), 1);
    const planeId: PlaneId =
      planeRaw === "hauler" ||
      planeRaw === "glider" ||
      planeRaw === "borealis" ||
      planeRaw === "hopper" ||
      planeRaw === "dart"
        ? planeRaw
        : "dart";
    const mapId: MapId =
      mapRaw === "fjord" ||
      mapRaw === "nunatak" ||
      mapRaw === "berg" ||
      mapRaw === "rift" ||
      mapRaw === "pack"
        ? mapRaw
        : "pack";
    const flyMode: FlyMode = MODE_ORDER.includes(modeRaw as FlyMode)
      ? (modeRaw as FlyMode)
      : "cruise";
    configureNoise(mapId);
    useGame.setState({ night, wireframe, planeId, mapId, flyMode, armor, guns, engine });
  } catch {
    /* ignore */
  }
}

function clampTier(raw: string | null, fallback: number) {
  const n = Number(raw);
  if (n === 0 || n === 1 || n === 2) return n;
  return fallback;
}
