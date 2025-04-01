import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { IncomeForm } from '@/components/IncomeForm';
import { TransactionsDataTable } from '@/components/tables/TransactionsDataTable';
import { StatsCards } from '@/components/dashboard/StatsCards';

export function IncomePage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold">ניהול הכנסות</h2>
        <p className="text-muted-foreground">
          הוסף, ערוך וצפה בהכנסות שלך
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>הוספת הכנסה</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeForm />
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <StatsCards orientation="vertical" />
        </div>
      </div>

      <TransactionsDataTable 
        type="income" 
        title="היסטוריית הכנסות"
      />
    </div>
  );
}