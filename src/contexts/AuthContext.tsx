import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase, getCachedSession, invalidateSessionCache } from "@/lib/supabaseClient"; // Using path alias from tsconfig
import { toast } from "sonner";
import { useDonationStore } from "@/lib/store"; // Import Zustand store
import i18n from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { usePlatform } from "./PlatformContext"; // Import usePlatform to set platform for dataService
import { CurrencySyncService } from "@/lib/services/currency-sync.service";
import { PreferencesSyncService } from "@/lib/services/preferences-sync.service";

export type { SupabaseUser as User }; // Re-exporting the User type

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
  // Add signIn, signUp methods here later if needed within the context itself
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialForcedLoadDone, setInitialForcedLoadDone] = useState(false);
  const { platform } = usePlatform();
  const hasHydrated = useDonationStore((state) => state._hasHydrated);
  const lastDbFetchTimestampFromStore = useDonationStore(
    (state) => state.lastDbFetchTimestamp
  );

  // Effect for initial session check and onAuthStateChange listener setup
  useEffect(() => {
    logger.log("AuthContext: Initializing auth state listener.");
    setLoading(true);

    // Initial session check - use cached session to share result with routes.ts
    getCachedSession()
      .then(({ data: { session: initialSession } }) => {
        logger.log(
          "AuthContext: Initial session resolved.",
          initialSession ? "Session found." : "No session."
        );
        setSession(initialSession);
        const initialUser = initialSession?.user ?? null;
        setUser(initialUser); // Trigger data loading useEffect if user exists
        setLoading(false);
      })
      .catch((error) => {
        logger.error("Error getting initial session:", error);
        setLoading(false);
      });

    // Auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newAuthStateSession) => {
        logger.log(`AuthContext: Auth state changed. Event: ${event}`);

        // Invalidate session cache on any auth state change to ensure consistency
        invalidateSessionCache();

        setSession(newAuthStateSession);
        const newCurrentUser = newAuthStateSession?.user ?? null;
        setUser(newCurrentUser); // Update user state, triggering data loading useEffect

        // Loading state is now primarily managed by the initial getSession and data loading
        setLoading(false); // Set loading to false once auth state is determined
      }
    );

    return () => {
      logger.log("AuthContext: Unsubscribing auth listener.");
      authListener?.subscription.unsubscribe();
    };
  }, []);

  // New useEffect for DATA LOADING AND REALTIME SUBSCRIPTION based on user and platform state
  useEffect(() => {
    logger.log(
      `AuthContext: Data loading effect (Realtime REMOVED). User: ${!!user}, Platform: ${platform}, Hydrated: ${hasHydrated}, Timestamp: ${lastDbFetchTimestampFromStore}, InitialForcedLoadDone: ${initialForcedLoadDone}`
    );

    if (platform === "loading") {
      logger.log("AuthContext: Platform is loading, aborting data load check.");
      return;
    }

    // Main data loading decision logic starts here
    if (user && hasHydrated) {
      // --- START: NEW TEMPORARY LOGIC TO FORCE LOAD (NOW MODIFIED) ---
      if (!initialForcedLoadDone) {
        logger.log(
          "AuthContext: Initial data load sequence (e.g., for settings or timestamp) - loadAndSetTransactionsInternal call REMOVED. Only setting initialForcedLoadDone."
        );
        // If loadAndSetTransactionsInternal had other purposes like setting lastDbFetchTimestamp, that logic might need to be moved or called differently.
        // For now, we assume its primary goal (populating global transactions) is gone.
        // We might still want to update lastDbFetchTimestamp on login, but not necessarily by loading all transactions.
        // Let's update the timestamp directly here for now to signify an auth event / potential data refresh point.
        useDonationStore.setState({ lastDbFetchTimestamp: Date.now() });
        
        // --- SYNC CURRENCY SETTINGS ---
        if (platform === "web") {
            // Only sync currency on Web where we have direct DB access and need consistency with Edge Functions
            CurrencySyncService.syncDefaultCurrency(user.id);
            PreferencesSyncService.syncPreferences(user.id);
        }

        setInitialForcedLoadDone(true);
      } else {
        logger.log(
          "AuthContext: Initial forced data load/setup already performed, skipping."
        );
      }
      // --- END: NEW TEMPORARY LOGIC TO FORCE LOAD ---
    } else if (user && !hasHydrated) {
      logger.log(
        "AuthContext: User exists but store not hydrated yet. Waiting for hydration."
      );
      // Do nothing, useEffect will re-run when hasHydrated becomes true
    } else if (!user && platform === "web") {
      // User logged out or no user on web, ensure cleanup
      logger.log("AuthContext: No user on web. (Realtime cleanup REMOVED)");
    }
  }, [
    user,
    platform,
    hasHydrated,
    initialForcedLoadDone,
  ]);

  const signOut = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signOut();
    // State update and store clearing will be handled by onAuthStateChange listener.
    if (error) {
      logger.error("Error signing out:", error);
      toast.error(
        i18n.t("auth.signOut.error", "Sign out failed: ") + error.message
      );
      setLoading(false);
    } else {
      // Invalidate session cache only after successful sign out
      invalidateSessionCache();
    }
  };

  const value = {
    session,
    user,
    loading,
    signOut,
  };

  // Don't render children until the initial session check is complete
  // Or show a loading indicator
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
