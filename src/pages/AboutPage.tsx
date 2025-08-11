import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calculator, Heart } from "lucide-react";
import { useTranslation } from "react-i18next";

export function AboutPage() {
  const { t, i18n } = useTranslation("about");

  return (
    <div className="grid gap-6" dir={i18n.dir()}>
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold text-foreground">
          {t("page.title")}
        </h2>
        <p className="text-muted-foreground">{t("page.subtitle")}</p>
      </div>

      <div className="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              {t("appInfo.title")}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <p>{t("appInfo.description1")}</p>
            <p>{t("appInfo.description2")}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="h-5 w-5" />
              {t("thanks.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t("thanks.description")}</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
