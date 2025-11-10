import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(() => {
  // This is a reliable way to detect if the build is running on Vercel.
  const isVercel = process.env.VERCEL === "1";

  // Detect if this is a Tauri build
  // When Tauri runs the build, it sets TAURI_ENV_PLATFORM
  const isTauriBuild = !!process.env.TAURI_ENV_PLATFORM;

  // Detect if this is a standalone CI build (not within Tauri)
  // We exclude Tauri modules ONLY if it's CI build AND NOT a Tauri build
  const isStandaloneCIBuild = process.env.CI === "true" && !isTauriBuild;

  return {
    base: "./",
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        manifest: {
          name: "Ten10",
          short_name: "Ten10",
          start_url: "/",
          display: "standalone",
          background_color: "#ffffff",
          theme_color: "#2563eb",
          icons: [
            {
              src: "/icon-192.png",
              sizes: "192x192",
              type: "image/png",
            },
            {
              src: "/icon-512.png",
              sizes: "512x512",
              type: "image/png",
            },
          ],
        },
        workbox: {
          maximumFileSizeToCacheInBytes: 5000000, // 5MB
        },
      }),
    ],
    optimizeDeps: {
      exclude: ["lucide-react"],
    },
    // VITAL: This configuration is crucial for building a hybrid Tauri (Desktop) + Vercel (Web) app.
    // THE PROBLEM:
    // - A 'tauri build' for desktop NEEDS to bundle the '@tauri-apps/' modules to function.
    // - A 'vercel build' for the web WILL FAIL if it tries to resolve '@tauri-apps/' modules,
    //   as they don't exist on the Vercel build servers and are irrelevant for a web-only deployment.
    // - A standalone 'npm run build' in CI (GitHub Actions) will also FAIL for the same reason.
    // THE SOLUTION:
    // We detect the build context:
    // - `VERCEL=1` → Vercel web build
    // - `CI=true` AND no `TAURI_ENV_PLATFORM` → Standalone CI build (before tauri-action)
    // - `TAURI_ENV_PLATFORM` is set → Tauri build (include modules even if CI=true)
    //
    // Exclude Tauri modules ONLY in web-only builds (Vercel or standalone CI).
    // Include them in ALL Tauri builds (local or CI doesn't matter).
    build: {
      rollupOptions: {
        // Exclude Tauri modules only in pure web builds
        external: isVercel || isStandaloneCIBuild ? [/^@tauri-apps\//] : [],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
