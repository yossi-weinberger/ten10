import React, { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router"; // Import Link for navigation
import { usePlatform } from "@/contexts/PlatformContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
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
      toast.success("Logged in successfully!");
      navigate({ to: "/" });
    } catch (error: any) {
      console.error("Error logging in with password:", error);
      toast.error(
        error.error_description || error.message || "Failed to log in"
      );
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleLoginGoogle = async () => {
    setLoadingGoogle(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          // Optional: Specify where Google should redirect after successful auth
          // redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      // Redirect happens automatically via Supabase/Google callback
    } catch (error: any) {
      console.error("Error logging in with Google:", error);
      toast.error(
        error.error_description ||
          error.message ||
          "Failed to sign in with Google"
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
      toast.success("Magic link sent! Check your email.");
      setEmailMagicLink(""); // Clear input after sending
    } catch (error: any) {
      console.error("Error sending magic link:", error);
      toast.error(
        error.error_description || error.message || "Failed to send magic link"
      );
    } finally {
      setLoadingMagicLink(false);
    }
  };

  // --- Platform Checks (Remain the same) ---
  if (platform === "desktop") {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">התחברות</h1>
        <p className="mt-2 text-gray-600">התחברות זמינה רק בגרסת הרשת.</p>
      </div>
    );
  }
  if (platform === "loading") {
    return <div>Loading platform...</div>;
  }
  // --- End Platform Checks ---

  // Combined loading state for disabling elements
  const isAnyLoading =
    loadingPassword || loadingGoogle || loadingMagicLink || authLoading;

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">התחברות</h1>

        {/* Sign in with Google Button */}
        <button // Replace with your Button component if available
          type="button"
          onClick={handleLoginGoogle}
          disabled={isAnyLoading}
          className="w-full flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          <GoogleIcon />
          {loadingGoogle ? "מתחבר באמצעות גוגל..." : "התחבר/י עם גוגל"}
        </button>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">או המשך/י עם</span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleLoginPassword} className="space-y-4">
          <div>
            <label
              htmlFor="email-password"
              className="block text-sm font-medium text-gray-700"
            >
              כתובת מייל
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
              placeholder="you@example.com"
              disabled={isAnyLoading}
            />
          </div>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              סיסמה
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
              placeholder="••••••••"
              disabled={isAnyLoading}
            />
          </div>
          <div>
            <button // Replace with Button component
              type="submit"
              disabled={isAnyLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loadingPassword ? "מתחבר..." : "התחבר/י עם סיסמה"}
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
            או התחבר/י עם קישור קסם
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
              placeholder="you@example.com"
              disabled={isAnyLoading}
            />
            <button // Replace with Button component
              type="submit"
              disabled={isAnyLoading}
              className="flex-shrink-0 inline-flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-gray-600 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
            >
              {loadingMagicLink ? "שולח..." : "שלח קישור"}
            </button>
          </div>
        </form>

        {/* Link to Signup page */}
        <p className="text-center text-sm text-gray-600">
          אין לך חשבון?{" "}
          <Link // Use Link component from router
            to="/signup"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            הרשמה
          </Link>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
