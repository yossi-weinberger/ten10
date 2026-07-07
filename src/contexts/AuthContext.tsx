import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import { supabase, getCachedSession, invalidateSessionCache } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useDonationStore } from "@/lib/store";
import i18n from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { usePlatform } from "./PlatformContext";
import { CurrencySyncService } from "@/lib/services/currency-sync.service";
import { PreferencesSyncService } from "@/lib/services/preferences-sync.service";
import { resetPostHogUser } from "@/lib/analytics/posthogClient";
import { syncPostHogUserIdentity } from "@/lib/analytics/posthogIdentity.service";

export type { SupabaseUser as User };

interface AuthContextType {
  session: Session | null;
  user: SupabaseUser | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialSetupDone, setInitialSetupDone] = useState(false);
  const { platform } = usePlatform();
  const hasHydrated = useDonationStore((state) => state._hasHydrated);

  useEffect(() => {
    logger.log("AuthContext: Initializing auth state listener.");
    setLoading(true);

    getCachedSession()
      .then(({ data: { session: initialSession } }) => {
        logger.log(
          "AuthContext: Initial session resolved.",
          initialSession ? "Session found." : "No session."
        );
        setSession(initialSession);
        const initialUser = initialSession?.user ?? null;
        setUser(initialUser);
        if (initialUser) {
          void syncPostHogUserIdentity(initialUser, i18n.language);
        }
        setLoading(false);
      })
      .catch((error) => {
        logger.error("Error getting initial session:", error);
        setLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, newAuthStateSession) => {
        logger.log(`AuthContext: Auth state changed. Event: ${event}`);

        invalidateSessionCache();

        setSession(newAuthStateSession);
        const newCurrentUser = newAuthStateSession?.user ?? null;
        setUser(newCurrentUser);

        if (event === "SIGNED_OUT") {
          resetPostHogUser();
        } else if (
          newCurrentUser &&
          (event === "SIGNED_IN" || event === "INITIAL_SESSION")
        ) {
          void syncPostHogUserIdentity(newCurrentUser, i18n.language);
        }

        setLoading(false);
      }
    );

    return () => {
      logger.log("AuthContext: Unsubscribing auth listener.");
      authListener?.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (platform === "loading") return;

    if (!user) {
      setInitialSetupDone(false);
      return;
    }

    if (!hasHydrated || initialSetupDone) return;

    useDonationStore.setState({ lastDbFetchTimestamp: Date.now() });

    if (platform === "web") {
      CurrencySyncService.syncDefaultCurrency(user.id);
      PreferencesSyncService.syncPreferences(user.id);
    }

    setInitialSetupDone(true);
  }, [user, platform, hasHydrated, initialSetupDone]);

  const signOut = async () => {
    setLoading(true);

    const { error } = await supabase.auth.signOut();
    if (error) {
      logger.error("Error signing out:", error);
      toast.error(
        i18n.t("auth.signOut.error", "Sign out failed: ") + error.message
      );
      setLoading(false);
    } else {
      invalidateSessionCache();
    }
  };

  const value = {
    session,
    user,
    loading,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
