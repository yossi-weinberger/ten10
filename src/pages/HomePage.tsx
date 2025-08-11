import React from "react";
import { useTranslation } from "react-i18next";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";

export function HomePage() {
  const { t } = useTranslation("dashboard");

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold text-foreground">
          {t("homePage.title")}
        </h2>
        <p className="text-muted-foreground">{t("homePage.subtitle")}</p>
      </div>

      <StatsCards />
      <MonthlyChart />
    </div>
  );
}
