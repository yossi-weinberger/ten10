import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useDonationStore } from '@/lib/store';
import { formatCurrency } from '@/lib/utils';
import { addMonths, format } from 'date-fns';
import { he } from 'date-fns/locale';

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-lg border border-gray-200 dark:bg-gray-800 dark:border-gray-700">
        <p className="font-bold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            />
            <span className="font-medium">{entry.name}:</span>
            <span>{formatCurrency(entry.value)}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export function MonthlyChart() {
  const { incomes, donations } = useDonationStore();

  const chartData = React.useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = addMonths(new Date(), -i);
      return format(date, 'MM/yyyy');
    }).reverse();

    return last6Months.map(month => {
      const [monthStr, yearStr] = month.split('/');
      const monthIncomes = incomes.filter(income => {
        const date = new Date(income.date);
        return date.getMonth() + 1 === parseInt(monthStr) && 
               date.getFullYear() === parseInt(yearStr);
      });
      const monthDonations = donations.filter(donation => {
        const date = new Date(donation.date);
        return date.getMonth() + 1 === parseInt(monthStr) && 
               date.getFullYear() === parseInt(yearStr);
      });

      return {
        month: format(new Date(`${yearStr}-${monthStr}-01`), 'MMM yyyy', { locale: he }),
        הכנסות: monthIncomes.reduce((sum, income) => sum + income.amount, 0),
        תרומות: monthDonations.reduce((sum, donation) => sum + donation.amount, 0),
      };
    });
  }, [incomes, donations]);

  return (
    <Card className="bg-gradient-to-br from-background to-muted/20">
      <CardHeader>
        <CardTitle>סיכום חודשי</CardTitle>
      </CardHeader>
      <CardContent className="h-[400px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart 
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
          >
            <CartesianGrid 
              strokeDasharray="3 3" 
              className="stroke-muted" 
            />
            <XAxis 
              dataKey="month" 
              className="text-sm font-medium"
              tick={{ fill: 'currentColor' }}
            />
            <YAxis 
              className="text-sm font-medium"
              tick={{ fill: 'currentColor' }}
              tickFormatter={(value) => `₪${value.toLocaleString()}`}
            />
            <Tooltip 
              content={<CustomTooltip />}
              cursor={{ fill: 'rgba(200, 200, 200, 0.1)' }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: '20px' }}
              formatter={(value) => <span className="text-sm font-medium">{value}</span>}
            />
            <Bar 
              dataKey="הכנסות" 
              fill="hsl(var(--primary))"
              radius={[4, 4, 0, 0]}
            />
            <Bar 
              dataKey="תרומות" 
              fill="hsl(var(--secondary))"
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}