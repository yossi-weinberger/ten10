import React from "react";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { MonthlyChart } from "@/components/dashboard/MonthlyChart";
export function HomePage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold">ברוכים הבאים ל-Ten10</h2>
        <p className="text-muted-foreground">
          נהל את ההכנסות והתרומות שלך בקלות ובפשטות
        </p>
      </div>

      <StatsCards />
      <MonthlyChart />
      {/* <AllTransactionsDataTable /> */}
    </div>
  );
}
