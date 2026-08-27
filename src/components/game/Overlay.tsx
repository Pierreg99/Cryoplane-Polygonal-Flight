import { useEffect, useRef, type ReactNode } from "react";
import {
  Gauge,
  Mountain,
  Pause,
  Play,
  Sun,
  Moon,
  BoxSelect,
  Compass,
  Shield,
  Crosshair as CrosshairIcon,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  MAPS,
  MAP_ORDER,
  MODES,
  MODE_ORDER,
  PLANES,
  PLANE_ORDER,
  type MapId,
  type PlaneId,
} from "@/game/catalog";
import { resetCombat } from "@/game/combat";
import { resetFlyer } from "@/game/flyer";
import { hud } from "@/game/hud";
import { resetMission } from "@/game/mission";
import { useGame } from "@/game/store";
import { rebuildTraffic } from "@/game/traffic";
import { Radar } from "@/components/game/Radar";
import { cn } from "@/lib/utils";

export function Overlay({
  onPlay,
  onRestart,
}: {
  onPlay: () => void;
  onRestart: () => void;
}) {
  const phase = useGame((s) => s.phase);
  const booting = phase === "boot";
  const showMenu = phase === "start" || phase === "paused";

  return (
    <div
      className={cn(
        "absolute inset-0 z-20 text-fg",
        booting || showMenu || phase === "crashed"
          ? "pointer-events-auto"
          : "pointer-events-none",
      )}
    >
      {booting && <BootScreen />}
      <Hud visible={phase === "play" || phase === "paused"} />
      {showMenu && <Menu onPlay={onPlay} />}
      {phase === "crashed" && <CrashScreen onRestart={onRestart} />}
      {phase === "play" && <Crosshair />}
      {phase === "play" && <Radar />}
    </div>
  );
}

function BootScreen() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-bg">
      <div className="w-full max-w-sm px-6 text-center">
        <p className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
          Polar flight
        </p>
        <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight">
          Cryoplane
        </h1>
        <p className="mt-3 font-mono text-xs tracking-wide text-muted">
          Aligning gyro
        </p>
        <div
          className="mt-5 h-1 overflow-hidden rounded-full bg-elevated"
          role="progressbar"
          aria-label="Loading world"
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="boot-bar h-full rounded-full bg-accent" />
        </div>
      </div>
    </div>
  );
}

