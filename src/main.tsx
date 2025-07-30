import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./routes";
import { ThemeProvider } from "./lib/theme";
import { PlatformProvider } from "./contexts/PlatformContext";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { AuthProvider } from "./contexts/AuthContext";
import { StagewiseToolbar } from "@stagewise/toolbar-react";
import "./index.css";
import "./lib/i18n";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="Ten10-ui-theme">
      <PlatformProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster position="top-center" />
          <SpeedInsights />
        </AuthProvider>
      </PlatformProvider>
    </ThemeProvider>
  </StrictMode>
);

// Initialize toolbar separately
// const toolbarConfig = {
//   plugins: [], // Add your custom plugins here
// };

// document.addEventListener("DOMContentLoaded", () => {
//   const toolbarRoot = document.createElement("div");
//   toolbarRoot.id = "stagewise-toolbar-root"; // Ensure a unique ID
//   document.body.appendChild(toolbarRoot);

//   createRoot(toolbarRoot).render(
//     <StrictMode>
//       <StagewiseToolbar config={toolbarConfig} />
//     </StrictMode>
//   );
// });
