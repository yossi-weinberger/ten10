import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { useTranslation } from "react-i18next";

import { usePlatform } from "@/contexts/PlatformContext";
import { supabase } from "@/lib/supabaseClient";
import { logger } from "@/lib/logger";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

const ResetPasswordPage: React.FC = () => {
  const { platform } = usePlatform();
  const navigate = useNavigate();
  const { t } = useTranslation("auth");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const passwordsMatch = useMemo(
    () => password.length > 0 && password === confirmPassword,
    [password, confirmPassword]
  );

  useEffect(() => {
    let isMounted = true;

    // Keep UI responsive to the canonical recovery event.
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        if (event === "PASSWORD_RECOVERY") {
          setHasSession(true);
          return;
        }
        if (event === "SIGNED_IN" && session) {
          setHasSession(true);
        }
      }
    );

    // PKCE flow: the redirect might include ?code=... which should be exchanged for a session.
    // Even if detectSessionInUrl handles this automatically, explicitly exchanging here makes
    // the flow more robust across environments.
    const run = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (!error) {
            url.searchParams.delete("code");
            window.history.replaceState({}, document.title, url.toString());
          }
        }

        const { data } = await supabase.auth.getSession();
        if (!isMounted) return;
        setHasSession(!!data.session);
      } catch {
        if (!isMounted) return;
        setHasSession(false);
      }
    };

    void run();

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const handleResetPassword = async (event: React.FormEvent) => {
    event.preventDefault();

    if (password.length < 6) {
      toast.error(t("resetPassword.errors.passwordTooShort"));
      return;
    }
    if (!passwordsMatch) {
      toast.error(t("resetPassword.errors.passwordsDoNotMatch"));
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        toast.error(t("resetPassword.errors.invalidOrExpiredLink"));
        return;
      }

      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast.success(t("resetPassword.toasts.success"));
      navigate({ to: "/" });
    } catch (error: any) {
      logger.error("Error resetting password:", error);
      toast.error(error?.message || t("resetPassword.toasts.error"));
    } finally {
      setLoading(false);
    }
  };

  if (platform === "desktop") {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("resetPassword.title")}</CardTitle>
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

  if (hasSession === false) {
    return (
      <AuthLayout
        title={t("resetPassword.title")}
        subtitle={t("resetPassword.subtitle")}
      >
        <div className="space-y-6">
          <div className="text-sm text-muted-foreground">
            {t("resetPassword.errors.invalidOrExpiredLink")}
          </div>
          <div className="text-center text-sm text-muted-foreground">
            <Link
              to="/forgot-password"
              className="font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              {t("resetPassword.requestNewLink")}
            </Link>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t("resetPassword.title")}
      subtitle={t("resetPassword.subtitle")}
    >
      <form onSubmit={handleResetPassword} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="new-password">
            {t("resetPassword.newPasswordLabel")}
          </Label>
          <Input
            id="new-password"
            name="new-password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder={t("resetPassword.newPasswordPlaceholder")}
            disabled={loading}
            className="h-11 bg-muted/30"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm-new-password">
            {t("resetPassword.confirmPasswordLabel")}
          </Label>
          <Input
            id="confirm-new-password"
            name="confirm-new-password"
            type="password"
            autoComplete="new-password"
            required
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t("resetPassword.confirmPasswordPlaceholder")}
            disabled={loading}
            className="h-11 bg-muted/30"
          />
        </div>

        <Button
          type="submit"
          disabled={loading}
          className="w-full h-11 text-base"
        >
          {loading
            ? t("resetPassword.updateButtonLoading")
            : t("resetPassword.updateButton")}
        </Button>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;
