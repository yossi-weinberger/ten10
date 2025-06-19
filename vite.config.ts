import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(() => {
  // This is a reliable way to detect if the build is running on Vercel.
  const isVercel = process.env.VERCEL === "1";

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
    // THE SOLUTION:
    // We reliably detect if the build is running on Vercel by checking `process.env.VERCEL`.
    // - If it IS a Vercel build (`isVercel` is true), we mark all Tauri modules as 'external'.
    //   This tells Vite to ignore them, preventing the web build from breaking.
    // - If it is NOT a Vercel build (i.e., a local `tauri build`), we provide an empty 'external'
    //   array, which allows Vite to correctly bundle all necessary Tauri modules for the desktop app.
    build: {
      rollupOptions: {
        // If on Vercel, exclude Tauri modules. Otherwise (local build), include them.
        external: isVercel ? [/^@tauri-apps\//] : [],
      },
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
