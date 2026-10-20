import React, { useState } from "react";
import { useNavigate, Link } from "@tanstack/react-router";
import { usePlatform } from "@/contexts/PlatformContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { GoogleIcon } from "@/components/icons/GoogleIcon";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { trackProductEvent } from "@/lib/analytics/productAnalytics";

const SignupPage: React.FC = () => {
  const { platform } = usePlatform();
  const { loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation("auth");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [optOutMarketing, setOptOutMarketing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const handleSignupGoogle = async () => {
    setLoadingGoogle(true);
    try {
      const isDevelopment = import.meta.env.DEV;
      const redirectURL = isDevelopment
        ? "http://localhost:5173"
        : window.location.origin;

      logger.log(
        `[SignupPage] Using redirectTo for Google OAuth: ${redirectURL}`
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
      logger.error("Error signing up with Google:", error);
      toast.error(
        error.error_description ||
          error.message ||
          t("login.toasts.googleError")
      );
      setLoadingGoogle(false);
    }
  };

  const handleSignup = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password !== confirmPassword) {
      toast.warning(t("signup.toasts.passwordMismatch"));
      return;
    }
    setLoading(true);
    let signedUpUserId: string | undefined = undefined;

    try {
      const trimmedFullName = fullName.trim();
      const mailingListConsent = !optOutMarketing;
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: trimmedFullName,
            mailing_list_consent: mailingListConsent,
          },
        },
      });

      if (signUpError) throw signUpError;

      signedUpUserId = data.user?.id;

      if (data.session && signedUpUserId) {
        sessionStorage.setItem("forceDbFetchOnLoad", "true");
        const { error: updateError } = await supabase
          .from("profiles")
          .update({
            full_name: trimmedFullName,
            mailing_list_consent: mailingListConsent,
          })
          .eq("id", signedUpUserId);

        if (updateError) {
          toast.error(t("signup.toasts.profileUpdateError"));
          logger.error("Error updating profile after signup:", updateError);
        } else {
          toast.success(t("signup.toasts.signupSuccess"));
        }
        trackProductEvent("signup_completed", {
          method: "email",
          requires_email_confirm: false,
        });
        navigate({ to: "/" });
      } else if (data.user) {
        toast.success(t("signup.toasts.signupCompleteEmailConfirm"));
        trackProductEvent("signup_completed", {
          method: "email",
          requires_email_confirm: true,
        });
        setEmail("");
        setPassword("");
        setConfirmPassword("");
        setFullName("");
        setOptOutMarketing(false);
      } else {
        toast.error(t("signup.toasts.unexpectedError"));
      }
    } catch (error: any) {
      logger.error("Error signing up:", error);
      toast.error(
        error.error_description ||
          error.message ||
          t("signup.toasts.signupError")
      );
    } finally {
      setLoading(false);
    }
  };

  if (platform === "desktop") {
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-screen bg-background">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{t("signup.title")}</CardTitle>
            <CardDescription>{t("signup.onlyWebAvailable")}</CardDescription>
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

  const isAnyLoading = loading || loadingGoogle || authLoading;

  return (
    <AuthLayout title={t("signup.title")} subtitle={t("signup.subtitle")}>
      <div className="space-y-6 short:space-y-4">
        {/* Sign up with Google */}
        <Button
          type="button"
          variant="outline"
          onClick={handleSignupGoogle}
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

        <form onSubmit={handleSignup} className="space-y-5 short:space-y-3">
          <div className="space-y-2">
            <Label htmlFor="full-name">{t("signup.fullNameLabel")}</Label>
            <Input
              id="full-name"
              name="full-name"
              type="text"
              autoComplete="name"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder={t("signup.fullNamePlaceholder")}
              disabled={isAnyLoading}
              className="h-11 bg-muted/30"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t("signup.emailLabel")}</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("signup.emailPlaceholder")}
              disabled={isAnyLoading}
              className="h-11 bg-muted/30"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t("signup.passwordLabel")}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t("signup.passwordPlaceholder")}
                disabled={isAnyLoading}
                className="h-11 bg-muted/30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">
                {t("signup.confirmPasswordLabel")}
              </Label>
              <Input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t("signup.confirmPasswordPlaceholder")}
                disabled={isAnyLoading}
                className="h-11 bg-muted/30"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-start space-x-2 rtl:space-x-reverse">
              <Checkbox
                id="opt-out-marketing"
                checked={optOutMarketing}
                onCheckedChange={(checked) =>
                  setOptOutMarketing(checked as boolean)
                }
                disabled={isAnyLoading}
                className="mt-0.5"
              />
              <div className="flex-1 space-y-1.5">
                <Label
                  htmlFor="opt-out-marketing"
                  className="text-sm font-normal cursor-pointer text-muted-foreground leading-snug"
                >
                  {t("signup.optOutMarketingLabel")}
                </Label>
                <p className="text-xs text-muted-foreground leading-snug">
                  {t("signup.emailUsageNotice")}
                </p>
              </div>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isAnyLoading}
            className="w-full h-11 text-base mt-4"
          >
            {isAnyLoading
              ? t("signup.signUpButtonLoading")
              : t("signup.signUpButton")}
          </Button>

          <p className="text-xs text-center text-muted-foreground mt-3 max-w-sm mx-auto leading-relaxed">
            {t("signup.termsNotice")}{" "}
            <Link to="/terms" className="text-primary hover:underline whitespace-nowrap">
              {t("signup.termsNoticePrivacy")}
            </Link>
            {" "}
            {t("signup.termsNoticeAnd")}
            {i18n.dir() === "rtl" ? "" : " "}
            <Link to="/privacy" className="text-primary hover:underline whitespace-nowrap">
              {t("signup.termsNoticePrivacyLink")}
            </Link>
            {t("signup.termsNoticeSuffix")}
          </p>

          <div className="text-center text-sm text-muted-foreground mt-6 short:mt-3">
            {t("signup.hasAccount")}{" "}
            <Link
              to="/login"
              className="font-medium text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              {t("signup.signInLink")}
            </Link>
          </div>
        </form>
      </div>
    </AuthLayout>
  );
};

export default SignupPage;
