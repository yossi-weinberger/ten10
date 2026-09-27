// Render review stills.
//   node tools/stills.mjs --lang he --t 1.2,5,9.5      → renders/stills/he_001.20.png …
//   node tools/stills.mjs --lang en --sheet 48          → renders/stills/en_sheet.png (contact sheet)
//   node tools/stills.mjs --lang he --times             → print the named scene times
//   node tools/stills.mjs --lang he --qa                → readability of every on-screen line
//   node tools/stills.mjs --lang he --style             → renders/stills/he_style_frames.png (brief §27 Stage B)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { openFilm } from "./browser.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const lang = arg("lang", "he");
const format = arg("format", "landscape");
const tag = format === "vertical" ? `${lang}v` : lang;
const out = path.join(root, "renders/stills");
fs.mkdirSync(out, { recursive: true });
const film = await openFilm(lang, { format });
console.log(`${lang}: duration ${film.info.duration.toFixed(2)}s, timing ${film.info.source}`);
if (process.argv.includes("--qa")) {
  // readability: seconds each headline group is fully on screen (once its reveal is legible)
  for (const r of await film.page.evaluate(() => window.__film.qa())) {
    console.log(`${r.readable < 1.0 ? "SHORT" : "ok   "} ${r.readable.toFixed(2)}s  ${r.in.toFixed(2)}→${r.out.toFixed(2)}  ${r.text}`);
  }
}
if (process.argv.includes("--times")) {
  for (const [k, v] of Object.entries(film.info.times)) console.log(k.padEnd(12), v.toFixed(2));
}
const ts = arg("t", null);
if (ts) {
  for (const t of ts.split(",").map(Number)) {
    await film.seek(t);
    const f = path.join(out, `${tag}_${t.toFixed(2).padStart(6, "0")}.png`);
    await film.page.screenshot({ path: f });
    console.log(f);
  }
}
const sheet = arg("sheet", null);
if (sheet) {
  const n = Number(sheet), cols = format === "vertical" ? 10 : 6, tw = format === "vertical" ? 180 : 320, th = format === "vertical" ? 320 : 180;
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
  const f = path.join(out, `${tag}_sheet.png`);
  await film.page.screenshot({ path: f, fullPage: true });
  console.log(f);
}
if (process.argv.includes("--style")) {
  const T = film.info.times;
  const frames = [
    ["Opening · 10%", T.s2 - 0.6], ["TEN10 reveal", T.tag + 0.9], ["Dashboard · Maaser + Chomesh", T.chomesh + 0.7],
    ["Import", T.s5 + 1.9], ["Halachic Library", T.tab2 + 0.7], ["Ask the Rabbi", T.rabbiWord + 0.45],
    ["One system", T.tInc + 0.3], ["Ending", T.url + 1.0],
  ];
  const shots = [];
  for (const [label, t] of frames) {
    await film.seek(t);
    shots.push({ label, t, b64: (await film.page.screenshot({ type: "jpeg", quality: 88 })).toString("base64") });
  }
  const tw = 640, th = 360;
  await film.page.setViewportSize({ width: 2 * tw + 60, height: 4 * (th + 44) + 90 });
  await film.page.setContent(`<body style="margin:0;padding:20px;background:#1c1b17;font:600 15px system-ui,sans-serif;color:#e8e4d8">
    <div style="font-size:20px;margin:0 0 14px 4px">TEN10 · style frames · ${lang.toUpperCase()}</div>
    <div style="display:grid;grid-template-columns:repeat(2,${tw}px);gap:14px 20px">${shots.map((x) =>
      `<div><img src="data:image/jpeg;base64,${x.b64}" style="width:${tw}px;height:${th}px;display:block;border-radius:6px">
       <div style="padding:6px 2px 0">${x.label} <span style="color:#8d887a;font-weight:400">· ${x.t.toFixed(2)}s</span></div></div>`).join("")}</div></body>`);
  const f = path.join(out, `${tag}_style_frames.png`);
  await film.page.screenshot({ path: f, fullPage: true });
  console.log(f);
}
await film.close();
