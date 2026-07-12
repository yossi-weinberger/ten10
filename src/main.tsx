import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
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
import {
  capturePostHogPageview,
  initPostHog,
  isPostHogSupported,
} from "./lib/analytics/posthogClient";
import { registerSW } from "virtual:pwa-register";
import "./index.css";
import "./lib/i18n";
import { logger } from "./lib/logger";
import { unregisterServiceWorkersInTauri } from "./lib/utils/serviceWorkerUtils";

// Clean up any stale service workers in Tauri environment
unregisterServiceWorkersInTauri();

// Register the PWA service worker with a custom error handler. Some web clients
// (observed on Chrome/Windows) reject navigator.serviceWorker.register() with a
// bare "Error: Rejected". The SW is non-load-bearing on web (no precaching;
// offline is desktop-only via SQLite), so we log and swallow the rejection instead
// of letting it surface as an uncaught exception in error tracking.
// Note: in Tauri builds the PWA plugin is disabled, so registerSW is a no-op.
registerSW({
  onRegisterError(error) {
    logger.warn("[PWA] Service worker registration failed:", error);
  },
});

if (isPostHogSupported()) {
  initPostHog();
  capturePostHogPageview();
  router.subscribe("onResolved", capturePostHogPageview);
}

const appTree = (
  <ThemeProvider defaultTheme="system" storageKey="Ten10-ui-theme">
    <PlatformProvider>
      <TWAProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <SpeedInsights />
          <Analytics />
        </AuthProvider>
      </TWAProvider>
    </PlatformProvider>
  </ThemeProvider>
);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    {isPostHogSupported() ? (
      <PostHogProvider client={posthog}>{appTree}</PostHogProvider>
    ) : (
      appTree
    )}
  </StrictMode>
);
