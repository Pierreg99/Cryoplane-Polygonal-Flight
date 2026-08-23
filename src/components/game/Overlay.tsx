import { useEffect, useRef, type ReactNode } from "react";
import { Gauge, Mountain, Pause, Play, Sun, Moon, BoxSelect } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hud } from "@/game/hud";
import { useGame } from "@/game/store";
import { cn } from "@/lib/utils";

export function Overlay({ onPlay }: { onPlay: () => void }) {
  const phase = useGame((s) => s.phase);
  const showMenu = phase === "start" || phase === "paused" || phase === "boot";

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 text-fg",
        showMenu ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <Hud visible={phase === "play" || phase === "paused"} />
      {showMenu && <Menu onPlay={onPlay} />}
      {phase === "play" && <Crosshair />}
    </div>
  );
}

function Menu({ onPlay }: { onPlay: () => void }) {
  const phase = useGame((s) => s.phase);
  const paused = phase === "paused";
  const night = useGame((s) => s.night);
  const wireframe = useGame((s) => s.wireframe);
  const toggleNight = useGame((s) => s.toggleNight);
  const toggleWireframe = useGame((s) => s.toggleWireframe);

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-end justify-center overflow-y-auto bg-bg/55 sm:items-center">
      <div
        className="m-3 mb-safe w-full max-w-lg rounded-xl border border-border bg-surface p-4 shadow-lg sm:m-4 sm:p-6"
        role="dialog"
        aria-labelledby="cryosys-title"
      >
        <p className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
          Polar continent
        </p>
        <h1
          id="cryosys-title"
          className="mt-1 font-display text-3xl font-semibold tracking-tight text-balance sm:text-5xl"
        >
          CryoSys
        </h1>
        <p className="mt-2 max-w-md text-sm leading-normal text-muted text-pretty">
          Fly a low-poly ice sheet with mouse look and keyboard thrust. Height
          paints the land. Wireframe and day/night lighting stay readable.
        </p>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-xs text-subtle sm:grid-cols-3">
          <div>
            <dt className="text-fg">W / S</dt>
            <dd>Thrust / brake</dd>
          </div>
          <div>
            <dt className="text-fg">A / D</dt>
            <dd>Strafe left / right</dd>
          </div>
          <div>
            <dt className="text-fg">Mouse</dt>
            <dd>Look</dd>
          </div>
          <div>
            <dt className="text-fg">Space / Shift</dt>
            <dd>Climb / descend</dd>
          </div>
          <div>
            <dt className="text-fg">F</dt>
            <dd>Wireframe</dd>
          </div>
          <div>
            <dt className="text-fg">N</dt>
            <dd>Day / night</dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Button type="button" size="lg" onClick={onPlay} className="w-full sm:w-auto">
            <Play className="size-4" />
            {paused ? "Resume flight" : "Click to fly"}
          </Button>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={toggleWireframe}
              aria-pressed={wireframe}
            >
              <BoxSelect className="size-4" />
              {wireframe ? "Solid" : "Wire"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={toggleNight}
              aria-pressed={night}
            >
              {night ? <Sun className="size-4" /> : <Moon className="size-4" />}
              {night ? "Day" : "Night"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Hud({ visible }: { visible: boolean }) {
  const altRef = useRef<HTMLSpanElement>(null);
  const spdRef = useRef<HTMLSpanElement>(null);
  const scrapeRef = useRef<HTMLDivElement>(null);
  const night = useGame((s) => s.night);
  const wireframe = useGame((s) => s.wireframe);
  const pointerLocked = useGame((s) => s.pointerLocked);
  const toggleNight = useGame((s) => s.toggleNight);
  const toggleWireframe = useGame((s) => s.toggleWireframe);
  const setPhase = useGame((s) => s.setPhase);

  useEffect(() => {
    let id = 0;
    const tick = () => {
      if (altRef.current) altRef.current.textContent = hud.altitude.toFixed(0);
      if (spdRef.current) spdRef.current.textContent = hud.speed.toFixed(0);
      if (scrapeRef.current) {
        scrapeRef.current.style.opacity = String(Math.min(1, hud.scraping));
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={cn(
        "absolute inset-0 p-3 pt-safe sm:p-4",
        !visible && "hidden",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="pointer-events-none flex items-center gap-3 rounded-md border border-border bg-surface/90 px-3 py-1.5 font-mono text-sm">
          <Metric icon={<Mountain className="size-3.5" />} label="Alt">
            <span ref={altRef} className="tabular-nums">
              0
            </span>
            <span className="text-subtle">m</span>
          </Metric>
          <span className="h-4 w-px bg-border" />
          <Metric icon={<Gauge className="size-3.5" />} label="Spd">
            <span ref={spdRef} className="tabular-nums">
              0
            </span>
            <span className="text-subtle">m/s</span>
          </Metric>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={wireframe ? "Solid shading" : "Wireframe"}
            aria-pressed={wireframe}
            onClick={toggleWireframe}
          >
            <BoxSelect className="size-4" />
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label={night ? "Switch to day" : "Switch to night"}
            aria-pressed={night}
            onClick={toggleNight}
          >
            {night ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="icon"
            aria-label="Pause"
            onClick={() => {
              document.exitPointerLock?.();
              setPhase("paused");
            }}
          >
            <Pause className="size-4" />
          </Button>
        </div>
      </div>
      {!pointerLocked && visible && (
        <p className="pointer-events-none mt-2 hidden font-mono text-xs tracking-wide text-muted sm:block">
          Drag to look · WASD thrust
        </p>
      )}
      <div
        ref={scrapeRef}
        className="pointer-events-none absolute inset-x-0 bottom-32 flex justify-center opacity-0 sm:bottom-8"
      >
        <span className="rounded-sm border border-danger/40 bg-surface px-3 py-1 font-mono text-xs tracking-wide text-danger uppercase">
          Terrain contact
        </span>
      </div>
    </div>
  );
}

function Metric({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="flex items-center gap-1 text-xs tracking-widest text-subtle uppercase">
        {icon}
        {label}
      </span>
      <span className="font-medium text-fg">{children}</span>
    </div>
  );
}

function Crosshair() {
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 size-3 -translate-x-1/2 -translate-y-1/2">
      <div className="absolute left-1/2 top-0 h-full w-px -translate-x-1/2 bg-fg/70" />
      <div className="absolute top-1/2 left-0 h-px w-full -translate-y-1/2 bg-fg/70" />
    </div>
  );
}
