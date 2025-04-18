import React from "react";
import { StatsCards } from "@/components/common/dashboard/StatsCards";
import { MonthlyChart } from "@/components/common/dashboard/MonthlyChart";
import { TransactionsDataTable } from "@/components/common/tables/TransactionsDataTable";

export function HomePage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold">ברוכים הבאים ל-Tenten</h2>
        <p className="text-muted-foreground">
          נהל את ההכנסות והתרומות שלך בקלות ובפשטות
        </p>
      </div>

      <StatsCards />
      <MonthlyChart />
      <TransactionsDataTable type="all" />
    </div>
  );
}
