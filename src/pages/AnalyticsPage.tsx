import React from "react";
import { useTranslation } from "react-i18next";

export function AnalyticsPage() {
  const { t } = useTranslation("dashboard");

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4 text-foreground">
        {t("analytics.title")}
      </h2>
      <p>{t("analytics.description")}</p>
      {/* TODO: Add charts and data analysis components */}
    </div>
  );
}
