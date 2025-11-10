import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(() => {
  // This is a reliable way to detect if the build is running on Vercel.
  const isVercel = process.env.VERCEL === "1";

  // Detect if this is a CI build (GitHub Actions or similar)
  // CI builds that run 'npm run build' standalone need to exclude Tauri modules
  const isCIBuild = process.env.CI === "true";

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
    // - `process.env.VERCEL === "1"` → Vercel web build
    // - `process.env.CI === "true"` → CI standalone build (GitHub Actions before tauri-action runs)
    // - Neither flag set → Local development or Tauri build context
    //
    // If it's Vercel OR CI standalone build, we mark Tauri modules as 'external' (ignore them).
    // Otherwise (local Tauri build), we allow Vite to bundle Tauri modules normally.
    build: {
      rollupOptions: {
        // Exclude Tauri modules in web builds (Vercel) or standalone CI builds (GitHub Actions)
        external: isVercel || isCIBuild ? [/^@tauri-apps\//] : [],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
