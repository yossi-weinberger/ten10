import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { IncomeForm } from '@/components/IncomeForm'; // Comment out old form import
import { TransactionForm } from "@/components/forms/TransactionForm"; // Import the new form
// import { TransactionsDataTable } from '@/components/tables/TransactionsDataTable'; // Comment out old table
// import { AllTransactionsDataTable } from "@/components/tables/AllTransactionsDataTable"; // Import new table
import { StatsCards } from "@/components/dashboard/StatsCards";

export function AddTransactionPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold">הוספת תנועה</h2>{" "}
        {/* Adjusted title */}
        <p className="text-muted-foreground">
          הוספת כל סוגי התנועות: הכנסות, הוצאות, תרומות וכו'.
        </p>
      </div>

      {/* Change grid layout: Form takes 2/3, StatsCards take 1/3 */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Form Card (Spans 2 columns) */}
        <Card className="md:col-span-2">
          <CardHeader></CardHeader>
          <CardContent>
            <TransactionForm />
          </CardContent>
        </Card>

        {/* Stats Cards (Spans 1 column, already vertical) */}
        <div className="space-y-6 md:col-span-1">
          <StatsCards orientation="vertical" />
        </div>
      </div>
    </div>
  );
}
