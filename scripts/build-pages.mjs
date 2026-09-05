#!/usr/bin/env node
/**
 * Static GitHub Pages build for Cryoplane.
 * Skips Nitro (Vite 8 + nitro static bug) and uses TanStack Start's SPA prerender.
 */
import { spawn } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const viteBin = join(root, "node_modules/.bin/vite");
const wrapper = join(root, "scripts/with-app-env.mjs");

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: root,
      env: { ...process.env, ...env },
      stdio: "inherit",
    });
    child.on("exit", (code, signal) => {
      if (signal) reject(new Error(`killed by ${signal}`));
      else if (code) reject(new Error(`exit ${code}`));
      else resolve();
    });
  });
}

function sanitizeHtml(buf) {
  return Buffer.from(buf.toString("utf8").replace(/\0/g, ""), "utf8");
}

async function main() {
  for (const d of ["dist", "dist-pages", ".output"]) {
    const p = join(root, d);
    if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  }

  await run(process.execPath, [wrapper, viteBin, "build"], {
    SKIP_NITRO: "1",
    VITE_AUTH_ENABLED: "false",
  });

  const clientDir = join(root, "dist/client");
  const indexPath = join(clientDir, "index.html");
  if (!existsSync(indexPath)) {
    throw new Error("Missing dist/client/index.html after SPA prerender");
  }

  const clean = sanitizeHtml(readFileSync(indexPath));
  writeFileSync(indexPath, clean);
  writeFileSync(join(clientDir, "404.html"), clean);
  writeFileSync(join(clientDir, ".nojekyll"), "");

  const distPages = join(root, "dist-pages");
  const outPublic = join(root, ".output/public");
  rmSync(distPages, { recursive: true, force: true });
  mkdirSync(join(root, ".output"), { recursive: true });
  cpSync(clientDir, distPages, { recursive: true });
  cpSync(clientDir, outPublic, { recursive: true });

  console.log("[build-pages] OK");
  for (const f of ["index.html", "404.html", ".nojekyll", "assets", "favicon.svg"]) {
    const p = join(distPages, f);
    if (!existsSync(p)) throw new Error(`Missing publish file: ${f}`);
    const st = statSync(p);
    console.log(` - ${f}: ${st.isDirectory() ? "dir" : st.size + "B"}`);
  }
}

main().catch((err) => {
  console.error("[build-pages]", err);
  process.exit(1);
});
