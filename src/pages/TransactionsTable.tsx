import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Repeat } from "lucide-react";
import { usePlatform } from "@/contexts/PlatformContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionsTableDisplay } from "@/components/TransactionsTable/TransactionsTableDisplay";

export function TransactionsTable() {
  const { t } = useTranslation("data-tables");
  const { platform } = usePlatform();
  const navigate = useNavigate();

  if (platform === "loading") {
    return (
      <div className="container mx-auto py-4">
        <h1 className="text-3xl font-bold text-center mb-6 text-foreground">
          {t("transactionsTable.pageTitle")}
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold text-foreground">
          {t("transactionsTable.pageTitle")}
        </h1>
        <Button
          onClick={() =>
            navigate({ to: "/transactions-table/recurring-transactions" })
          }
        >
          <Repeat aria-hidden="true" data-icon="inline-start" />
          {t("buttons.showRecurring")}
        </Button>
      </div>
      <TransactionsTableDisplay />
    </div>
  );
}
