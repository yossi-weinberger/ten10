import React, { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { usePlatform } from "@/contexts/PlatformContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AuthLayout } from "@/components/layout/AuthLayout";

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

  const getAuthErrorMessage = (error: any) => {
    const message = error.error_description || error.message || "";
    if (message.includes("Invalid login credentials")) {
      return t("login.errors.invalidCredentials");
    }
    if (message.includes("Email not confirmed")) {
      return t("login.errors.emailNotConfirmed");
    }
    return message || t("login.toasts.loginError");
  };

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
      toast.error(getAuthErrorMessage(error));
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleLoginGoogle = async () => {
    setLoadingGoogle(true);
    try {
      const isDevelopment = import.meta.env.DEV;
      const redirectURL = isDevelopment
        ? "http://localhost:5173"
        : window.location.origin;

      logger.log(
        `[LoginPage] Using redirectTo for Google OAuth: ${redirectURL}`
      );

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectURL,
        },
      });
      if (error) throw error;
      sessionStorage.setItem("forceDbFetchOnLoad", "true");
    } catch (error: any) {
      logger.error("Error logging in with Google:", error);
      toast.error(
        error.error_description ||
          error.message ||
          t("login.toasts.googleError")
      );
      setLoadingGoogle(false);
    }
  };

  const handleLoginMagicLink = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoadingMagicLink(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: emailMagicLink,
        options: {},
      });
      if (error) throw error;
      toast.success(t("login.toasts.magicLinkSent"));
      setEmailMagicLink("");
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

  if (platform === "desktop") {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("login.title")}</CardTitle>
            <CardDescription>{t("login.onlyWebAvailable")}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }
  if (platform === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        {t("platformLoading")}
      </div>
    );
  }

  const isAnyLoading =
    loadingPassword || loadingGoogle || loadingMagicLink || authLoading;

  return (
    <AuthLayout title={t("login.title")} subtitle={t("login.subtitle")}>
      <div className="space-y-6">
        {/* Email/Password Form */}
        <form onSubmit={handleLoginPassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-password">{t("login.emailLabel")}</Label>
            <Input
              id="email-password"
              name="email-password"
              type="email"
              autoComplete="email"
              required
              value={emailPassword}
              onChange={(e) => setEmailPassword(e.target.value)}
              placeholder={t("login.emailPlaceholder")}
              disabled={isAnyLoading}
              className="h-11 bg-muted/30"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label htmlFor="password">{t("login.passwordLabel")}</Label>
            </div>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("login.passwordPlaceholder")}
              disabled={isAnyLoading}
              className="h-11 bg-muted/30"
            />
          </div>
          <div className="flex items-center justify-between">
            <div className="text-sm">
              {/* Placeholder for potential future 'Remember me' */}
            </div>
          </div>

          <Button
            type="submit"
            disabled={isAnyLoading}
            className="w-full h-11 text-base"
          >
            {loadingPassword
              ? t("login.signInButtonLoading")
              : t("login.signInButton")}
          </Button>
        </form>

        {/* Sign in with Google Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleLoginGoogle}
          disabled={isAnyLoading}
          className="w-full h-11 flex items-center justify-center gap-2 bg-background hover:bg-muted/50"
        >
          <GoogleIcon />
          <span>
            {loadingGoogle
              ? t("login.googleSignInLoading")
              : t("login.googleSignIn")}
          </span>
        </Button>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">
              {t("login.dividerText")}
            </span>
          </div>
        </div>

        {/* Magic Link Form */}
        <form onSubmit={handleLoginMagicLink} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email-magiclink">{t("login.magicLinkLabel")}</Label>
            <div className="flex gap-2">
              <Input
                id="email-magiclink"
                name="email-magiclink"
                type="email"
                autoComplete="email"
                required
                value={emailMagicLink}
                onChange={(e) => setEmailMagicLink(e.target.value)}
                placeholder={t("login.magicLinkPlaceholder")}
                disabled={isAnyLoading}
                className="h-11 bg-muted/30"
              />
              <Button
                type="submit"
                variant="secondary"
                disabled={isAnyLoading}
                className="shrink-0 h-11"
              >
                {loadingMagicLink
                  ? t("login.sendLinkButtonLoading")
                  : t("login.sendLinkButton")}
              </Button>
            </div>
          </div>
        </form>

        {/* Link to Signup page */}
        <div className="text-center text-sm text-muted-foreground mt-8">
          {t("login.noAccount")}{" "}
          <Link
            to="/signup"
            className="font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
          >
            {t("login.signUpLink")}
          </Link>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
