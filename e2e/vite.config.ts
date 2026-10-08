import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const e2eDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(e2eDir, "..");

export default defineConfig({
  root: e2eDir,
  publicDir: path.join(repoRoot, "public"),
  plugins: [react()],
  define: {
    "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://e2e.invalid"),
    "import.meta.env.VITE_SUPABASE_ANON_KEY": JSON.stringify("e2e-anon-key"),
    "import.meta.env.VITE_APP_VERSION": JSON.stringify("e2e"),
  },
  css: {
    postcss: path.join(repoRoot, "postcss.config.js"),
  },
  resolve: {
    alias: {
      "@": path.join(repoRoot, "src"),
    },
  },
  server: {
    port: 4177,
    strictPort: true,
  },
});
