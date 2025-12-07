import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserInfoDisplay } from "@/components/UserInfoDisplay";
import { useTranslation } from "react-i18next";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { toast } from "react-hot-toast";
import { useAuth } from "@/contexts/AuthContext"; // Import useAuth
import { logger } from "@/lib/logger";

export function ProfilePage() {
  const { t, i18n } = useTranslation(["auth", "common"]);
  const { user } = useAuth(); // Get user from AuthContext
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // Determine if the user is an email/password user
  const isEmailPasswordUser = user?.app_metadata.provider === "email";

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

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) throw error;
      toast.success(t("profile.security.updateSuccess"));
      setNewPassword("");
      setConfirmPassword("");
    } catch (error: any) {
      if (process.env.NODE_ENV === "development") {
        logger.error("Error updating password:", error);
      }
      toast.error(t("profile.security.updateError"));
    } finally {
      setLoading(false);
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

      <UserInfoDisplay />

      <div className="max-w-5xl mx-auto w-full">
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>{t("profile.personalDetails.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="name">
                    {t("profile.personalDetails.fullNameLabel")}
                  </Label>
                  <Input id="name" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">
                    {t("profile.personalDetails.emailLabel")}
                  </Label>
                  <Input id="email" type="email" />
                </div>
                <Button>{t("profile.personalDetails.saveButton")}</Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("profile.security.title")}</CardTitle>
            </CardHeader>
            <CardContent>
              {!isEmailPasswordUser && (
                <p className="text-sm text-muted-foreground mb-4">
                  {t("profile.security.googleUserMessage")}
                </p>
              )}
              <form className="grid gap-4" onSubmit={handlePasswordUpdate}>
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">
                    {t("profile.security.newPasswordLabel")}
                  </Label>
                  <Input
                    id="newPassword"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    disabled={!isEmailPasswordUser}
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="confirmPassword">
                    {t("profile.security.confirmPasswordLabel")}
                  </Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={!isEmailPasswordUser}
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loading || !isEmailPasswordUser}
                >
                  {loading
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
