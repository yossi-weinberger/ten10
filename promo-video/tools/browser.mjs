// Shared headless-Chromium helpers for stills + render.
import { chromium } from "playwright-core";
import fs from "node:fs";
import { startServer } from "./serve.mjs";

export function chromiumPath() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const candidates = [
    "/opt/pw-browsers/chromium-1194/chrome-linux/chrome",
    "/opt/pw-browsers/chromium/chrome-linux/chrome",
    "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/google-chrome",
  ];
  return candidates.find((p) => fs.existsSync(p));
}

/** Opens the film page for `lang` and waits until it is ready to seek. */
export async function openFilm(lang, { scale = 1, format = "landscape", cut = "film" } = {}) {
  const vertical = format === "vertical";
  const server = await startServer(0);
  const { port } = server.address();
  const browser = await chromium.launch({
    executablePath: chromiumPath(),
    args: ["--font-render-hinting=none", "--disable-lcd-text", "--force-color-profile=srgb", "--hide-scrollbars"],
  });
  const page = await browser.newPage({ viewport: vertical ? { width: 1080, height: 1920 } : { width: 1920, height: 1080 }, deviceScaleFactor: scale });
  page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") console.log(`[page ${m.type()}]`, m.text()); });
  page.on("pageerror", (e) => console.log("[page error]", e.message));
  page.on("response", (r) => { if (r.status() >= 400) console.log(`[http ${r.status()}]`, r.url()); });
  await page.goto(`http://127.0.0.1:${port}/promo-video/film/?lang=${lang}&format=${format}&cut=${cut}&render=1`);
  await page.waitForFunction(() => window.__film && (window.__film.ready || window.__film.error), null, { timeout: 60000 });
  const err = await page.evaluate(() => window.__film.error);
  if (err) throw new Error(err);
  const info = await page.evaluate(() => ({ range: window.__film.range, duration: window.__film.duration, times: window.__film.times, source: window.__film.timingSource }));
  const seek = async (t) => {
    await page.evaluate((tt) => window.__film.seek(tt), t);
    // let images decode / layout settle for this frame
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
  };
  const close = async () => { await browser.close(); server.close(); };
  return { page, info, seek, close };
}
