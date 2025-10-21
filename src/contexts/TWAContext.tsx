import React, {
  createContext,
  useContext,
  ReactNode,
  useState,
  useEffect,
} from "react";

/**
 * TWA (Trusted Web Activity) Context
 *
 * This context detects if the app is running as an Android TWA (Trusted Web Activity)
 * via Bubblewrap. This allows us to customize the UI/UX for mobile app users.
 *
 * Detection method:
 * 1. Check for ?twa=true query parameter on initial load
 * 2. Store this state in localStorage for persistence
 * 3. Provide the state to all components via context
 */

export interface TWAContextType {
  isTWA: boolean;
}

const TWAContext = createContext<TWAContextType | undefined>(undefined);

interface TWAProviderProps {
  children: ReactNode;
}

export const TWAProvider: React.FC<TWAProviderProps> = ({ children }) => {
  // Check localStorage first for persisted state
  const [isTWA, setIsTWA] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("isTwa") === "true";
    }
    return false;
  });

  useEffect(() => {
    // Check URL for twa query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const twaParam = urlParams.get("twa");

    if (twaParam === "true") {
      // User opened the app via TWA
      localStorage.setItem("isTwa", "true");
      setIsTWA(true);

      // Optional: Clean up the URL (remove query parameter)
      // This makes the URL cleaner but is optional
      const newUrl = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  return (
    <TWAContext.Provider value={{ isTWA }}>{children}</TWAContext.Provider>
  );
};

/**
 * Hook to access TWA state
 * @returns {TWAContextType} Object with isTWA boolean
 */
export const useTWA = (): TWAContextType => {
  const context = useContext(TWAContext);
  if (context === undefined) {
    throw new Error("useTWA must be used within a TWAProvider");
  }
  return context;
};
