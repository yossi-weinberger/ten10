import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./routes";
import { ThemeProvider } from "./lib/theme";
import { PlatformProvider } from "./contexts/PlatformContext";
import { TWAProvider } from "./contexts/TWAContext";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import { AuthProvider } from "./contexts/AuthContext";
import posthog from "posthog-js";
import { PostHogProvider } from "posthog-js/react";
import "./index.css";
import "./lib/i18n";
import { unregisterServiceWorkersInTauri } from "./lib/utils/serviceWorkerUtils";

// Clean up any stale service workers in Tauri environment
unregisterServiceWorkersInTauri();

const posthogKey = import.meta.env.VITE_PUBLIC_POSTHOG_PROJECT_TOKEN;

if (posthogKey) {
  posthog.init(posthogKey, {
    api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
    capture_pageview: false,
    capture_pageleave: true,
  });

  router.subscribe("onResolved", () => {
    posthog.capture("$pageview");
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <PostHogProvider client={posthog}>
      <ThemeProvider defaultTheme="system" storageKey="Ten10-ui-theme">
        <PlatformProvider>
          <TWAProvider>
            <AuthProvider>
              <RouterProvider router={router} />
              <Toaster position="top-center" />
              <SpeedInsights />
              <Analytics />
            </AuthProvider>
          </TWAProvider>
        </PlatformProvider>
      </ThemeProvider>
    </PostHogProvider>
  </StrictMode>
);
