import React, { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router"; // Import Link for navigation
import { usePlatform } from "@/contexts/PlatformContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
// Assuming you have UI components like Button, Input, Label from Shadcn/ui or similar
// import { Button } from "@/components/ui/button";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Separator } from "@/components/ui/separator";

// Placeholder for Google Icon - replace with actual icon component if available
const GoogleIcon = () => (
  <svg viewBox="0 0 48 48" width="24" height="24">
    <path
      fill="#EA4335"
      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
    />
    <path
      fill="#4285F4"
      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
    />
    <path
      fill="#FBBC05"
      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
    />
    <path
      fill="#34A853"
      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
    />
    <path fill="none" d="M0 0h48v48H0z" />
  </svg>
);

const LoginPage: React.FC = () => {
  const { platform } = usePlatform();
  const { loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("auth");

  const [emailPassword, setEmailPassword] = useState("");
  const [password, setPassword] = useState("");
  const [emailMagicLink, setEmailMagicLink] = useState("");

  const [loadingPassword, setLoadingPassword] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingMagicLink, setLoadingMagicLink] = useState(false);

  const handleLoginPassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoadingPassword(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: emailPassword,
        password,
      });
      if (error) throw error;
      sessionStorage.setItem("forceDbFetchOnLoad", "true");
      toast.success(t("login.toasts.loginSuccess"));
      navigate({ to: "/" });
    } catch (error: any) {
      logger.error("Error logging in with password:", error);
      toast.error(
        error.error_description || error.message || t("login.toasts.loginError")
      );
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleLoginGoogle = async () => {
    setLoadingGoogle(true);
    try {
      const isDevelopment = process.env.NODE_ENV === "development";
      const redirectURL = isDevelopment
        ? "http://localhost:5173" // Ensure this matches your dev server and Google Console
        : window.location.origin; // For production, use the current origin

      logger.log(
        `[LoginPage] Using redirectTo for Google OAuth: ${redirectURL}`
      ); // Added log

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectURL,
        },
      });
      if (error) throw error;
      sessionStorage.setItem("forceDbFetchOnLoad", "true");
      // Redirect happens automatically via Supabase/Google callback
    } catch (error: any) {
      logger.error("Error logging in with Google:", error);
      toast.error(
        error.error_description ||
          error.message ||
          t("login.toasts.googleError")
      );
      setLoadingGoogle(false); // Only stop loading on error, success redirects
    }
    // No finally setLoadingGoogle(false) here, as successful login redirects away
  };

  const handleLoginMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoadingMagicLink(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailMagicLink,
        options: {
          // Optional: Specify where the user should be redirected after clicking the link
          // emailRedirectTo: window.location.origin + '/welcome',
          // shouldCreateUser: false, // Set to true if you want magic link to work for sign up too
        },
      });
      if (error) throw error;
      toast.success(t("login.toasts.magicLinkSent"));
      setEmailMagicLink(""); // Clear input after sending
    } catch (error: any) {
      logger.error("Error sending magic link:", error);
      toast.error(
        error.error_description ||
          error.message ||
          t("login.toasts.magicLinkError")
      );
    } finally {
      setLoadingMagicLink(false);
    }
  };

  // --- Platform Checks (Remain the same) ---
  if (platform === "desktop") {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">{t("login.title")}</h1>
        <p className="mt-2 text-gray-600">{t("login.onlyWebAvailable")}</p>
      </div>
    );
  }
  if (platform === "loading") {
    return <div>{t("platformLoading")}</div>;
  }
  // --- End Platform Checks ---

  // Combined loading state for disabling elements
  const isAnyLoading =
    loadingPassword || loadingGoogle || loadingMagicLink || authLoading;

  return (
    <div
      className="flex justify-center items-center min-h-screen bg-gray-100"
      dir={i18n.dir()}
    >
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">{t("login.title")}</h1>

        {/* Sign in with Google Button */}
        <button // Replace with your Button component if available
          type="button"
          onClick={handleLoginGoogle}
          disabled={isAnyLoading}
          className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <GoogleIcon />
          {loadingGoogle
            ? t("login.googleSignInLoading")
            : t("login.googleSignIn")}
        </button>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              {t("login.dividerText")}
            </span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleLoginPassword} className="space-y-4">
          <div>
            <label
              htmlFor="email-password"
              className="block text-sm font-medium text-gray-700"
            >
              {t("login.emailLabel")}
            </label>
            <input // Replace with Input component
              id="email-password"
              name="email-password"
              type="email"
              autoComplete="email"
              required
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder={t("login.emailPlaceholder")}
              disabled={isAnyLoading}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              {t("login.passwordLabel")}
            </label>
            <input // Replace with Input component
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder={t("login.passwordPlaceholder")}
              disabled={isAnyLoading}
            />
          </div>
          <div>
            <button // Replace with Button component
              type="submit"
              disabled={isAnyLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loadingPassword
                ? t("login.signInButtonLoading")
                : t("login.signInButton")}
            </button>
          </div>
        </form>

        {/* Magic Link Form */}
        <form
          onSubmit={handleLoginMagicLink}
          className="space-y-4 pt-4 border-t border-gray-200"
        >
          <label
            htmlFor="email-magiclink"
            className="block text-sm font-medium text-gray-700"
          >
            {t("login.magicLinkLabel")}
          </label>
          <div className="flex gap-2">
            <input // Replace with Input component
              id="email-magiclink"
              name="email-magiclink"
              type="email"
              autoComplete="email"
              required
              value={emailMagicLink}
              onChange={(e) => setEmailMagicLink(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder={t("login.magicLinkPlaceholder")}
              disabled={isAnyLoading}
            />
            <button // Replace with Button component
              type="submit"
              disabled={isAnyLoading}
              className="flex-shrink-0 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              {loadingMagicLink
                ? t("login.sendLinkButtonLoading")
                : t("login.sendLinkButton")}
            </button>
          </div>
        </form>

        {/* Link to Signup page */}
        <p className="text-center text-sm text-gray-600">
          {t("login.noAccount")}{" "}
          <Link // Use Link component from router
            to="/signup"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            {t("login.signUpLink")}
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
