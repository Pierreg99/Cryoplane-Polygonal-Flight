import { useRef, type ReactNode } from "react";
import { ArrowDown, ArrowUp, Crosshair } from "lucide-react";
import { axes } from "@/game/input";
import { useGame } from "@/game/store";
import { cn } from "@/lib/utils";

export function TouchControls() {
  const phase = useGame((s) => s.phase);
  if (phase !== "play") return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-20 sm:hidden">
      <Stick className="pointer-events-auto absolute bottom-[max(1.5rem,env(safe-area-inset-bottom))] left-4" />
      <LookPad />
      <div className="pointer-events-auto absolute right-4 bottom-[max(1.5rem,env(safe-area-inset-bottom))] flex flex-col gap-2">
        <HoldButton
          aria-label="Fire"
          onHold={(held) => {
            axes.firing = held;
          }}
        >
          <Crosshair className="size-5" />
        </HoldButton>
        <HoldButton aria-label="Climb" onHold={(held) => (axes.touchLift = held ? 1 : 0)}>
          <ArrowUp className="size-5" />
        </HoldButton>
        <HoldButton
          aria-label="Descend"
          onHold={(held) => (axes.touchLift = held ? -1 : 0)}
        >
          <ArrowDown className="size-5" />
        </HoldButton>
        <button
          type="button"
          aria-label="Cycle fly mode"
          className="flex h-11 min-w-11 items-center justify-center rounded-md border border-border bg-surface px-2 font-mono text-xs text-fg"
          onPointerDown={(e) => {
            e.preventDefault();
            useGame.getState().cycleMode();
          }}
        >
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
    axes.touchMoveX = x;
    axes.touchMoveY = y;
    if (knob.current) {
      knob.current.style.transform = `translate(${x * 22}px, ${y * 22}px)`;
    }
  };

  const end = () => {
    pid.current = null;
    axes.touchMoveX = 0;
    axes.touchMoveY = 0;
    if (knob.current) knob.current.style.transform = "translate(0,0)";
  };

  return (
    <div
      ref={root}
      className={cn(
        "relative size-28 rounded-full border border-border bg-surface/80",
        className,
      )}
      onPointerDown={(e) => {
        pid.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => {
        if (pid.current !== e.pointerId) return;
        update(e.clientX, e.clientY);
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        ref={knob}
        className="absolute left-1/2 top-1/2 size-11 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/80"
      />
    </div>
  );
}

function LookPad() {
  const last = useRef<{ x: number; y: number } | null>(null);
  return (
    <div
      className="pointer-events-auto absolute top-24 right-0 h-[55%] w-[48%]"
      onPointerDown={(e) => {
        last.current = { x: e.clientX, y: e.clientY };
        e.currentTarget.setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!last.current) return;
        const dx = e.clientX - last.current.x;
        const dy = e.clientY - last.current.y;
        last.current = { x: e.clientX, y: e.clientY };
        axes.touchLookX += dx;
        axes.touchLookY += dy;
      }}
      onPointerUp={() => {
        last.current = null;
      }}
      onPointerCancel={() => {
        last.current = null;
      }}
      aria-hidden
    />
  );
}

function HoldButton({
  children,
  onHold,
  "aria-label": label,
}: {
  children: ReactNode;
  onHold: (held: boolean) => void;
  "aria-label": string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="flex size-12 items-center justify-center rounded-md border border-border bg-surface text-fg"
      onPointerDown={(e) => {
        e.preventDefault();
        e.currentTarget.setPointerCapture(e.pointerId);
        onHold(true);
      }}
      onPointerUp={() => onHold(false)}
      onPointerCancel={() => onHold(false)}
    >
      {children}
    </button>
  );
}
