import { chromium } from "playwright";
import fs from "node:fs";

const url = process.argv[2] || "http://127.0.0.1:8080/";
const outDir = "/workspace/screenshots";
fs.mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (msg) => {
  if (msg.type() === "error") errors.push(msg.text());
});

await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(800);

const fly = page.getByRole("button", { name: /click to fly|resume flight/i });
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
if (afterThrust.speed < 4) {
  throw new Error(`thrust failed, speed=${afterThrust.speed}`);
}

await page.evaluate(() => {
  const t = window.__controlsTest;
  t.reset();
  t.setYaw(0);
  t.zeroVelocity();
  t.setKeys(["KeyW", "KeyA"]);
});
await page.waitForTimeout(200);
const beforeA = await page.evaluate(() => window.__controlsTest.getPosition());
await page.waitForTimeout(600);
const afterA = await page.evaluate(() => ({
  pos: window.__controlsTest.getPosition(),
  bank: window.__controlsTest.getBank(),
  yaw: window.__controlsTest.getYaw(),
}));

await page.evaluate(() => {
  const t = window.__controlsTest;
  t.reset();
  t.setYaw(0);
  t.zeroVelocity();
  t.setKeys(["KeyW", "KeyD"]);
});
await page.waitForTimeout(200);
const beforeD = await page.evaluate(() => window.__controlsTest.getPosition());
await page.waitForTimeout(600);
const afterD = await page.evaluate(() => ({
  pos: window.__controlsTest.getPosition(),
  bank: window.__controlsTest.getBank(),
  yaw: window.__controlsTest.getYaw(),
}));

await page.evaluate(() => window.__controlsTest.clearKeys());
await page.screenshot({ path: `${outDir}/play-after-controls.png` });

await page.keyboard.press("KeyF");
await page.waitForTimeout(400);
await page.screenshot({ path: `${outDir}/wireframe.png` });

await page.keyboard.press("KeyN");
await page.waitForTimeout(900);
await page.screenshot({ path: `${outDir}/night.png` });

await page.keyboard.press("KeyF");
await page.waitForTimeout(200);

const dxA = afterA.pos.x - beforeA.x;
const dxD = afterD.pos.x - beforeD.x;
const result = {
  errors,
  probeReady,
  afterThrust,
  left: { dx: dxA, bank: afterA.bank, yaw: afterA.yaw },
  right: { dx: dxD, bank: afterD.bank, yaw: afterD.yaw },
  pass: dxA < -1 && dxD > 1 && afterA.bank > 0.08 && afterD.bank < -0.08,
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
