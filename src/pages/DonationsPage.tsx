import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DonationForm } from '@/components/DonationForm';
import { TransactionsDataTable } from '@/components/tables/TransactionsDataTable';
import { StatsCards } from '@/components/dashboard/StatsCards';

export function DonationsPage() {
  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h2 className="text-2xl font-bold">ניהול תרומות</h2>
        <p className="text-muted-foreground">
          הוסף, ערוך וצפה בתרומות שלך
        </p>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>הוספת תרומה</CardTitle>
          </CardHeader>
          <CardContent>
            <DonationForm />
          </CardContent>
        </Card>
        
        <div className="space-y-6">
          <StatsCards orientation="vertical" />
        </div>
      </div>

      <TransactionsDataTable 
        type="donation" 
        title="היסטוריית תרומות"
      />
    </div>
  );
}