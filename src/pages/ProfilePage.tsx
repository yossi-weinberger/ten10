import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserInfoDisplay } from "@/components/UserInfoDisplay";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth
import { logger } from "@/lib/logger";
import { usePlatform } from "@/contexts/PlatformContext";

export function ProfilePage() {
  const { t, i18n } = useTranslation(["auth", "common"]);
  const { user } = useAuth(); // Get user from AuthContext
  const { platform } = usePlatform();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [profileLoading, setProfileLoading] = useState(true);
  const [profileSaving, setProfileSaving] = useState(false);
  const [initialFullName, setInitialFullName] = useState("");
  const [initialEmail, setInitialEmail] = useState("");
  const [userInfoRefreshKey, setUserInfoRefreshKey] = useState(0);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Determine if the user is an email/password user
  const isEmailPasswordUser = user?.app_metadata.provider === "email";
  const isWebPlatform = platform === "web";
  const canEditEmail = isEmailPasswordUser;

  useEffect(() => {
    if (!isWebPlatform || !user) {
      setProfileLoading(false);
      return;
    }

    let isMounted = true;
    setProfileLoading(true);

    const fetchProfile = async () => {
      try {
        const { data, error, status } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", user.id)
          .single();

        if (error && status !== 406) {
          throw error;
        }

        if (isMounted) {
          const fetchedFullName = data?.full_name ?? "";
          setFullName(fetchedFullName);
          setInitialFullName(fetchedFullName);
        }
      } catch (error: any) {
        logger.error("Error loading profile details:", error);
        if (isMounted) {
          toast.error(t("profile.loadError"));
        }
      } finally {
        if (isMounted) {
          const currentEmail = user.email ?? "";
          setEmail(currentEmail);
          setInitialEmail(currentEmail);
          setProfileLoading(false);
        }
      }
    };

    fetchProfile();

    return () => {
      isMounted = false;
    };
  }, [isWebPlatform, user, t]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isWebPlatform || !user) return;

    const trimmedFullName = fullName.trim();
    const trimmedEmail = email.trim();
    const fullNameChanged = trimmedFullName !== initialFullName;
    const emailChanged = canEditEmail && trimmedEmail !== initialEmail;

    if (!fullNameChanged && !emailChanged) {
      toast(t("profile.personalDetails.noChanges"));
      return;
    }

    setProfileSaving(true);

    try {
      if (fullNameChanged) {
        const { error } = await supabase
          .from("profiles")
          .update({ full_name: trimmedFullName || null })
          .eq("id", user.id);

        if (error) throw error;
        setInitialFullName(trimmedFullName);
      }

      if (emailChanged) {
        const { error } = await supabase.auth.updateUser({
          email: trimmedEmail,
        });

        if (error) throw error;
        setInitialEmail(trimmedEmail);
        toast.success(t("profile.personalDetails.emailUpdateNotice"));
      }

      if (fullNameChanged) {
        toast.success(t("profile.personalDetails.saveSuccess"));
      }

      if (fullNameChanged || emailChanged) {
        setUserInfoRefreshKey((prev) => prev + 1);
      }
    } catch (error: any) {
      logger.error("Error updating profile details:", error);
      toast.error(t("profile.personalDetails.saveError"));
    } finally {
      setProfileSaving(false);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error(t("profile.security.passwordsDoNotMatch"));
      return;
    }
    if (newPassword.length < 6) {
      toast.error(t("profile.security.passwordTooShort"));
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast.success(t("profile.security.updateSuccess"));
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      if (import.meta.env.DEV) {
        logger.error("Error updating password:", error);
      }
      toast.error(t("profile.security.updateError"));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="grid gap-6" dir={i18n.dir()}>
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold text-foreground">
          {t("profile.title")}
        </h2>
        <p className="text-muted-foreground">{t("profile.subtitle")}</p>
      </div>

      <UserInfoDisplay key={userInfoRefreshKey} />

      <div className="max-w-5xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.personalDetails.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handleProfileUpdate}>
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    {t("profile.personalDetails.fullNameLabel")}
                  </Label>
                  <Input
                    id="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={!isWebPlatform || profileLoading || profileSaving}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">
                    {t("profile.personalDetails.emailLabel")}
                  </Label>
                  {canEditEmail ? (
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      disabled={
                        !isWebPlatform || profileLoading || profileSaving
                      }
                    />
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          disabled
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {t("profile.personalDetails.emailLockedTooltip")}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={!isWebPlatform || profileLoading || profileSaving}
                >
                  {profileSaving
                    ? t("common:labels.loading")
                    : t("profile.personalDetails.saveButton")}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("profile.security.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4" onSubmit={handlePasswordUpdate}>
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">
                    {t("profile.security.newPasswordLabel")}
                  </Label>
                  {isEmailPasswordUser ? (
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      disabled={false}
                    />
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          id="newPassword"
                          type="password"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          required
                          disabled
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {t("profile.security.passwordLockedTooltip")}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">
                    {t("profile.security.confirmPasswordLabel")}
                  </Label>
                  {isEmailPasswordUser ? (
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={false}
                    />
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Input
                          id="confirmPassword"
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                          disabled
                        />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {t("profile.security.passwordLockedTooltip")}
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
                <Button
                  type="submit"
                  disabled={passwordLoading || !isEmailPasswordUser}
                >
                  {passwordLoading
                    ? t("profile.security.loading")
                    : t("profile.security.updatePasswordButton")}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
