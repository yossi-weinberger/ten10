import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserInfoDisplay } from "@/components/UserInfoDisplay";
import { useTranslation } from "react-i18next";

export function ProfilePage() {
  const { t, i18n } = useTranslation("auth");

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
              <form className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="currentPassword">
                    {t("profile.security.currentPasswordLabel")}
                  </Label>
                  <Input id="currentPassword" type="password" />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="newPassword">
                    {t("profile.security.newPasswordLabel")}
                  </Label>
                  <Input id="newPassword" type="password" />
                </div>
                <Button>{t("profile.security.updatePasswordButton")}</Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
