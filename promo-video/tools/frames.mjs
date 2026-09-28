// Style frames (brief §27 Stage B) → renders/frames/<lang>_frame<N>.png + a contact sheet.
//   node tools/frames.mjs --lang he
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import { chromiumPath } from "./browser.mjs";
import { startServer } from "./serve.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const lang = arg("lang", "he");
const out = path.join(root, "renders/frames");
fs.mkdirSync(out, { recursive: true });
const server = await startServer(0);
const browser = await chromium.launch({ executablePath: chromiumPath(), args: ["--font-render-hinting=none", "--force-color-profile=srgb"] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on("pageerror", (e) => console.log("[page error]", e.message));
for (let n = 1; n <= 5; n++) {
  await page.goto(`http://127.0.0.1:${server.address().port}/promo-video/film/frames.html?lang=${lang}&frame=${n}`);
  await page.waitForFunction(() => window.__ready, null, { timeout: 30000 });
  const err = await page.evaluate(() => window.__err);
  if (err) { console.log(`frame ${n}:`, err); continue; }
  const f = path.join(out, `${lang}_frame${n}.png`);
  await (await page.$("#c")).screenshot({ path: f });
  console.log(f);
}
await browser.close(); server.close();
