import { chromium } from "playwright";
const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle" });
await page.waitForTimeout(700);
await page.getByRole("button", { name: /click to fly/i }).click();
await page.waitForTimeout(1000);
await page.screenshot({ path: "/workspace/screenshots/play-mobile.png" });
await browser.close();
console.log("ok");
