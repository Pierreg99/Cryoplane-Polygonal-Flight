export const WORLD = 980;
export const SEGS = 72;
export const SEA_LEVEL = 2.4;
export const MAX_HEIGHT = 96;
export const SPAWN = { x: 28, y: 52, z: 210 };
export const CLEARANCE = 3.4;
export const MAX_SPEED = 78;
export const THRUST = 48;
export const STRAFE = 28;
export const LIFT = 26;
export const DRAG = 0.72;
export const LOOK_SENS = 0.00215;
export const PITCH_LIMIT = 1.35;
export const FOLLOW_DIST = 14.5;
export const FOLLOW_HEIGHT = 4.8;
export const FOG_NEAR = 90;
export const FOG_FAR = 740;
export const SEED = 0xc4e05;
export const PHYS_STEP = 1 / 60;

export const BANDS = {
  deep: 0x143c4a,
  fjord: 0x2f7a88,
  ice: 0x8fb9c8,
  pack: 0xd4e6ee,
  snow: 0xf3f7f9,
  alpine: 0xc4d0d6,
  peak: 0xffffff,
  rock: 0x6a6158,
  scree: 0x7d766c,
} as const;
