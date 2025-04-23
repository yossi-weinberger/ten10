import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

// 1. Define possible platform states
export type Platform = "web" | "desktop" | "loading";

// 2. Define the shape of the context value
export interface PlatformContextType {
  platform: Platform;
}

// 3. Create the context with a default value ('loading' initially)
export const PlatformContext = createContext<PlatformContextType>({
  platform: "loading",
});

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
    // --- Detection Logic ---
    // Check specifically for Tauri
    const isDesktop = Boolean((window as any).__TAURI__);

    setPlatform(isDesktop ? "desktop" : "web");
    // --- End Detection Logic ---

    // Run this effect only once on component mount
  }, []);

  return (
    <PlatformContext.Provider value={{ platform }}>
      {children}
    </PlatformContext.Provider>
  );
};

// --- Hook will be added below ---

// 5. Create the custom hook for consuming the context
export const usePlatform = (): PlatformContextType => {
  const context = useContext(PlatformContext);
  if (context === undefined) {
    // Ensure the hook is used within the provider tree
    throw new Error("usePlatform must be used within a PlatformProvider");
  }
  return context;
};
