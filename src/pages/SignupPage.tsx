import React, { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { usePlatform } from "@/contexts/PlatformContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";

const SignupPage: React.FC = () => {
  const { platform } = usePlatform();
  const { loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mailingListConsent, setMailingListConsent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.error("הסיסמאות אינן תואמות!");
      return;
    }
    setLoading(true);
    let signedUpUserId: string | undefined = undefined;

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (signUpError) throw signUpError;

      signedUpUserId = data.user?.id;

      if (data.session && signedUpUserId) {
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            full_name: fullName,
            mailing_list_consent: mailingListConsent,
          })
          .eq("id", signedUpUserId);

        if (updateError) {
          toast.error(
            "ההרשמה הצליחה, אך עדכון הפרופיל נכשל. אנא עדכן אותו בדף הפרופיל."
          );
          console.error("Error updating profile after signup:", updateError);
        } else {
          toast.success("הרשמה והתחברות הושלמו בהצלחה!");
        }
        navigate({ to: "/" });
      } else if (data.user) {
        toast.success("הרשמה הושלמה! יש לאשר את כתובת המייל שנשלחה אליך.");
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setFullName("");
        setMailingListConsent(false);
      } else {
        toast.error("אירעה שגיאה בלתי צפויה בהרשמה.");
      }
    } catch (error: any) {
      console.error("Error signing up:", error);
      toast.error(error.error_description || error.message || "הרשמה נכשלה");
    } finally {
      setLoading(false);
    }
  };

  if (platform === "desktop") {
    return (
      <div className="p-4">
        <h1 className="text-xl font-semibold">Sign Up</h1>
        <p className="mt-2 text-gray-600">
          Account creation is only available in the web version.
        </p>
      </div>
    );
  }

  if (platform === "loading") {
    return <div>Loading platform...</div>;
  }

  const isAnyLoading = loading || authLoading;

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h1 className="text-2xl font-bold text-center">יצירת חשבון</h1>
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label
              htmlFor="full-name"
              className="block text-sm font-medium text-gray-700"
            >
              שם מלא
            </label>
            <input
              id="full-name"
              name="full-name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="ישראל ישראלי"
              disabled={isAnyLoading}
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              כתובת מייל
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="••••••••"
              disabled={isAnyLoading}
            />
          </div>
          <div>
            <label
              htmlFor="confirm-password"
              className="block text-sm font-medium text-gray-700"
            >
              אימות סיסמה
            </label>
            <input
              id="confirm-password"
              name="confirm-password"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="••••••••"
              disabled={isAnyLoading}
            />
          </div>
          <div className="flex items-center">
            <input
              id="mailing-list-consent"
              name="mailing-list-consent"
              type="checkbox"
              checked={mailingListConsent}
              onInput={(e) =>
                setMailingListConsent((e.target as HTMLInputElement).checked)
              }
              className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              disabled={isAnyLoading}
            />
            <label
              htmlFor="mailing-list-consent"
              className="ml-2 block text-sm text-gray-900"
            >
              אני מאשר/ת קבלת עדכונים ודיוור במייל
            </label>
          </div>
          <div>
            <button
              type="submit"
              disabled={isAnyLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {isAnyLoading ? "יוצר חשבון..." : "הרשמה"}
            </button>
          </div>
          <p className="text-center text-sm text-gray-600">
            יש לך כבר חשבון?{" "}
            <Link
              to="/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              התחבר/י
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignupPage;
