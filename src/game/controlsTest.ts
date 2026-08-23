import { flyer, resetFlyer } from "./flyer";
import { clearInjectedKeys, setInjectedKeys } from "./input";
import { useGame } from "./store";

export type ControlsProbe = {
  getYaw: () => number;
  getSpeed: () => number;
  getPosition: () => { x: number; y: number; z: number };
  getPitch: () => number;
  getBank: () => number;
  getPhase: () => string;
  start: () => void;
  setKeys: (codes: string[]) => void;
  setSteer: (v: number) => void;
  setYaw: (yaw: number) => void;
  zeroVelocity: () => void;
  reset: () => void;
  clearKeys: () => void;
};

declare global {
  interface Window {
    __controlsTest?: ControlsProbe;
  }
}

export function installControlsTest() {
  if (typeof window === "undefined") return;
  window.__controlsTest = {
    getYaw: () => flyer.yaw,
    getSpeed: () => flyer.speed,
    getPitch: () => flyer.pitch,
    getBank: () => flyer.bank,
    getPosition: () => ({ x: flyer.x, y: flyer.y, z: flyer.z }),
    getPhase: () => useGame.getState().phase,
    start: () => useGame.getState().setPhase("play"),
    setKeys: (codes) => setInjectedKeys(codes),
    setSteer: (v) => {
      if (v > 0.2) setInjectedKeys(["KeyA"]);
      else if (v < -0.2) setInjectedKeys(["KeyD"]);
      else clearInjectedKeys();
    },
    setYaw: (yaw) => {
      flyer.yaw = yaw;
    },
    zeroVelocity: () => {
      flyer.vx = 0;
      flyer.vy = 0;
      flyer.vz = 0;
    },
    reset: () => resetFlyer(),
    clearKeys: () => clearInjectedKeys(),
  };
}
