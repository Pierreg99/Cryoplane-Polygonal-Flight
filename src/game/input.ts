const GAME_KEYS = new Set([
  "KeyW",
  "KeyA",
  "KeyS",
  "KeyD",
  "KeyF",
  "KeyN",
  "KeyC",
  "Space",
  "ShiftLeft",
  "ShiftRight",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Escape",
]);

const held = new Set<string>();
const injected = new Set<string>();
const prevHeld = new Set<string>();

export const axes = {
  lookAccumX: 0,
  lookAccumY: 0,
  touchMoveX: 0,
  touchMoveY: 0,
  touchLookX: 0,
  touchLookY: 0,
  touchLift: 0,
  dragging: false,
};

let abort: AbortController | null = null;

function has(code: string): boolean {
  return held.has(code) || injected.has(code);
}

export function setInjectedKeys(codes: string[]) {
  injected.clear();
  for (const c of codes) injected.add(c);
}

export function clearInjectedKeys() {
  injected.clear();
}

export function isDown(code: string): boolean {
  return has(code);
}

export function justPressed(code: string): boolean {
  return has(code) && !prevHeld.has(code);
}

export function snapshotHeld() {
  prevHeld.clear();
  for (const c of held) prevHeld.add(c);
  for (const c of injected) prevHeld.add(c);
}

export function consumeLook(): { x: number; y: number } {
  const x = axes.lookAccumX + axes.touchLookX;
  const y = axes.lookAccumY + axes.touchLookY;
  axes.lookAccumX = 0;
  axes.lookAccumY = 0;
  axes.touchLookX = 0;
  axes.touchLookY = 0;
  return { x, y };
}

function radialDeadzone(x: number, y: number, dz = 0.16) {
  const m = Math.hypot(x, y);
  if (m < dz) return { x: 0, y: 0 };
  const scale = (m - dz) / (1 - dz) / m;
  return { x: x * scale, y: y * scale };
}

export type Actions = {
  thrust: number;
  strafe: number;
  lift: number;
  wireframe: boolean;
  night: boolean;
  pause: boolean;
};

export function readActions(): Actions {
  let thrust = 0;
  let strafe = 0;
  let lift = 0;
  if (has("KeyW") || has("ArrowUp")) thrust += 1;
  if (has("KeyS") || has("ArrowDown")) thrust -= 1;
  if (has("KeyA") || has("ArrowLeft")) strafe -= 1;
  if (has("KeyD") || has("ArrowRight")) strafe += 1;
  if (has("Space")) lift += 1;
  if (has("ShiftLeft") || has("ShiftRight") || has("KeyC")) lift -= 1;

  thrust += -axes.touchMoveY;
  strafe += axes.touchMoveX;
  lift += axes.touchLift;

  if (typeof navigator !== "undefined" && navigator.getGamepads) {
    const pads = navigator.getGamepads();
    const pad = pads[0];
    if (pad) {
      const l = radialDeadzone(pad.axes[0] ?? 0, pad.axes[1] ?? 0);
      const r = radialDeadzone(pad.axes[2] ?? 0, pad.axes[3] ?? 0);
      strafe += l.x;
      thrust += -l.y;
      axes.lookAccumX += r.x * 8;
      axes.lookAccumY += r.y * 8;
      if (pad.buttons[0]?.pressed) lift += 1;
      if (pad.buttons[1]?.pressed) lift -= 1;
    }
  }

  return {
    thrust: clamp(thrust, -1, 1),
    strafe: clamp(strafe, -1, 1),
    lift: clamp(lift, -1, 1),
    wireframe: justPressed("KeyF"),
    night: justPressed("KeyN"),
    pause: justPressed("Escape"),
  };
}

function clamp(v: number, a: number, b: number) {
  return Math.min(b, Math.max(a, v));
}

function onKeyDown(e: KeyboardEvent) {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  if (GAME_KEYS.has(e.code)) e.preventDefault();
  held.add(e.code);
}

function onKeyUp(e: KeyboardEvent) {
  held.delete(e.code);
}

function onBlur() {
  held.clear();
  axes.touchMoveX = 0;
  axes.touchMoveY = 0;
  axes.touchLift = 0;
  axes.dragging = false;
}

export function attachInput(target: HTMLElement) {
  detachInput();
  abort = new AbortController();
  const { signal } = abort;

  window.addEventListener("keydown", onKeyDown, { signal });
  window.addEventListener("keyup", onKeyUp, { signal });
  window.addEventListener("blur", onBlur, { signal });
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.hidden) onBlur();
    },
    { signal },
  );

  target.addEventListener(
    "pointermove",
    (e) => {
      if (document.pointerLockElement === target) {
        axes.lookAccumX += e.movementX;
        axes.lookAccumY += e.movementY;
      } else if (axes.dragging && e.pointerType !== "touch") {
        axes.lookAccumX += e.movementX;
        axes.lookAccumY += e.movementY;
      }
    },
    { signal },
  );

  target.addEventListener(
    "pointerdown",
    (e) => {
      if (e.pointerType === "mouse" && e.button === 0) axes.dragging = true;
    },
    { signal },
  );
  window.addEventListener(
    "pointerup",
    () => {
      axes.dragging = false;
    },
    { signal },
  );
  window.addEventListener(
    "pointercancel",
    () => {
      axes.dragging = false;
    },
    { signal },
  );
}

export function detachInput() {
  abort?.abort();
  abort = null;
  held.clear();
  axes.dragging = false;
}
