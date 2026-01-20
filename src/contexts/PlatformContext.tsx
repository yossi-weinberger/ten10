import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { logger } from "@/lib/logger";
import AppLoader from "../components/layout/AppLoader";

// 1. Define possible platform states
export type Platform = "web" | "desktop" | "loading";

// 2. Define the shape of the context value
export interface PlatformContextType {
  platform: Platform;
}

// 3. Create the context with a default value ('loading' initially)
const PlatformContext = createContext<PlatformContextType | undefined>(
  undefined
);

// --- Provider and Hook will be added below ---

interface PlatformProviderProps {
  children: ReactNode;
}

// Synchronous platform detection for initial state
// Web can be detected immediately (no __TAURI_INTERNALS__)
// Desktop needs async verification but we can start with "loading"
const getInitialPlatform = (): Platform => {
  // @ts-expect-error __TAURI_INTERNALS__ is injected by Tauri
  if (window.__TAURI_INTERNALS__) {
    return "loading"; // Desktop needs async verification of OS plugin
  }
  return "web"; // Web detected synchronously - no loader needed!
};

// 4. Create the Provider component
export const PlatformProvider: React.FC<PlatformProviderProps> = ({
  children,
}) => {
  const [platform, setPlatform] = useState<Platform>(getInitialPlatform);

  useEffect(() => {
    // Only run async detection for desktop (when initial state is "loading")
    if (platform !== "loading") {
      return; // Web already detected synchronously
    }

    const detectDesktopPlatform = async () => {
      try {
        // Dynamically import the plugin ONLY if in Tauri.
        const osPlugin = await import("@tauri-apps/plugin-os");
        await osPlugin.platform(); // Calling it to be sure
        setPlatform("desktop");
      } catch (e) {
        logger.error("Tauri environment detected, but OS plugin failed:", e);
        setPlatform("web"); // Fallback for safety
      }
    };

    detectDesktopPlatform();
  }, [platform]);

  // Only show loader for desktop (async verification needed)
  if (platform === "loading") {
    return <AppLoader />;
  }

  // Once platform is detected, provide it to children
  return (
    <PlatformContext.Provider value={{ platform }}>
      {children}
    </PlatformContext.Provider>
  );
};

// --- Hook will be added below ---

// 5. Create the custom hook for consuming the context
export const usePlatform = () => {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    // Ensure the hook is used within the provider tree
    throw new Error("usePlatform must be used within a PlatformProvider");
  }
  return context;
};
