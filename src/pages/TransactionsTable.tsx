import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Repeat } from "lucide-react";
import { usePlatform } from "@/contexts/PlatformContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionsTableDisplay } from "@/components/TransactionsTable/TransactionsTableDisplay";
import { useMediaQuery } from "@/hooks/use-media-query";
import { MOBILE_CARD_QUERY, MOBILE_PAGE_NAV_BUTTON_CLASS } from "@/lib/responsive";
import { cn } from "@/lib/utils";

export function TransactionsTable() {
  const { t } = useTranslation("data-tables");
  const { platform } = usePlatform();
  const navigate = useNavigate();
  const compactHeader = useMediaQuery(MOBILE_CARD_QUERY);

  if (platform === "loading") {
    return (
      <div className="container mx-auto py-4">
        <h1 className="text-3xl font-bold text-center mb-6 text-foreground max-md:sr-only mobile-landscape:sr-only">
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
    <div className="container mx-auto py-4 max-md:px-0">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between max-md:px-4">
        <h1 className="text-2xl font-bold text-foreground max-md:sr-only mobile-landscape:sr-only">
          {t("transactionsTable.pageTitle")}
        </h1>
        <Button
          variant={compactHeader ? "outline" : "default"}
          className={cn(compactHeader && MOBILE_PAGE_NAV_BUTTON_CLASS)}
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
