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

  useEffect(() => {
    setLoading(true);
    // Attempt to get the session initially
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      })
      .catch((error) => {
        console.error("Error getting initial session:", error);
        setLoading(false); // Ensure loading is set to false even on error
      });

    // Listen for changes in auth state (login, logout, etc.)
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth event:", event, session);
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    setLoading(true); // Indicate loading state starts
    const { error } = await supabase.auth.signOut();
    // State update (session/user to null) and setLoading(false)
    // will happen automatically via the onAuthStateChange listener.
    if (error) {
      console.error("Error signing out:", error);
      toast.error("התנתקות נכשלה: " + error.message);
      // Even if signout fails, the state listener might not trigger if session was already invalid.
      // We might need to force loading state off here in case of error.
      setLoading(false); // Explicitly turn off loading on error
    }
    // We intentionally DO NOT navigate here. Navigation should be handled
    // by the component initiating the sign-out, after this async function completes.
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
