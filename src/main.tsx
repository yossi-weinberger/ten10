import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "react-hot-toast";
import { RouterProvider } from "@tanstack/react-router";
import { router } from "./routes";
import { ThemeProvider } from "./lib/theme";
import { PlatformProvider } from "./contexts/PlatformContext";
import { AuthProvider } from "./contexts/AuthContext";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider defaultTheme="system" storageKey="Ten10-ui-theme">
      <PlatformProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster position="top-center" />
        </AuthProvider>
      </PlatformProvider>
    </ThemeProvider>
  </StrictMode>
);