function CrashScreen({ onRestart }: { onRestart: () => void }) {
  const setPhase = useGame((s) => s.setPhase);
  return (
    <div className="absolute inset-0 flex items-end justify-center bg-bg/70 sm:items-center">
      <div
        className="m-3 mb-safe w-full max-w-md rounded-xl border border-border bg-surface p-5 shadow-lg sm:p-6"
        role="alertdialog"
        aria-labelledby="crash-title"
      >
        <p className="font-mono text-xs font-medium tracking-widest text-danger uppercase">
          Hull lost
        </p>
        <h2 id="crash-title" className="mt-1 font-display text-3xl font-semibold tracking-tight">
          Downed
        </h2>
        <p className="mt-2 text-sm leading-normal text-muted">
          Impact or fire took the airframe. Relight from the strip or return to
          the hangar to change the build.
        </p>
        <p className="mt-3 font-mono text-xs text-subtle">
          Kills {hud.kills} · Rings {hud.rings}
        </p>
        <div className="mt-5 flex flex-col gap-2 sm:flex-row">
          <Button type="button" size="lg" onClick={onRestart} className="w-full sm:w-auto">
            <RotateCcw className="size-4" />
            Relight
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="lg"
            onClick={() => setPhase("start")}
            className="w-full sm:w-auto"
          >
            Hangar
          </Button>
        </div>
      </div>
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
  const planeId = useGame((s) => s.planeId);
  const mapId = useGame((s) => s.mapId);
  const flyMode = useGame((s) => s.flyMode);
  const armor = useGame((s) => s.armor);
  const guns = useGame((s) => s.guns);
  const engine = useGame((s) => s.engine);
  const setPlane = useGame((s) => s.setPlane);
  const setMap = useGame((s) => s.setMap);
  const setMode = useGame((s) => s.setMode);
  const setArmor = useGame((s) => s.setArmor);
  const setGuns = useGame((s) => s.setGuns);
  const setEngine = useGame((s) => s.setEngine);

  const pickMap = (id: MapId) => {
    setMap(id);
    resetMission(id);
    rebuildTraffic();
    resetCombat();
    resetFlyer(planeId, id);
  };
  const pickPlane = (id: PlaneId) => {
    setPlane(id);
    resetFlyer(id, mapId);
  };

  const plane = PLANES[planeId];

  return (
    <div className="pointer-events-auto absolute inset-0 flex items-end justify-center overflow-y-auto bg-bg/55 sm:items-center">
      <div
        className="m-3 mb-safe w-full max-w-2xl rounded-xl border border-border bg-surface p-4 shadow-lg sm:m-4 sm:p-6"
        role="dialog"
        aria-labelledby="cryoplane-title"
      >
        <p className="font-mono text-xs font-medium tracking-widest text-accent uppercase">
          Polar hangar
        </p>
        <h1
          id="cryoplane-title"
          className="mt-1 font-display text-3xl font-semibold tracking-tight text-balance sm:text-5xl"
        >
          Cryoplane
        </h1>
        <p className="mt-2 max-w-lg text-sm leading-normal text-muted text-pretty">
          Fit the airframe, pick a shelf, then fly. Bank left on A. Combat mode
          hunts interceptors — hold R to fire. Radar marks rings and bandits.
          Land slow on the strip.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_14rem]">
          <div>
            <HangarRow label="Map">
              {MAP_ORDER.map((id) => (
                <Chip
                  key={id}
                  active={mapId === id}
                  title={MAPS[id].name}
                  sub={MAPS[id].tag}
                  onClick={() => pickMap(id)}
                />
              ))}
            </HangarRow>
            <HangarRow label="Plane">
              {PLANE_ORDER.map((id) => (
                <Chip
                  key={id}
                  active={planeId === id}
                  title={PLANES[id].name}
                  sub={PLANES[id].tag}
                  onClick={() => pickPlane(id)}
                />
              ))}
            </HangarRow>
            <HangarRow label="Mode">
              {MODE_ORDER.map((id) => (
                <Chip
                  key={id}
                  active={flyMode === id}
                  title={MODES[id].name}
                  sub={MODES[id].tag}
                  onClick={() => setMode(id)}
                />
              ))}
            </HangarRow>
          </div>
          <aside className="rounded-md border border-border bg-bg p-3">
            <p className="font-mono text-xs tracking-widest text-subtle uppercase">
              Airframe
            </p>
            <p className="mt-1 text-sm font-medium">{plane.name}</p>
            <p className="font-mono text-xs text-subtle">{plane.tag}</p>
            <div className="mt-3 space-y-2">
              <StatBar label="Speed" value={plane.maxSpeed / 128} />
              <StatBar label="Turn" value={plane.turn / 1.85} />
              <StatBar label="Thrust" value={plane.thrust / 52} />
              <StatBar label="Stall" value={1 - plane.stall / 32} />
            </div>
            <p className="mt-4 font-mono text-xs tracking-widest text-subtle uppercase">
              Build
            </p>
            <TierRow label="Armor" value={armor} onChange={setArmor} />
            <TierRow label="Guns" value={guns} onChange={setGuns} />
            <TierRow label="Engine" value={engine} onChange={setEngine} />
          </aside>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono text-xs text-subtle sm:grid-cols-3">
          <div>
            <dt className="text-fg">W / S</dt>
            <dd>Throttle</dd>
          </div>
          <div>
            <dt className="text-fg">A / D</dt>
            <dd>Bank left / right</dd>
          </div>
          <div>
            <dt className="text-fg">R / click</dt>
            <dd>Fire</dd>
          </div>
          <div>
            <dt className="text-fg">Space / Shift</dt>
            <dd>Pitch / hover</dd>
          </div>
          <div>
            <dt className="text-fg">2</dt>
            <dd>Combat mode</dd>
          </div>
          <div>
            <dt className="text-fg">Radar</dt>
            <dd>You · rings · bandits</dd>
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

function StatBar({ label, value }: { label: string; value: number }) {
  const w = Math.max(0.08, Math.min(1, value));
  return (
    <div>
      <div className="flex justify-between font-mono text-xs text-subtle">
        <span>{label}</span>
      </div>
      <div className="mt-0.5 h-1 overflow-hidden rounded-full bg-elevated">
        <div className="h-full rounded-full bg-accent" style={{ width: `${w * 100}%` }} />
      </div>
    </div>
  );
}

function TierRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="mt-2 flex items-center justify-between gap-2">
      <span className="font-mono text-xs text-muted">{label}</span>
      <div className="flex gap-1">
        {[0, 1, 2].map((n) => (
          <button
            key={n}
            type="button"
            aria-label={`${label} ${n}`}
            aria-pressed={value === n}
            onClick={() => onChange(n)}
            className={cn(
              "size-7 rounded-sm border font-mono text-xs",
              value === n
                ? "border-accent bg-elevated text-fg"
                : "border-border bg-surface text-subtle hover:text-fg",
            )}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

function HangarRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="mb-1.5 font-mono text-xs tracking-widest text-subtle uppercase">
        {label}
      </p>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

function Chip({
  active,
  title,
  sub,
  onClick,
}: {
  active: boolean;
  title: string;
  sub: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "min-h-11 rounded-sm border px-2.5 py-1.5 text-left transition-colors duration-[var(--motion-quick)]",
        active
          ? "border-accent bg-elevated text-fg"
          : "border-border bg-bg text-muted hover:bg-elevated hover:text-fg",
      )}
    >
      <span className="block text-xs font-medium">{title}</span>
      <span className="block font-mono text-xs text-subtle">{sub}</span>
    </button>
  );
}

function Hud({ visible }: { visible: boolean }) {
  const altRef = useRef<HTMLSpanElement>(null);
  const spdRef = useRef<HTMLSpanElement>(null);
  const modeRef = useRef<HTMLSpanElement>(null);
  const wpRef = useRef<HTMLSpanElement>(null);
  const hullRef = useRef<HTMLDivElement>(null);
  const killRef = useRef<HTMLSpanElement>(null);
  const scrapeRef = useRef<HTMLDivElement>(null);
  const stallRef = useRef<HTMLDivElement>(null);
  const night = useGame((s) => s.night);
  const wireframe = useGame((s) => s.wireframe);
  const pointerLocked = useGame((s) => s.pointerLocked);
  const toggleNight = useGame((s) => s.toggleNight);
  const toggleWireframe = useGame((s) => s.toggleWireframe);
  const cycleMode = useGame((s) => s.cycleMode);
  const setPhase = useGame((s) => s.setPhase);

  useEffect(() => {
    let id = 0;
    const tick = () => {
      if (altRef.current) altRef.current.textContent = hud.altitude.toFixed(0);
      if (spdRef.current) spdRef.current.textContent = hud.speed.toFixed(0);
      if (modeRef.current) modeRef.current.textContent = hud.mode;
      if (wpRef.current) wpRef.current.textContent = hud.wpDist.toFixed(0);
      if (killRef.current) killRef.current.textContent = String(hud.kills);
      if (hullRef.current) {
        hullRef.current.style.width = `${Math.max(0, Math.min(1, hud.hull)) * 100}%`;
      }
      if (scrapeRef.current) {
        scrapeRef.current.style.opacity = String(Math.min(1, hud.scraping));
      }
      if (stallRef.current) {
        stallRef.current.style.opacity = String(hud.stall > 0.35 ? hud.stall : 0);
      }
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className={cn("absolute inset-0 p-3 pt-safe sm:p-4", !visible && "hidden")}>
      <div className="flex items-start justify-between gap-3">
        <div className="pointer-events-none flex flex-wrap items-center gap-3 rounded-md border border-border bg-surface/90 px-3 py-1.5 font-mono text-sm">
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
          <span className="hidden h-4 w-px bg-border sm:block" />
          <Metric icon={<Compass className="size-3.5" />} label="Wp">
            <span ref={wpRef} className="tabular-nums">
              0
            </span>
            <span className="text-subtle">m</span>
          </Metric>
          <span className="hidden h-4 w-px bg-border sm:block" />
          <Metric icon={<CrosshairIcon className="size-3.5" />} label="K">
            <span ref={killRef} className="tabular-nums">
              0
            </span>
          </Metric>
        </div>
        <div className="pointer-events-auto flex items-center gap-2">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={cycleMode}
            aria-label="Cycle fly mode"
          >
            <span ref={modeRef} className="font-mono text-xs">
              Cruise
            </span>
          </Button>
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
      <div className="pointer-events-none mt-2 flex items-center gap-2">
        <Shield className="size-3.5 text-subtle" />
        <div className="h-1 w-28 overflow-hidden rounded-full bg-elevated">
          <div ref={hullRef} className="h-full rounded-full bg-accent" style={{ width: "100%" }} />
        </div>
      </div>
      {!pointerLocked && visible && (
        <p className="pointer-events-none mt-2 hidden font-mono text-xs tracking-wide text-muted sm:block">
          Drag to look · WASD to fly · R fire · M mode
        </p>
      )}
      <div
        ref={stallRef}
        className="pointer-events-none absolute inset-x-0 bottom-40 flex justify-center opacity-0 sm:bottom-16"
      >
        <span className="rounded-sm border border-border bg-surface px-3 py-1 font-mono text-xs tracking-wide text-muted uppercase">
          Stall
        </span>
      </div>
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