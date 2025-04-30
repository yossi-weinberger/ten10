import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
// import { IncomeForm } from '@/components/IncomeForm'; // Comment out old form import
import { TransactionForm } from "@/components/forms/TransactionForm"; // Import the new form
// import { TransactionsDataTable } from '@/components/tables/TransactionsDataTable'; // Comment out old table
import { AllTransactionsDataTable } from "@/components/tables/AllTransactionsDataTable"; // Import new table
import { StatsCards } from "@/components/dashboard/StatsCards";

export function IncomePage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold">הוספת תנועה (זמני)</h2>{" "}
        {/* Changed title to reflect temporary state */}
        <p className="text-muted-foreground">
          השתמש בטופס זה להוספת כל סוגי התנועות (הכנסות, תרומות, הוצאות וכו')
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>הוסף תנועה חדשה</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Replace IncomeForm with TransactionForm */}
            <TransactionForm />
          </CardContent>
        </Card>

        <div className="space-y-6">
          {/* Keep StatsCards for now, though they use old data */}
          <StatsCards orientation="vertical" />
        </div>
      </div>

      {/* Replace old DataTable with the new one */}
      <AllTransactionsDataTable title="היסטוריית תנועות" showFilters={true} />
    </div>
  );
}
