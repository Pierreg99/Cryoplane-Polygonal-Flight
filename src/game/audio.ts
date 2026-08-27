import { combat } from "./combat";
import { flyer } from "./flyer";
import { mission } from "./mission";
import { useGame } from "./store";

type Ctx = AudioContext;

let ctx: Ctx | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let engBus: GainNode | null = null;
let engineOsc: OscillatorNode | null = null;
let engineFilt: BiquadFilterNode | null = null;
let engineGain: GainNode | null = null;
let windSrc: AudioBufferSourceNode | null = null;
let windFilt: BiquadFilterNode | null = null;
let windGain: GainNode | null = null;
let stallGain: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
let started = false;
let lastHits = 0;
let lastKills = 0;
let lastRings = 0;
let lastLand = 0;
let lastCool = 0;
let wasCrash = false;
let scrapeGate = 0;

function AC(): Ctx {
  const C = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  return new C({ latencyHint: "interactive" });
}

function makeNoise(c: Ctx) {
  const n = Math.floor(c.sampleRate * 1.2);
  const buf = c.createBuffer(1, n, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function ramp(g: GainNode, v: number, t = 0.04) {
  if (!ctx) return;
  g.gain.setTargetAtTime(Math.max(0, v), ctx.currentTime, t);
}

export function unlockAudio() {
  if (!ctx) {
    ctx = AC();
    master = ctx.createGain();
    sfxBus = ctx.createGain();
    engBus = ctx.createGain();
    sfxBus.gain.value = 0.7;
    engBus.gain.value = 0.55;
    sfxBus.connect(master);
    engBus.connect(master);
    master.connect(ctx.destination);
    noiseBuf = makeNoise(ctx);
    startBeds(ctx);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") ctx?.resume();
    });
  }
  if (ctx.state === "suspended") ctx.resume();
  started = true;
  applyMute(useGame.getState().muted);
}

function startBeds(c: Ctx) {
  engineOsc = c.createOscillator();
  engineOsc.type = "sawtooth";
  engineOsc.frequency.value = 72;
  engineFilt = c.createBiquadFilter();
  engineFilt.type = "lowpass";
  engineFilt.frequency.value = 420;
  engineFilt.Q.value = 0.7;
  engineGain = c.createGain();
  engineGain.gain.value = 0;
  engineOsc.connect(engineFilt);
  engineFilt.connect(engineGain);
  engineGain.connect(engBus!);
  engineOsc.start();

  windSrc = c.createBufferSource();
  windSrc.buffer = noiseBuf;
  windSrc.loop = true;
  windFilt = c.createBiquadFilter();
  windFilt.type = "bandpass";
  windFilt.frequency.value = 900;
  windFilt.Q.value = 0.55;
  windGain = c.createGain();
  windGain.gain.value = 0;
  windSrc.connect(windFilt);
  windFilt.connect(windGain);
  windGain.connect(engBus!);
  windSrc.start();

  const stallSrc = c.createBufferSource();
  stallSrc.buffer = noiseBuf;
  stallSrc.loop = true;
  const stallF = c.createBiquadFilter();
  stallF.type = "lowpass";
  stallF.frequency.value = 140;
  stallGain = c.createGain();
  stallGain.gain.value = 0;
  stallSrc.connect(stallF);
  stallF.connect(stallGain);
  stallGain.connect(sfxBus!);
  stallSrc.start();
}

export function applyMute(muted: boolean) {
  if (!master || !ctx) return;
  ramp(master, muted ? 0 : 1, 0.06);
}

function blip(freq: number, dur: number, type: OscillatorType, gain: number, detune = 0) {
  if (!ctx || !sfxBus) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq * (1 + detune);
  g.gain.value = 0;
  o.connect(g);
  g.connect(sfxBus);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.start(t);
  o.stop(t + dur + 0.02);
  o.onended = () => {
    o.disconnect();
    g.disconnect();
  };
}

function noiseBurst(dur: number, gain: number, hipass: number) {
  if (!ctx || !sfxBus || !noiseBuf) return;
  const src = ctx.createBufferSource();
  src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter();
  f.type = "highpass";
  f.frequency.value = hipass;
  const g = ctx.createGain();
  g.gain.value = 0;
  src.connect(f);
  f.connect(g);
  g.connect(sfxBus);
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(gain, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.start(t);
  src.stop(t + dur + 0.03);
  src.onended = () => {
    src.disconnect();
    f.disconnect();
    g.disconnect();
  };
}

function sfxFire() {
  noiseBurst(0.09, 0.28, 1800);
  blip(420 + Math.random() * 80, 0.07, "square", 0.09, (Math.random() - 0.5) * 0.08);
}

function sfxHit() {
  noiseBurst(0.12, 0.22, 400);
  blip(90, 0.16, "triangle", 0.16);
}

function sfxKill() {
  blip(55, 0.35, "sine", 0.22);
  noiseBurst(0.28, 0.3, 200);
  blip(220, 0.18, "triangle", 0.1);
}

function sfxRing() {
  blip(880, 0.22, "sine", 0.14);
  blip(1320, 0.16, "sine", 0.08);
}

function sfxLand() {
  blip(140, 0.2, "sine", 0.12);
  noiseBurst(0.18, 0.12, 600);
}

function sfxCrash() {
  noiseBurst(0.7, 0.45, 80);
  blip(42, 0.55, "sine", 0.28);
}

function sfxScrape() {
  noiseBurst(0.14, 0.1, 900);
}

export function tickAudio(playing: boolean) {
  if (!started || !ctx || !engineOsc || !engineFilt || !engineGain || !windGain || !windFilt || !stallGain) return;
  if (ctx.state === "suspended") return;

  const live = playing && !flyer.crashed;
  const rpm = live ? 68 + flyer.throttle * 110 + flyer.airspeed * 0.55 : 48;
  engineOsc.frequency.setTargetAtTime(rpm, ctx.currentTime, 0.08);
  engineFilt.frequency.setTargetAtTime(280 + flyer.throttle * 520 + flyer.airspeed * 2.2, ctx.currentTime, 0.1);
  ramp(engineGain, live ? 0.045 + flyer.throttle * 0.09 + flyer.airspeed * 0.0007 : 0, 0.08);

  const wind = live ? Math.min(0.14, flyer.speed * 0.0014 + flyer.stall * 0.08) : 0;
  ramp(windGain, wind, 0.1);
  windFilt.frequency.setTargetAtTime(700 + flyer.speed * 8, ctx.currentTime, 0.12);
  ramp(stallGain, live && flyer.stall > 0.25 ? flyer.stall * 0.16 : 0, 0.08);

  if (combat.playerCool > lastCool + 0.02) sfxFire();
  lastCool = combat.playerCool;
  if (combat.hits > lastHits) sfxHit();
  lastHits = combat.hits;
  if (combat.kills > lastKills) sfxKill();
  lastKills = combat.kills;
  if (mission.scored > lastRings) sfxRing();
  lastRings = mission.scored;
  if (mission.landings > lastLand) sfxLand();
  lastLand = mission.landings;
  if (flyer.crashed && !wasCrash) sfxCrash();
  wasCrash = flyer.crashed;
  scrapeGate = Math.max(0, scrapeGate - 0.016);
  if (live && flyer.scraping > 0.35 && scrapeGate <= 0) {
    sfxScrape();
    scrapeGate = 0.18;
  }
}

export function resetAudioCues() {
  lastHits = combat.hits;
  lastKills = combat.kills;
  lastRings = mission.scored;
  lastLand = mission.landings;
  lastCool = combat.playerCool;
  wasCrash = flyer.crashed;
}
