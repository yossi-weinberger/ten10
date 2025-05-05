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
  const { platform } = usePlatform(); // Get platform info

  // Set platform for dataService once known
  useEffect(() => {
    if (platform !== "loading") {
      setDataServicePlatform(platform);
    }
  }, [platform]);

  // Helper function to load transactions and update store
  const loadAndSetTransactions = async () => {
    if (platform === "loading") return; // Don't load if platform unknown
    console.log(
      "AuthContext: Attempting to load transactions for new session/user..."
    );
    try {
      const transactions = await loadTransactions(); // dataService handles platform logic
      useDonationStore.setState({ transactions: transactions });
      console.log(
        `AuthContext: Zustand store updated with ${transactions.length} transactions.`
      );
    } catch (error) {
      console.error("AuthContext: Error loading transactions:", error);
      toast.error("שגיאה בטעינת נתונים מהשרת.");
      // Optionally clear store on error?
      // useDonationStore.setState({ transactions: [] });
    }
  };

  useEffect(() => {
    setLoading(true);
    // Initial session check
    supabase.auth
      .getSession()
      .then(({ data: { session: initialSession } }) => {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        // If session exists initially, load transactions
        if (initialSession && platform !== "loading") {
          loadAndSetTransactions();
        }
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error getting initial session:", error);
        setLoading(false);
      });

    // Auth state change listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        console.log("Auth event:", event, newSession);
        const previousUserId = user?.id;
        const newUserId = newSession?.user?.id;

        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);

        // --- Zustand Store Handling ---
        if (!newSession || event === "SIGNED_OUT") {
          // User signed out or session is null
          console.log(
            "AuthContext: Clearing Zustand store due to sign out/null session."
          );
          useDonationStore.setState({ transactions: [] });
        } else if (
          event === "SIGNED_IN" ||
          (event === "USER_UPDATED" && newUserId !== previousUserId) ||
          (event === "INITIAL_SESSION" && newUserId)
        ) {
          // User signed in, changed user, or initial session established
          if (platform !== "loading") {
            await loadAndSetTransactions(); // Load data for the new user/session
          }
        }
        // Add handling for TOKEN_REFRESHED if necessary, potentially re-loading data?
      }
    );

    return () => {
      authListener?.subscription.unsubscribe();
    };
    // Include platform in dependencies to trigger initial load/reload when platform is known
  }, [platform]); // Re-run if platform changes (e.g., from loading to web/desktop)

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
