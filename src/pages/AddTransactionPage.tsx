import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { ImportBanner } from "@/components/import/ImportBanner";

export function AddTransactionPage() {
  const { t } = useTranslation("transactions");

  return (
    <div className="grid gap-6">
      <div className="grid gap-1">
        <h2 className="text-2xl font-bold text-foreground">
          {t("addTransactionPage.title")}
        </h2>
        <p className="text-muted-foreground text-sm">
          {t("addTransactionPage.subtitle")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3 md:items-start">
        <div className="md:col-span-2 space-y-3">
          <ImportBanner />
          <Card>
            <CardHeader></CardHeader>
            <CardContent>
              <TransactionForm />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6 md:col-span-1">
          <StatsCards orientation="vertical" />
        </div>
      </div>
    </div>
  );
}
