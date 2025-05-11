import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabaseClient"; // Using path alias from tsconfig
import { toast } from "react-hot-toast";
import { useDonationStore } from "@/lib/store"; // Import Zustand store
import { loadTransactions, setDataServicePlatform } from "@/lib/dataService"; // Import data loading function and platform setter
import { usePlatform } from "./PlatformContext"; // Import usePlatform to set platform for dataService

interface AuthContextType {
  session: Session | null;
  user: User | null;
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
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const { platform } = usePlatform();
  const setTransactionsInStore = useDonationStore(
    (state) => state.setTransactions
  ); // Helper to access zustand action
  const setLastDbFetchTimestampInStore = useDonationStore(
    (state) => state.setLastDbFetchTimestamp
  ); // Helper
  const hasHydrated = useDonationStore((state) => state._hasHydrated);
  const lastDbFetchTimestampFromStore = useDonationStore(
    (state) => state.lastDbFetchTimestamp
  ); // Added this line

  useEffect(() => {
    if (platform !== "loading") {
      setDataServicePlatform(platform);
    }
  }, [platform]);

  const loadAndSetTransactionsInternal = async (userForLoad: User | null) => {
    if (!userForLoad) {
      console.error(
        "AuthContext: loadAndSetTransactionsInternal called with null user. Aborting."
      );
      useDonationStore.setState({
        transactions: [],
        lastDbFetchTimestamp: null,
      }); // Clear timestamp too
      return;
    }
    if (platform === "loading") {
      console.warn(
        "AuthContext: loadAndSetTransactionsInternal called while platform is loading. Aborting."
      );
      return;
    }
    if (isDataLoading) {
      console.log(
        "AuthContext: loadAndSetTransactionsInternal - prevented re-entry as isDataLoading is true"
      );
      return;
    }

    console.log(
      "AuthContext: Initiating data load sequence for user:",
      userForLoad.id
    );
    setIsDataLoading(true);

    try {
      const transactionsFromBackend = await loadTransactions(
        platform === "web" ? userForLoad.id : undefined
      );

      useDonationStore.setState({
        transactions: transactionsFromBackend,
        lastDbFetchTimestamp: Date.now(),
      });
      console.log(
        `AuthContext: Successfully loaded ${transactionsFromBackend.length} transactions from backend.`
      );
    } catch (error) {
      console.error("AuthContext: Error during data loading sequence:", error);
      toast.error("שגיאה בטעינת נתונים.");
      useDonationStore.setState({ transactions: [] }); // Keep transactions empty on error, timestamp not cleared to avoid loops
    } finally {
      setIsDataLoading(false);
    }
  };

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
    };
  }, []);

  // New useEffect for DATA LOADING based on user and platform state
  useEffect(() => {
    console.log(
      `AuthContext: Data loading effect. User: ${!!user}, Platform: ${platform}, DataLoading: ${isDataLoading}, Hydrated: ${hasHydrated}, Timestamp: ${lastDbFetchTimestampFromStore}`
    );

    if (platform === "loading") {
      console.log(
        "AuthContext: Platform is loading, aborting data load check."
      );
      return;
    }

    // Main data loading decision logic starts here
    if (user && hasHydrated) {
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
          return; // Wait for a potential update to lastDbFetchTimestampFromStore from hydration
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
    } else if (user && !hasHydrated) {
      console.log(
        "AuthContext: User exists but store not hydrated yet. Waiting for hydration."
      );
      // Do nothing, useEffect will re-run when hasHydrated becomes true
    }
    // If no user, or platform is loading, or already loading data, those cases are handled by earlier returns.
  }, [
    user,
    platform,
    isDataLoading,
    hasHydrated,
    lastDbFetchTimestampFromStore,
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
      toast.error("התנתקות נכשלה: " + error.message);
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
