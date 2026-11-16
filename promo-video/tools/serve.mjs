// Minimal static server for the film. It serves only promo-video/ and public/ (the app's own brand assets:
// fonts, logos, locales) from the repository, never dotfiles such as .env, and listens on 127.0.0.1 only.
//   node tools/serve.mjs [--port 5178]
//   → http://localhost:5178/promo-video/film/?lang=he
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SERVED = ["promo-video", "public"].map((d) => path.join(repoRoot, d) + path.sep);
const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml",
  ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp",
  ".ttf": "font/ttf", ".woff2": "font/woff2", ".wav": "audio/wav", ".mp3": "audio/mpeg",
  ".m4a": "audio/mp4", ".mp4": "video/mp4",
};

export function startServer(port = 0) {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url, "http://x");
    let file;
    try { file = path.resolve(repoRoot, "." + decodeURIComponent(url.pathname)); } catch { res.writeHead(400).end(); return; }
    const parts = path.relative(repoRoot, file).split(path.sep);
    if (!SERVED.some((d) => (file + path.sep).startsWith(d)) || parts.some((p) => p.startsWith(".") || p === "node_modules")) {
      res.writeHead(403).end(); return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404).end("not found"); return; }
      res.writeHead(200, {
        "Content-Type": MIME[path.extname(file).toLowerCase()] || "application/octet-stream",
        "Cache-Control": "no-store",
      });
      res.end(data);
    });
  });
  return new Promise((resolve) => server.listen(port, "127.0.0.1", () => resolve(server)));
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const i = process.argv.indexOf("--port");
  const server = await startServer(i > 0 ? Number(process.argv[i + 1]) : 5178);
  const { port } = server.address();
  console.log(`TEN10 promo preview:\n  http://localhost:${port}/promo-video/film/?lang=he\n  http://localhost:${port}/promo-video/film/?lang=en`);
}
