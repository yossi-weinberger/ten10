import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { IncomeForm } from '@/components/IncomeForm';
import { DonationForm } from '@/components/DonationForm';

export function FormTabs() {
  return (
    <Tabs defaultValue="income" className="space-y-4">
      <TabsList className="w-full justify-start">
        <TabsTrigger value="income">הכנסות</TabsTrigger>
        <TabsTrigger value="donations">תרומות</TabsTrigger>
      </TabsList>
      <TabsContent value="income" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>הוספת הכנסה</CardTitle>
          </CardHeader>
          <CardContent>
            <IncomeForm />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="donations" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>הוספת תרומה</CardTitle>
          </CardHeader>
          <CardContent>
            <DonationForm />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}