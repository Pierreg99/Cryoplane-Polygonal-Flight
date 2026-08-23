import { create } from "zustand";

export type Phase = "boot" | "start" | "play" | "paused";

type GameStore = {
  phase: Phase;
  wireframe: boolean;
  night: boolean;
  pointerLocked: boolean;
  lookHint: "lock" | "drag";
  setPhase: (phase: Phase) => void;
  toggleWireframe: () => void;
  toggleNight: () => void;
  setWireframe: (v: boolean) => void;
  setNight: (v: boolean) => void;
  setPointerLocked: (v: boolean) => void;
  setLookHint: (v: "lock" | "drag") => void;
};

function persist(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? "1" : "0");
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
  setPhase: (phase) => set({ phase }),
  toggleWireframe: () =>
    set((s) => {
      const wireframe = !s.wireframe;
      persist("cryosys.wireframe", wireframe);
      return { wireframe };
    }),
  toggleNight: () =>
    set((s) => {
      const night = !s.night;
      persist("cryosys.night", night);
      return { night };
    }),
  setWireframe: (wireframe) => set({ wireframe }),
  setNight: (night) => set({ night }),
  setPointerLocked: (pointerLocked) => set({ pointerLocked }),
  setLookHint: (lookHint) => set({ lookHint }),
}));

export function hydratePrefs() {
  try {
    const night = localStorage.getItem("cryosys.night") === "1";
    const wireframe = localStorage.getItem("cryosys.wireframe") === "1";
    useGame.setState({ night, wireframe });
  } catch {
    /* ignore */
  }
}
