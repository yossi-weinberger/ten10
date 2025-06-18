import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
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

// 4. Create the Provider component
export const PlatformProvider: React.FC<PlatformProviderProps> = ({
  children,
}) => {
  const [platform, setPlatform] = useState<Platform>("loading");

  useEffect(() => {
    const detectPlatform = async () => {
      // A reliable way to check if running inside Tauri.
      // @ts-expect-error __TAURI_INTERNALS__ is injected by Tauri.
      if (window.__TAURI_INTERNALS__) {
        try {
          // Dynamically import the plugin ONLY if in Tauri.
          // Vite/Rollup will handle this and not bundle it for web.
          const osPlugin = await import("@tauri-apps/plugin-os");
          await osPlugin.platform(); // Calling it to be sure
          setPlatform("desktop");
        } catch (e) {
          console.error("Tauri environment detected, but OS plugin failed:", e);
          // Fallback for safety
          setPlatform("web");
        }
      } else {
        // Not in a Tauri environment
        setPlatform("web");
      }
    };

    detectPlatform();
  }, []);

  // While platform is being detected, show a loader
  if (platform === "loading") {
    // This was commented out to debug platform detection.
    // If detection now works, we can re-evaluate this loader logic.
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
