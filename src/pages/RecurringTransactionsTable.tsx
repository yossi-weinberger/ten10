import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { List } from "lucide-react";
import { usePlatform } from "@/contexts/PlatformContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MOBILE_CARD_QUERY } from "@/lib/responsive";
import { cn } from "@/lib/utils";
import { RecurringTransactionsTableDisplay } from "@/components/TransactionsTable/RecurringTransactionsTableDisplay";

export function RecurringTransactionsTable() {
  const { t } = useTranslation("data-tables");
  const { platform } = usePlatform();
  const navigate = useNavigate();
  const compactHeader = useMediaQuery(MOBILE_CARD_QUERY);

  if (platform === "loading") {
    return (
      <div className="container mx-auto py-4">
        <h1
          className={cn(
            "text-3xl font-bold text-center mb-6 text-foreground",
            compactHeader && "sr-only",
          )}
        >
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
    <div className="container mx-auto py-4 max-md:px-0">
      <div
        className={cn(
          "mb-6 flex max-md:px-4",
          compactHeader
            ? "items-start"
            : "flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <h1 className={cn("text-2xl font-bold text-foreground", compactHeader && "sr-only")}>
          {t("recurringTable.title")}
        </h1>
        <Button
          variant={compactHeader ? "ghost" : "outline"}
          className={cn(compactHeader && "h-9 self-start px-2")}
          onClick={() => navigate({ to: "/transactions-table" })}
        >
          <List aria-hidden="true" data-icon="inline-start" />
          {t("buttons.backToTransactions")}
        </Button>
      </div>
      <RecurringTransactionsTableDisplay />
    </div>
  );
}
