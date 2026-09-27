// Frame-accurate render: seeks the film frame by frame in headless Chromium and
// pipes PNG frames straight into ffmpeg (no temp frames on disk).
//
//   node tools/render.mjs --lang he                 → renders/he/video.mp4 + renders/he/sfx-cues.json
//   node tools/render.mjs --lang en --fps 30 --crf 16
//   node tools/render.mjs --lang he --from 12 --to 20   (partial render for review)
//   --format vertical   1080×1920 composition (renders/<lang>-vertical/)
//   --cut symbols       the feature scenes without app screens (renders/<lang>[-vertical]-symbols/, its own range)
//   --workers 3   parallel headless browsers (frames are independent, segments are concatenated losslessly)
//
// Then mix + mux the soundtrack with tools/audio/mix.py (see README).
import fs from "node:fs";
import path from "node:path";
import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { openFilm } from "./browser.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const lang = arg("lang", "he");
const fps = Number(arg("fps", 30));
const crf = String(arg("crf", 16));
const format = arg("format", "landscape");
const cut = arg("cut", "film");
const outDir = path.join(root, "renders", (format === "vertical" ? `${lang}-vertical` : lang) + (cut === "film" ? "" : `-${cut}`));
fs.mkdirSync(outDir, { recursive: true });

function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try { execFileSync("ffmpeg", ["-version"], { stdio: "ignore" }); return "ffmpeg"; } catch { /* fall through */ }
  return execFileSync("python3", ["-c", "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"]).toString().trim();
}

const workers = Math.max(1, Number(arg("workers", 3)));
const probe = await openFilm(lang, { format, cut });
const dur = probe.info.duration;
const from = Number(arg("from", probe.info.range[0]));
const to = Math.min(dur, Number(arg("to", probe.info.range[1])));
const n = Math.round((to - from) * fps);
const outFile = path.join(outDir, arg("out", from === probe.info.range[0] && to === probe.info.range[1] ? "video.mp4" : `video_${from}-${to}.mp4`));
console.log(`${lang}: ${dur.toFixed(2)}s film (timing: ${probe.info.source}) → ${n} frames @ ${fps}fps, ${workers} workers → ${path.relative(root, outFile)}`);

// sound-design cue sheet for tools/audio/mix.py
const cues = await probe.page.evaluate(() => window.__film.cues());
fs.writeFileSync(path.join(outDir, "sfx-cues.json"), JSON.stringify(cues, null, 1));
fs.writeFileSync(path.join(outDir, "times.json"), JSON.stringify({ duration: dur, range: [from, to], fps, times: probe.info.times }, null, 1));
await probe.close();

const FF = ffmpegPath();
const encArgs = ["-c:v", "libx264", "-preset", "slow", "-crf", crf, "-pix_fmt", "yuv420p",
  "-profile:v", "high", "-tune", "animation",
  "-color_primaries", "bt709", "-color_trc", "bt709", "-colorspace", "bt709"];

/** Renders frames [a, b) into its own H.264 segment. */
async function renderSegment(k, a, b, file) {
  const film = await openFilm(lang, { format, cut });
  const ff = spawn(FF, ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(fps), "-c:v", "png", "-i", "-", ...encArgs, file],
    { stdio: ["pipe", "inherit", "inherit"] });
  const done = new Promise((res, rej) => ff.on("close", (c) => (c === 0 ? res() : rej(new Error(`ffmpeg exited ${c}`)))));
  const t0 = Date.now();
  for (let i = a; i < b; i++) {
    await film.seek(from + i / fps);
    const buf = await film.page.screenshot({ type: "png" });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once("drain", r));
    const d = i - a + 1;
    if (d % 150 === 0 || i === b - 1) {
      const el = (Date.now() - t0) / 1000;
      console.log(`  [w${k}] ${d}/${b - a}  ${((el / d) * 1000).toFixed(0)}ms/frame  eta ${(((b - a - d) * el) / d).toFixed(0)}s`);
    }
  }
  ff.stdin.end();
  await done;
  await film.close();
}

const t0 = Date.now();
const segs = [];
for (let k = 0; k < workers; k++) {
  const a = Math.round((n * k) / workers), b = Math.round((n * (k + 1)) / workers);
  if (b > a) segs.push({ k, a, b, file: path.join(outDir, `.seg${k}.mp4`) });
}
await Promise.all(segs.map((sg) => renderSegment(sg.k, sg.a, sg.b, sg.file)));
const list = path.join(outDir, ".segs.txt");
fs.writeFileSync(list, segs.map((sg) => `file '${sg.file}'`).join("\n"));
execFileSync(FF, ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", "-movflags", "+faststart", outFile]);
for (const sg of segs) fs.rmSync(sg.file);
fs.rmSync(list);
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(0)}s → ${outFile}`);
