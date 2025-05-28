import React from "react";
import { usePlatform } from "@/contexts/PlatformContext";
import { Card, CardContent } from "@/components/ui/card";
import { TransactionsTableDisplay } from "@/components/TransactionsTable/TransactionsTableDisplay";

export function TransactionsTable() {
  const { platform } = usePlatform();

  if (platform === "loading") {
    return (
      <div className="container mx-auto py-4">
        <h1 className="text-3xl font-bold text-center mb-6">טבלת תנועות</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center">טוען נתוני פלטפורמה...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-4">
      <h1 className="text-3xl font-bold text-center mb-6">טבלת תנועות</h1>
      <TransactionsTableDisplay />
    </div>
  );
}
