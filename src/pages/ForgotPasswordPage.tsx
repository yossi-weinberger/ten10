import React, { useState } from "react";
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

const ForgotPasswordPage: React.FC = () => {
  const { platform } = usePlatform();
  const navigate = useNavigate();
  const { t } = useTranslation("auth");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendResetEmail = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const isDevelopment = import.meta.env.DEV;
      const baseUrl = isDevelopment
        ? "http://localhost:5173"
        : window.location.origin;
      const redirectTo = `${baseUrl}/reset-password`;

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (error) throw error;

      toast.success(t("forgotPassword.toasts.emailSent"));
      navigate({ to: "/login" });
    } catch (error: any) {
      logger.error("Error sending password reset email:", error);
      toast.error(error?.message || t("forgotPassword.toasts.error"));
    } finally {
      setLoading(false);
    }
  };

  if (platform === "desktop") {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("forgotPassword.title")}</CardTitle>
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

  return (
    <AuthLayout
      title={t("forgotPassword.title")}
      subtitle={t("forgotPassword.subtitle")}
    >
      <form onSubmit={handleSendResetEmail} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="forgot-email">{t("forgotPassword.emailLabel")}</Label>
          <Input
            id="forgot-email"
            name="forgot-email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("forgotPassword.emailPlaceholder")}
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
            ? t("forgotPassword.sendButtonLoading")
            : t("forgotPassword.sendButton")}
        </Button>

        <div className="text-center text-sm text-muted-foreground">
          <Link
            to="/login"
            className="font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
          >
            {t("forgotPassword.backToLogin")}
          </Link>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ForgotPasswordPage;
