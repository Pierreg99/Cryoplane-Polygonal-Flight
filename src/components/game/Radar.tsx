import { useEffect, useRef } from "react";
import { hostiles } from "@/game/combat";
import { flyer } from "@/game/flyer";
import { mission } from "@/game/mission";
import { RUNWAY } from "@/game/terrain";
import { traffic } from "@/game/traffic";

const RANGE = 260;
const SIZE = 128;

function token(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

export function Radar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    let id = 0;
    const tick = () => {
      draw(ctx);
      id = requestAnimationFrame(tick);
    };
    id = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="pointer-events-none absolute top-[5.5rem] left-3 sm:top-auto sm:bottom-8 sm:left-4">
      <canvas
        ref={canvasRef}
        width={SIZE}
        height={SIZE}
        className="cryo-radar-chrome size-28 rounded-full border border-border/60 bg-surface/80 sm:size-32"
        aria-label="Heading-up radar"
      />
      <p className="mt-1 text-center font-mono text-xs tracking-widest text-subtle uppercase">
        Radar {RANGE}m
      </p>
    </div>
  );
}

function draw(ctx: CanvasRenderingContext2D) {
  const accent = token("--color-accent", "#9ec4d4");
  const danger = token("--color-danger", "#c9867a");
  const fg = token("--color-fg", "#e8eef2");
  const muted = token("--color-subtle", "#6b7680");
  const border = token("--color-border", "#2a333b");
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r = SIZE / 2 - 4;

  ctx.clearRect(0, 0, SIZE, SIZE);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();

  ctx.fillStyle = "rgba(7, 9, 12, 0.55)";
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.strokeStyle = border;
  ctx.lineWidth = 1;
  for (const k of [0.33, 0.66, 1]) {
    ctx.beginPath();
    ctx.arc(cx, cy, r * k, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx, cy + r);
  ctx.moveTo(cx - r, cy);
  ctx.lineTo(cx + r, cy);
  ctx.stroke();

  const sweep = (flyer.simTime * 1.15) % (Math.PI * 2);
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.arc(cx, cy, r, sweep - 0.55, sweep);
  ctx.closePath();
  ctx.fillStyle = "rgba(158, 196, 212, 0.08)";
  ctx.fill();

  plot(ctx, RUNWAY.x, RUNWAY.z, muted, 3, "runway");
  mission.rings.forEach((ring, i) => {
    if (ring.hit) return;
    plot(ctx, ring.x, ring.z, i === mission.index ? accent : muted, i === mission.index ? 3.2 : 2.2, "ring");
  });
  for (const t of traffic) {
    plot(ctx, t.x, t.z, muted, 2, "dot");
  }
  for (const h of hostiles) {
    if (!h.live) continue;
    plot(ctx, h.x, h.z, danger, 3.1, "hostile");
  }

  ctx.fillStyle = fg;
  ctx.beginPath();
  ctx.moveTo(cx, cy - 6);
  ctx.lineTo(cx - 4, cy + 5);
  ctx.lineTo(cx + 4, cy + 5);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function plot(
  ctx: CanvasRenderingContext2D,
  wx: number,
  wz: number,
  color: string,
  size: number,
  kind: "dot" | "ring" | "runway" | "hostile",
) {
  const p = worldToRadar(wx, wz);
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  const r = SIZE / 2 - 4;
  const scale = r / RANGE;
  let x = cx + p.right * scale;
  let y = cy - p.fwd * scale;
  const dist = Math.hypot(x - cx, y - cy);
  if (dist > r - 2) {
    const k = (r - 2) / dist;
    x = cx + (x - cx) * k;
    y = cy + (y - cy) * k;
  }
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  if (kind === "ring") {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.stroke();
  } else if (kind === "runway") {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-flyer.yaw);
    ctx.fillRect(-1.5, -6, 3, 12);
    ctx.restore();
  } else {
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }
}

function worldToRadar(wx: number, wz: number) {
  const dx = wx - flyer.x;
  const dz = wz - flyer.z;
  const sy = Math.sin(flyer.yaw);
  const cy = Math.cos(flyer.yaw);
  const fx = -sy;
  const fz = -cy;
  const rx = cy;
  const rz = -sy;
  return {
    fwd: dx * fx + dz * fz,
    right: dx * rx + dz * rz,
  };
}
