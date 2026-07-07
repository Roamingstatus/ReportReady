#!/usr/bin/env node
/**
 * Capture marketing screenshots + short WebM clips for ReportReady.
 *
 * Starts the dev stack (unless CAPTURE_SKIP_SERVER=1), then records:
 *   - home, breakroom, print-sheet screenshots
 *   - home, breakroom, print-flow videos
 *
 * Usage: npm run capture:media
 */

import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BASE_URL = (process.env.CAPTURE_BASE_URL || "http://127.0.0.1:22838").replace(
  /\/$/,
  "",
);
const WEB_PORT = Number(process.env.PORT || 22838);
const API_PORT = Number(process.env.API_PORT || 3001);
const SKIP_SERVER = process.env.CAPTURE_SKIP_SERVER === "1";

const SCREENSHOTS_DIR = path.join(ROOT, "docs", "media", "screenshots");
const VIDEOS_DIR = path.join(ROOT, "docs", "media", "videos");

const VIEWPORT = { width: 1280, height: 720 };

fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
fs.mkdirSync(VIDEOS_DIR, { recursive: true });

let devProcess = null;

async function waitForUrl(url, attempts = 90) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await sleep(500);
  }
  throw new Error(`Server not ready at ${url}`);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanupPlaywrightVideoArtifacts() {
  for (const name of fs.readdirSync(VIDEOS_DIR)) {
    if (name.startsWith("page@") && name.endsWith(".webm")) {
      fs.unlinkSync(path.join(VIDEOS_DIR, name));
    }
  }
}

function startDevServer() {
  devProcess = spawn("bash", ["run-dev.sh"], {
    cwd: ROOT,
    stdio: "ignore",
    env: { ...process.env, PORT: String(WEB_PORT), API_PORT: String(API_PORT) },
  });
  devProcess.on("error", (err) => {
    console.error("[capture] run-dev.sh error:", err.message);
  });
}

function stopDevServer() {
  if (!devProcess) return;
  try {
    devProcess.kill("SIGTERM");
  } catch {
    /* ignore */
  }
  devProcess = null;
}

async function waitForPageReady(page, kind) {
  if (kind === "breakroom") {
    await page.locator("h1.breakroom-lounge-title").waitFor({ timeout: 60_000 });
    await page.getByText("Main feed").waitFor({ timeout: 15_000 });
    return;
  }

  if (kind === "sheet") {
    await page.locator("header").waitFor({ timeout: 60_000 });
    await sleep(2500);
    return;
  }

  await page.locator("header").waitFor({ timeout: 60_000 });
  await sleep(2500);
}

async function captureScreenshot(page, fileName) {
  const out = path.join(SCREENSHOTS_DIR, fileName);
  await page.screenshot({ path: out, fullPage: false });
  console.log(`[capture] screenshot → ${path.relative(ROOT, out)}`);
}

async function recordClip(browser, name, run) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: VIDEOS_DIR, size: VIEWPORT },
  });
  const page = await context.newPage();

  try {
    await run(page);
    await sleep(1200);
  } finally {
    const video = page.video();
    await context.close();
    if (video) {
      const dest = path.join(VIDEOS_DIR, `${name}.webm`);
      await video.saveAs(dest);
      cleanupPlaywrightVideoArtifacts();
      console.log(`[capture] video → ${path.relative(ROOT, dest)}`);
    }
  }
}

async function main() {
  console.log("[capture] ReportReady marketing media capture");
  console.log(`[capture] output: docs/media/`);

  if (!SKIP_SERVER) {
    console.log("[capture] Starting dev server (run-dev.sh)...");
    startDevServer();
    await sleep(2000);
  } else {
    console.log("[capture] CAPTURE_SKIP_SERVER=1 — using existing server");
  }

  await waitForUrl(`${BASE_URL}/`);
  await waitForUrl(`http://127.0.0.1:${API_PORT}/api/healthz`);
  console.log(`[capture] Server ready at ${BASE_URL}`);

  const browser = await chromium.launch({ headless: true });

  try {
    const staticPage = await browser.newPage({ viewport: VIEWPORT });

    await staticPage.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await waitForPageReady(staticPage, "home");
    await captureScreenshot(staticPage, "home.png");

    await staticPage.goto(`${BASE_URL}/breakroom`, {
      waitUntil: "networkidle",
      timeout: 60_000,
    });
    await waitForPageReady(staticPage, "breakroom");
    await captureScreenshot(staticPage, "breakroom.png");

    await staticPage.goto(`${BASE_URL}/sheets/quick-dirty`, {
      waitUntil: "domcontentloaded",
    });
    await waitForPageReady(staticPage, "sheet");
    await captureScreenshot(staticPage, "print-sheet.png");

    await staticPage.close();

    await recordClip(browser, "home", async (page) => {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await waitForPageReady(page, "home");
      await page.mouse.wheel(0, 400);
      await sleep(800);
      await page.mouse.wheel(0, -200);
    });

    await recordClip(browser, "breakroom", async (page) => {
      await page.goto(`${BASE_URL}/breakroom`, {
        waitUntil: "networkidle",
        timeout: 60_000,
      });
      await waitForPageReady(page, "breakroom");
      await page.mouse.wheel(0, 500);
      await sleep(600);
    });

    await recordClip(browser, "print-flow", async (page) => {
      await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
      await waitForPageReady(page, "home");
      await sleep(800);
      await page.goto(`${BASE_URL}/report-sheets`, { waitUntil: "domcontentloaded" });
      await waitForPageReady(page, "home");
      await sleep(1200);
      await page.goto(`${BASE_URL}/sheets/quick-dirty`, {
        waitUntil: "domcontentloaded",
      });
      await waitForPageReady(page, "sheet");
      await sleep(1000);
    });

    console.log("[capture] Done.");
  } finally {
    await browser.close();
    if (!SKIP_SERVER) stopDevServer();
  }
}

main().catch((error) => {
  console.error("[capture] Failed:", error.message);
  stopDevServer();
  process.exit(1);
});
