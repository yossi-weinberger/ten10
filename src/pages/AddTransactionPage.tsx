import React from "react";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// This component will be rendered by the router at the '/add-transaction' path
export function AddTransactionPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>הוסף תנועה חדשה</CardTitle> {/* Changed title to Hebrew */}
        </CardHeader>
        <CardContent>
          <TransactionForm
          // Example: Add navigation on success
          // onSubmitSuccess={() => {
          //   // router.navigate({ to: '/' }); // Needs router instance
          //   console.log('Transaction Saved!');
          // }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
