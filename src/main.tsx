import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./routes";
import { ThemeProvider } from "./lib/theme";
import { PlatformProvider } from "./contexts/PlatformContext";
import { TWAProvider } from "./contexts/TWAContext";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";
import "./lib/i18n";
import { unregisterServiceWorkersInTauri } from "./lib/utils/serviceWorkerUtils";

// Clean up any stale service workers in Tauri environment
unregisterServiceWorkersInTauri();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="Ten10-ui-theme">
      <PlatformProvider>
        <TWAProvider>
          <AuthProvider>
            <RouterProvider router={router} />
            <Toaster position="top-center" />
            <SpeedInsights />
          </AuthProvider>
        </TWAProvider>
      </PlatformProvider>
    </ThemeProvider>
  </StrictMode>
);
