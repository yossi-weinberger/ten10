import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";
import { platform as getTauriPlatform } from "@tauri-apps/plugin-os";

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
    let isDesktop = false;
    try {
      // getTauriPlatform() will throw an error if not in a Tauri environment
      getTauriPlatform();
      isDesktop = true;
    } catch (e) {
      // If the above function throws, we're not in a Tauri environment.
      isDesktop = false;
    }
    setPlatform(isDesktop ? "desktop" : "web");
  }, []);

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
