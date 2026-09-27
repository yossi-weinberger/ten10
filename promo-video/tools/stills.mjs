// Render review stills.
//   node tools/stills.mjs --lang he --t 1.2,5,9.5      → renders/stills/he_001.20.png …
//   node tools/stills.mjs --lang en --sheet 48          → renders/stills/en_sheet.png (contact sheet)
//   node tools/stills.mjs --lang he --times             → print the named scene times
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openFilm } from "./browser.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const lang = arg("lang", "he");
const out = path.join(root, "renders/stills");
fs.mkdirSync(out, { recursive: true });
const film = await openFilm(lang);
console.log(`${lang}: duration ${film.info.duration.toFixed(2)}s, timing ${film.info.source}`);
if (process.argv.includes("--times")) {
  for (const [k, v] of Object.entries(film.info.times)) console.log(k.padEnd(12), v.toFixed(2));
}
const ts = arg("t", null);
if (ts) {
  for (const t of ts.split(",").map(Number)) {
    await film.seek(t);
    const f = path.join(out, `${lang}_${t.toFixed(2).padStart(6, "0")}.png`);
    await film.page.screenshot({ path: f });
    console.log(f);
  }
}
const sheet = arg("sheet", null);
if (sheet) {
  const n = Number(sheet), cols = 6, tw = 320, th = 180;
  const shots = [];
  for (let i = 0; i < n; i++) {
    const t = (film.info.duration * (i + 0.5)) / n;
    await film.seek(t);
    shots.push({ t, b64: (await film.page.screenshot({ type: "jpeg", quality: 80 })).toString("base64") });
  }
  const rows = Math.ceil(n / cols);
  await film.page.setViewportSize({ width: cols * tw, height: rows * (th + 18) });
  await film.page.setContent(`<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(${cols},${tw}px);font:12px sans-serif;color:#ccc">${shots
    .map((s) => `<div><img src="data:image/jpeg;base64,${s.b64}" style="width:${tw}px;height:${th}px;display:block"><div style="height:18px;padding-left:4px">${s.t.toFixed(2)}s</div></div>`).join("")}</body>`);
  const f = path.join(out, `${lang}_sheet.png`);
  await film.page.screenshot({ path: f, fullPage: true });
  console.log(f);
}
await film.close();
