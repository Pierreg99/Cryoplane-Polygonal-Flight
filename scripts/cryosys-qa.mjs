import { chromium } from "playwright";
import fs from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const outDir = "/workspace/screenshots";
fs.mkdirSync(outDir, { recursive: true });

const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto(url, { waitUntil: "networkidle" });
const fly = page.getByRole("button", { name: /click to fly|resume flight/i });
await fly.waitFor({ timeout: 8000 });
await fly.click();
await page.waitForTimeout(1200);
await page.screenshot({ path: `${outDir}/play.png` });

const probeReady = await page.evaluate(() => Boolean(window.__controlsTest));
if (!probeReady) throw new Error("window.__controlsTest missing");

await page.evaluate(() => {
  const t = window.__controlsTest;
  t.start();
  t.reset();
  t.setYaw(0);
  t.setKeys(["KeyW"]);
});
await page.waitForTimeout(700);
const afterThrust = await page.evaluate(() => {
  const t = window.__controlsTest;
  return { speed: t.getSpeed(), pos: t.getPosition(), yaw: t.getYaw() };
});
if (afterThrust.speed < 8) {
  throw new Error(`thrust failed, speed=${afterThrust.speed}`);
}

await page.evaluate(() => {
  const t = window.__controlsTest;
  t.reset();
  t.setYaw(0);
  t.setKeys(["KeyW", "KeyA"]);
});
await page.waitForTimeout(150);
const beforeA = await page.evaluate(() => ({
  yaw: window.__controlsTest.getYaw(),
  x: window.__controlsTest.getPosition().x,
}));
await page.waitForTimeout(550);
const afterA = await page.evaluate(() => ({
  yaw: window.__controlsTest.getYaw(),
  bank: window.__controlsTest.getBank(),
  x: window.__controlsTest.getPosition().x,
}));

await page.evaluate(() => {
  const t = window.__controlsTest;
  t.reset();
  t.setYaw(0);
  t.setKeys(["KeyW", "KeyD"]);
});
await page.waitForTimeout(150);
const beforeD = await page.evaluate(() => ({
  yaw: window.__controlsTest.getYaw(),
  x: window.__controlsTest.getPosition().x,
}));
await page.waitForTimeout(550);
const afterD = await page.evaluate(() => ({
  yaw: window.__controlsTest.getYaw(),
  bank: window.__controlsTest.getBank(),
  x: window.__controlsTest.getPosition().x,
}));

await page.evaluate(() => window.__controlsTest.clearKeys());
await page.screenshot({ path: `${outDir}/play-after-controls.png` });

const dYawA = wrap(afterA.yaw - beforeA.yaw);
const dYawD = wrap(afterD.yaw - beforeD.yaw);
const result = {
  errors,
  probeReady,
  afterThrust,
  left: { dYaw: dYawA, bank: afterA.bank, dx: afterA.x - beforeA.x },
  right: { dYaw: dYawD, bank: afterD.bank, dx: afterD.x - beforeD.x },
  pass: dYawA > 0.05 && dYawD < -0.05 && afterA.bank > 0.08 && afterD.bank < -0.08,
};

console.log(JSON.stringify(result, null, 2));
if (!result.pass) {
  console.error("CONTROLS FAIL");
  process.exit(1);
}
if (errors.length) {
  console.error("CONSOLE ERRORS");
  process.exit(1);
}

await browser.close();
