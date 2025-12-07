import React from "react";
import { useTranslation } from "react-i18next";
import { usePlatform } from "@/contexts/PlatformContext";
import { Card, CardContent } from "@/components/ui/card";
import { RecurringTransactionsTableDisplay } from "@/components/TransactionsTable/RecurringTransactionsTableDisplay";

export function RecurringTransactionsTable() {
  const { t } = useTranslation("data-tables");
  const { platform } = usePlatform();

  if (platform === "loading") {
    return (
      <div className="container mx-auto py-4">
        <h1 className="text-3xl font-bold text-center mb-6 text-foreground">
          {t("recurringTable.title")}
        </h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center">{t("transactionsTable.loading")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4">
      <h1 className="text-3xl font-bold text-center mb-6 text-foreground">
        {t("recurringTable.title")}
      </h1>
      <RecurringTransactionsTableDisplay />
    </div>
  );
}
