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
import { Separator } from "@/components/ui/separator";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AuthLayout } from "@/components/layout/AuthLayout";

const LoginPage: React.FC = () => {
  const { platform } = usePlatform();
  const { loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation("auth");

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
        {/* Sign in with Google Button */}
        <Button
          type="button"
          variant="outline"
          onClick={handleLoginGoogle}
          disabled={isAnyLoading}
          className="w-full h-11 flex items-center justify-center gap-2 bg-background hover:bg-muted/50 hover:text-foreground"
        >
          <GoogleIcon />
          <span>
            {loadingGoogle
              ? t("login.googleSignInLoading")
              : t("login.googleSignIn")}
          </span>
        </Button>

        <Separator className="opacity-60" />

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

        <Separator className="opacity-60" />

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
