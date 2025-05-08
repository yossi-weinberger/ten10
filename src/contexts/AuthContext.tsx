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

  useEffect(() => {
    if (platform !== "loading") {
      setDataServicePlatform(platform);
    }
  }, [platform]);

  const loadAndSetTransactions = async (userForLoad: User | null) => {
    // Simplified logging
    console.log(
      "AuthContext: Attempting to load transactions for user:",
      userForLoad?.id
    );

    if (!userForLoad) {
      console.error(
        "AuthContext: loadAndSetTransactions called with null user. Aborting."
      );
      useDonationStore.setState({ transactions: [] });
      // No need to set isDataLoading false here, as it should be false if called with null user
      return;
    }

    if (platform === "loading") {
      console.warn(
        "AuthContext: loadAndSetTransactions called while platform is loading. Aborting."
      );
      return;
    }

    // Set loading flag - the calling useEffect already checked !isDataLoading
    setIsDataLoading(true);

    try {
      // Removed the test RPC Call

      // Actual data loading
      const transactions = await loadTransactions(
        platform === "web" ? userForLoad.id : undefined // Use userForLoad.id directly
      );
      useDonationStore.setState({ transactions: transactions });
      console.log(
        `AuthContext: Successfully loaded ${transactions.length} transactions.`
      );
    } catch (error) {
      console.error("AuthContext: Error during data loading sequence:", error);
      toast.error("שגיאה בטעינת נתונים.");
      useDonationStore.setState({ transactions: [] });
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
    // Simplified log
    console.log(
      `AuthContext: Data loading effect check. User: ${!!user}, Platform: ${platform}, Loading: ${isDataLoading}`
    );

    if (platform === "loading") {
      return; // Wait for platform
    }

    if (!user) {
      // Clear data if user logs out
      useDonationStore.setState({ transactions: [] });
      // Ensure loading flag is reset if we were loading and user logged out
      if (isDataLoading) setIsDataLoading(false);
      return;
    }

    // Proceed to load data if conditions met
    if (user && platform !== "loading" && !isDataLoading) {
      console.log(
        "AuthContext: Conditions met, initiating data load for user:",
        user.id
      );
      loadAndSetTransactions(user);
    }
  }, [user, platform, isDataLoading]); // Keep isDataLoading here to re-evaluate if it becomes false

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
