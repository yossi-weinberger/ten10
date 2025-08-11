import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient"; // Using path alias from tsconfig
import { toast } from "react-hot-toast";
import { useDonationStore } from "@/lib/store"; // Import Zustand store
import i18n from "@/lib/i18n";
// import { useTableTransactionsStore } from "@/lib/tableTransactions/tableTransactions.store"; // This seems unused in the provided snippet, might be removable if not used elsewhere
// Import table transactions store
// import { loadTransactions, setDataServicePlatform } from "@/lib/dataService"; // loadTransactions will be removed from dataService, setDataServicePlatform is still used.
// import { setDataServicePlatform } from "@/lib/dataService"; // REMOVED
import { usePlatform } from "./PlatformContext"; // Import usePlatform to set platform for dataService

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
  // const [isDataLoading, setIsDataLoading] = useState(false); // REMOVE if loadAndSetTransactionsInternal is removed and not used otherwise
  const [initialForcedLoadDone, setInitialForcedLoadDone] = useState(false);
  const { platform } = usePlatform();
  const hasHydrated = useDonationStore((state) => state._hasHydrated);
  const lastDbFetchTimestampFromStore = useDonationStore(
    (state) => state.lastDbFetchTimestamp
  );

  // REMOVE THE ENTIRE loadAndSetTransactionsInternal function block
  /*
  const loadAndSetTransactionsInternal = async (
    userForLoad: SupabaseUser | null
  ) => {
    if (!userForLoad) {
      console.error(
        "AuthContext: loadAndSetTransactionsInternal called with null user. Aborting."
      );
      useDonationStore.setState({
        lastDbFetchTimestamp: null,
      });
      return;
    }
    if (platform === "loading") {
      console.warn(
        "AuthContext: loadAndSetTransactionsInternal called while platform is loading. Aborting."
      );
      return;
    }
    // if (isDataLoading) { // This check would also be removed
    //   console.log(
    //     "AuthContext: loadAndSetTransactionsInternal - prevented re-entry as isDataLoading is true"
    //   );
    //   return;
    // }

    console.log(
      "AuthContext: Initiating data load sequence for user:",
      userForLoad.id
    );
    // setIsDataLoading(true); // REMOVE

    try {
      await loadTransactions(platform === "web" ? userForLoad.id : undefined); // loadTransactions itself will be removed from dataService

      useDonationStore.setState({
        lastDbFetchTimestamp: Date.now(),
      });
      console.log(
        "AuthContext: loadTransactions call completed and lastDbFetchTimestamp updated."
      );
    } catch (error) {
      console.error("AuthContext: Error during data loading sequence:", error);
      toast.error(i18n.t("common.dataLoadError", "Error loading data."));
    } finally {
      // setIsDataLoading(false); // REMOVE
    }
  };
  */

  // Effect for initial session check and onAuthStateChange listener setup
  useEffect(() => {
    console.log("AuthContext: Initializing auth state listener.");
    setLoading(true);

    // Initial session check
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        console.log(
          "AuthContext: Initial session resolved.",
          initialSession ? "Session found." : "No session."
        );
        setSession(initialSession);
        const initialUser = initialSession?.user ?? null;
        setUser(initialUser); // Trigger data loading useEffect if user exists
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error getting initial session:", error);
        setLoading(false);
      });

    // Auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newAuthStateSession) => {
        console.log(`AuthContext: Auth state changed. Event: ${event}`);

        setSession(newAuthStateSession);
        const newCurrentUser = newAuthStateSession?.user ?? null;
        setUser(newCurrentUser); // Update user state, triggering data loading useEffect

        // Loading state is now primarily managed by the initial getSession and data loading
        setLoading(false); // Set loading to false once auth state is determined
      }
    );

    return () => {
      console.log("AuthContext: Unsubscribing auth listener.");
      authListener?.subscription.unsubscribe();
      // Cleanup realtime subscription on component unmount as well - REMOVED
      // useTableTransactionsStore.getState().cleanupRealtimeSubscription();
    };
  }, []);

  // New useEffect for DATA LOADING AND REALTIME SUBSCRIPTION based on user and platform state
  useEffect(() => {
    // const { setupRealtimeSubscription, cleanupRealtimeSubscription } = // REMOVED
    //   useTableTransactionsStore.getState(); // REMOVED
    console.log(
      `AuthContext: Data loading effect (Realtime REMOVED). User: ${!!user}, Platform: ${platform}, Hydrated: ${hasHydrated}, Timestamp: ${lastDbFetchTimestampFromStore}, InitialForcedLoadDone: ${initialForcedLoadDone}`
    );

    if (platform === "loading") {
      console.log(
        "AuthContext: Platform is loading, aborting data load check."
      );
      return;
    }

    // Main data loading decision logic starts here
    if (user && hasHydrated) {
      /* // START: TEMPORARILY COMMENT OUT ORIGINAL FRESHNESS LOGIC
      const shouldForceFetchFromDb =
        sessionStorage.getItem("forceDbFetchOnLoad") === "true";

      if (shouldForceFetchFromDb) {
        sessionStorage.removeItem("forceDbFetchOnLoad");
        console.log(
          "AuthContext: 'forceDbFetchOnLoad' flag found (new login), initiating DB load."
        );
        loadAndSetTransactionsInternal(user);
      } else {
        // Not a new login, check timestamp
        if (
          lastDbFetchTimestampFromStore === null ||
          typeof lastDbFetchTimestampFromStore === "undefined"
        ) {
          const currentTransactions = useDonationStore.getState().transactions;
          if (currentTransactions.length === 0) {
            console.log(
              "AuthContext: No timestamp from store hook YET OR it's genuinely null, AND no transactions. Attempting DB load as a precaution."
            );
            loadAndSetTransactionsInternal(user);
          } else {
            console.log(
              "AuthContext: No timestamp from store hook YET OR it's genuinely null, but transactions exist. Assuming fresh from persist, will re-eval if timestamp updates."
            );
          }
          return; 
        }

        // Timestamp is available and is a number, proceed with staleness check
        const oneDayInMillis = 24 * 60 * 60 * 1000; // 1 day
        if (Date.now() - lastDbFetchTimestampFromStore > oneDayInMillis) {
          console.log(
            "AuthContext: Data may be stale (older than 1 day based on store hook), initiating DB load."
          );
          loadAndSetTransactionsInternal(user);
        } else {
          console.log(
            "AuthContext: Data in Zustand is considered fresh enough (based on store hook), skipping DB load."
          );
        }
      }
      // END: TEMPORARILY COMMENT OUT ORIGINAL FRESHNESS LOGIC */

      // --- START: NEW TEMPORARY LOGIC TO FORCE LOAD (NOW MODIFIED) ---
      if (!initialForcedLoadDone) {
        console.log(
          "AuthContext: Initial data load sequence (e.g., for settings or timestamp) - loadAndSetTransactionsInternal call REMOVED. Only setting initialForcedLoadDone."
        );
        // loadAndSetTransactionsInternal(user); // REMOVE THIS CALL
        // If loadAndSetTransactionsInternal had other purposes like setting lastDbFetchTimestamp, that logic might need to be moved or called differently.
        // For now, we assume its primary goal (populating global transactions) is gone.
        // We might still want to update lastDbFetchTimestamp on login, but not necessarily by loading all transactions.
        // Let's update the timestamp directly here for now to signify an auth event / potential data refresh point.
        useDonationStore.setState({ lastDbFetchTimestamp: Date.now() });
        setInitialForcedLoadDone(true);
      } else {
        console.log(
          "AuthContext: Initial forced data load/setup already performed, skipping."
        );
      }
      // --- END: NEW TEMPORARY LOGIC TO FORCE LOAD ---
    } else if (user && !hasHydrated) {
      console.log(
        "AuthContext: User exists but store not hydrated yet. Waiting for hydration."
      );
      // Do nothing, useEffect will re-run when hasHydrated becomes true
    } else if (!user && platform === "web") {
      // User logged out or no user on web, ensure cleanup
      console.log("AuthContext: No user on web. (Realtime cleanup REMOVED)");
      // cleanupRealtimeSubscription(); // REMOVED
    }

    // Setup realtime subscription if user is logged in on web - REMOVED
    // if (user && platform === "web") {
    //   console.log(
    //     "AuthContext: Setting up realtime subscription for user:",
    //     user.id
    //   );
    //   setupRealtimeSubscription(user.id);
    // } else {
    //   // Cleanup if not on web or no user (this might be redundant due to the above else if, but safe)
    //   cleanupRealtimeSubscription(); // REMOVED
    // }

    // Cleanup function for this useEffect - REMOVED Realtime part
    // return () => {
    //   if (platform === "web") {
    //     // Only cleanup if it might have been set up
    //     console.log(
    //       "AuthContext: useEffect cleanup for realtime subscription."
    //     );
    //     cleanupRealtimeSubscription(); // REMOVED
    //   }
    // };
  }, [
    user,
    platform,
    // isDataLoading, // Removed: Realtime setup should not depend on data loading state
    hasHydrated,
    // lastDbFetchTimestampFromStore, // Removed: Realtime setup should not depend on data freshness timestamp
    initialForcedLoadDone,
  ]);

  const signOut = async () => {
    setLoading(true);
    // Clear store immediately for faster UI feedback (optional, as onAuthStateChange will also clear)
    // console.log("AuthContext: Clearing Zustand store immediately on signOut call.");
    // useDonationStore.setState({ transactions: [] });

    const { error } = await supabase.auth.signOut();
    // State update and store clearing will be handled by onAuthStateChange listener.
    if (error) {
      console.error("Error signing out:", error);
      toast.error(
        i18n.t("auth.signOut.error", "Sign out failed: ") + error.message
      );
      setLoading(false);
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
