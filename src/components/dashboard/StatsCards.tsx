import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { useDonationStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { Wallet, HandCoins, CircleDollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { startOfMonth, startOfYear } from 'date-fns';

type DateRange = 'month' | 'year' | 'all';

export function StatsCards({ orientation = 'horizontal' }: { orientation?: 'horizontal' | 'vertical' }) {
  const { incomes, donations, requiredDonation } = useDonationStore();
  const [dateRange, setDateRange] = React.useState<DateRange>('month');

  const getStartDate = (range: DateRange): Date => {
    switch (range) {
      case 'month':
        return startOfMonth(new Date());
      case 'year':
        return startOfYear(new Date());
      case 'all':
        return new Date(0); // תחילת הזמן
      default:
        return startOfMonth(new Date());
    }
  };

  const filterByDateRange = <T extends { date: string }>(items: T[]): T[] => {
    const startDate = getStartDate(dateRange);
    return items.filter(item => new Date(item.date) >= startDate);
  };

  const filteredIncomes = filterByDateRange(incomes);
  const filteredDonations = filterByDateRange(donations);

  const totalIncomes = filteredIncomes.reduce((sum, income) => sum + income.amount, 0);
  const totalDonations = filteredDonations.reduce((sum, donation) => sum + donation.amount, 0);
  const donationProgress = Math.min(100, (totalDonations / (totalDonations + requiredDonation)) * 100);

  const containerClass = orientation === 'horizontal' 
    ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3" 
    : "grid gap-4";

  const dateRangeLabels = {
    month: 'מתחילת החודש',
    year: 'מתחילת השנה',
    all: 'מאז ומתמיד'
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end gap-2">
        <Button
          variant={dateRange === 'month' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDateRange('month')}
        >
          {dateRangeLabels.month}
        </Button>
        <Button
          variant={dateRange === 'year' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDateRange('year')}
        >
          {dateRangeLabels.year}
        </Button>
        <Button
          variant={dateRange === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setDateRange('all')}
        >
          {dateRangeLabels.all}
        </Button>
      </div>

      <div className={containerClass}>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">סך ההכנסות</CardTitle>
            <Wallet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalIncomes)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {filteredIncomes.filter(i => i.isChomesh).length} הכנסות עם חומש
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">סך התרומות</CardTitle>
            <HandCoins className="h-5 w-5 text-green-600 dark:text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDonations)}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {((totalDonations / totalIncomes) * 100).toFixed(1)}% מסך ההכנסות
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">נדרש לתרומה</CardTitle>
            <CircleDollarSign className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(requiredDonation)}</div>
            <Progress value={donationProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-2">
              {donationProgress.toFixed(1)}% מהיעד הושלם
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
