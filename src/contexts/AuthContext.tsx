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
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  // Add signIn, signUp methods here later if needed within the context itself
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
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
    console.log("AuthContext: useEffect mounting, setting up listener...");

    // Attempt to get the initial session immediately
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        console.log("AuthContext: Initial getSession() result:", session);
        setSession(session);
        setUser(session?.user ?? null);
        // Initial load might be quick, but listener ensures we catch changes
        // setLoadingAuth(false); // Defer setting loading to false until listener confirms
      })
      .catch((error) => {
        console.error("AuthContext: Error in initial getSession():", error);
        // setLoadingAuth(false); // Still need to stop loading on error
      });

    // Set up the listener for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // --- DETAILED LOGGING INSIDE LISTENER ---
      console.log(
        `AuthContext Listener: Event received = ${event}`,
        "Session data =",
        session
      );

      setSession(session);
      setUser(session?.user ?? null);

      console.log(
        "AuthContext Listener: State updated (session, user). Setting loadingAuth to false."
      );

      setLoadingAuth(false); // Set loading to false *after* handling the event

      // --- Load transactions specifically on SIGNED_IN or INITIAL_SESSION ---
      if (
        (event === "SIGNED_IN" || event === "INITIAL_SESSION") &&
        session?.user
      ) {
        console.log(
          `AuthContext (${event}): Attempting to load transactions for user ${session.user.id}...`
        );
        loadAndSetTransactions(); // Load data for the new user/session
      } else if (event === "SIGNED_OUT") {
        console.log(
          "AuthContext (SIGNED_OUT): Clearing transactions from Zustand store."
        );
        useDonationStore.setState({ transactions: [] }); // Clear data on logout
      }
    });

    console.log("AuthContext: Listener setup complete.");

    // Cleanup function to unsubscribe when the component unmounts
    return () => {
      console.log("AuthContext: useEffect unmounting, unsubscribing listener.");
      subscription?.unsubscribe();
    };
  }, []); // Empty dependency array ensures this runs only once on mount

  const signOut = async () => {
    setLoadingAuth(true);
    // Clear store immediately for faster UI feedback (optional, as onAuthStateChange will also clear)
    // console.log("AuthContext: Clearing Zustand store immediately on signOut call.");
    // useDonationStore.setState({ transactions: [] });

    const { error } = await supabase.auth.signOut();
    // State update and store clearing will be handled by onAuthStateChange listener.
    if (error) {
      console.error("Error signing out:", error);
      toast.error("התנתקות נכשלה: " + error.message);
      setLoadingAuth(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoadingAuth(true); // Set loading true before initiating login
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // Optional: Specify redirect URL if needed, otherwise uses config default
        // redirectTo: 'http://localhost:3000'
      },
    });
    if (error) {
      console.error("Error logging in with Google:", error);
      setLoadingAuth(false); // Reset loading state on error
    }
    // No need to set loading false here, onAuthStateChange will handle it
  };

  const logout = async () => {
    setLoadingAuth(true); // Indicate loading during logout process
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Error logging out:", error);
    }
    // Reset state manually as listener might take a moment or have issues
    setSession(null);
    setUser(null);
    setLoadingAuth(false); // Explicitly set loading false after logout attempt
    useDonationStore.setState({ transactions: [] }); // Clear store on logout
  };

  const value = {
    session,
    user,
    loading: loadingAuth,
    signOut,
    loginWithGoogle,
    logout,
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
