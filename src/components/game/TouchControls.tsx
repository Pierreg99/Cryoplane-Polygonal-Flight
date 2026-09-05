import { useRef, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Crosshair, Layers } from "lucide-react";
import { axes } from "@/game/input";
import { useGame } from "@/game/store";
import { cn } from "@/lib/utils";

/** Flash Fin–assisted dual-zone touch HUD: frost glass stick, look pad, fire cluster. */
export function TouchControls() {
  const phase = useGame((s) => s.phase);
  if (phase !== "play") return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 touch-none select-none sm:hidden">
      <Stick className="pointer-events-auto absolute bottom-[max(1.75rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))]" />
      <LookPad />
      <div className="pointer-events-auto absolute right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1.75rem,env(safe-area-inset-bottom))] flex flex-col items-end gap-2.5">
        <HoldButton
          aria-label="Fire"
          size="lg"
          onHold={(held) => {
            axes.firing = held;
          }}
          className="border-danger/50 bg-danger/25 text-danger shadow-[0_0_18px_rgba(201,134,122,0.25)] active:bg-danger/40"
        >
          <Crosshair className="size-6" />
        </HoldButton>
        <div className="flex gap-2">
          <HoldButton
            aria-label="Climb"
            onHold={(held) => {
              axes.touchLift = held ? 1 : 0;
            }}
          >
            <ArrowUp className="size-5" />
          </HoldButton>
          <HoldButton
            aria-label="Descend"
            onHold={(held) => {
              axes.touchLift = held ? -1 : 0;
            }}
          >
            <ArrowDown className="size-5" />
          </HoldButton>
        </div>
        <button
          type="button"
          aria-label="Cycle fly mode"
          className="flex h-11 min-w-11 items-center justify-center gap-1 rounded-md border border-border/60 bg-surface/55 px-2.5 font-mono text-xs text-fg backdrop-blur-md transition-[transform,background-color] duration-150 active:scale-95 active:bg-elevated"
          onPointerDown={(e) => {
            e.preventDefault();
            useGame.getState().cycleMode();
          }}
        >
          <Layers className="size-3.5 text-accent" />
          Mode
        </button>
      </div>
    </div>
  );
}

function Stick({ className }: { className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const knob = useRef<HTMLDivElement>(null);
  const pid = useRef<number | null>(null);
  const [active, setActive] = useState(false);

  const update = (clientX: number, clientY: number) => {
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let x = (clientX - cx) / (r.width / 2);
    let y = (clientY - cy) / (r.height / 2);
    const m = Math.hypot(x, y);
    if (m > 1) {
      x /= m;
      y /= m;
    }
    // Soft radial deadzone so tiny taps don't bank.
    const dz = 0.14;
    if (m < dz) {
      x = 0;
      y = 0;
    } else {
      const scale = (m - dz) / (1 - dz) / Math.max(m, 1e-6);
      x *= scale;
      y *= scale;
    }
    axes.touchMoveX = x;
    axes.touchMoveY = y;
    if (knob.current) {
      knob.current.style.transform = `translate(${x * 34}px, ${y * 34}px)`;
    }
  };

  const end = () => {
    pid.current = null;
    setActive(false);
    axes.touchMoveX = 0;
    axes.touchMoveY = 0;
    if (knob.current) knob.current.style.transform = "translate(0,0)";
  };

  return (
    <div
      ref={root}
      className={cn(
        "relative size-[7.5rem] rounded-full border border-border/55 bg-surface/45 shadow-[inset_0_0_24px_rgba(158,196,212,0.08)] backdrop-blur-md transition-[border-color,box-shadow] duration-150",
        active && "border-accent/55 shadow-[0_0_22px_rgba(158,196,212,0.22),inset_0_0_28px_rgba(158,196,212,0.12)]",
        className,
      )}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        e.preventDefault();
        pid.current = e.pointerId;
        setActive(true);
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pid.current !== e.pointerId) return;
        update(e.clientX, e.clientY);
      }}
      onPointerUp={end}
      onPointerCancel={end}
      role="presentation"
      aria-label="Throttle and bank stick"
    >
      <div className="pointer-events-none absolute inset-[18%] rounded-full border border-border/35" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-px w-10 -translate-x-1/2 -translate-y-1/2 bg-border/50" />
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-10 w-px -translate-x-1/2 -translate-y-1/2 bg-border/50" />
      <div
        ref={knob}
        className={cn(
          "absolute left-1/2 top-1/2 size-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/85 shadow-[0_0_16px_rgba(158,196,212,0.45)] transition-shadow duration-150",
          active && "bg-accent shadow-[0_0_22px_rgba(158,196,212,0.7)]",
        )}
      />
    </div>
  );
}

function LookPad() {
  const last = useRef<{ x: number; y: number } | null>(null);
  const [dragging, setDragging] = useState(false);

  return (
    <div
      className={cn(
        "pointer-events-auto absolute top-24 right-0 h-[52%] w-[46%] rounded-l-2xl border border-transparent transition-[border-color,background-color,box-shadow] duration-150",
        dragging
          ? "border-accent/40 bg-accent/10 shadow-[inset_0_0_40px_rgba(158,196,212,0.12)]"
          : "bg-transparent",
      )}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        e.preventDefault();
        last.current = { x: e.clientX, y: e.clientY };
        setDragging(true);
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!last.current) return;
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };
        // Mild ease-out curve so micro jitter is quieter than sweeps.
        const gain = 0.92;
        axes.touchLookX += dx * gain;
        axes.touchLookY += dy * gain;
      }}
      onPointerUp={() => {
        last.current = null;
        setDragging(false);
      }}
      onPointerCancel={() => {
        last.current = null;
        setDragging(false);
      }}
      aria-label="Look pad"
    >
      {dragging ? (
        <span className="pointer-events-none absolute top-2 right-3 font-mono text-[10px] tracking-widest text-accent/80 uppercase">
          Look
        </span>
      ) : null}
    </div>
  );
}

function HoldButton({
  children,
  onHold,
  "aria-label": label,
  className,
  size = "md",
}: {
  children: ReactNode;
  onHold: (held: boolean) => void;
  "aria-label": string;
  className?: string;
  size?: "md" | "lg";
}) {
  const [held, setHeld] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={held}
      className={cn(
        "flex items-center justify-center rounded-md border border-border/60 bg-surface/55 text-fg backdrop-blur-md transition-[transform,background-color,box-shadow] duration-150 active:scale-95",
        size === "lg" ? "size-14" : "size-12",
        held && "ring-1 ring-accent/40",
        className,
      )}
      style={{ touchAction: "none" }}
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        setHeld(true);
        onHold(true);
      }}
      onPointerUp={() => {
        setHeld(false);
        onHold(false);
      }}
      onPointerCancel={() => {
        setHeld(false);
        onHold(false);
      }}
    >
      {children}
    </button>
  );
}
