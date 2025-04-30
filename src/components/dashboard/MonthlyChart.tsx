import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils";
import { addMonths, format } from "date-fns";
import { he } from "date-fns/locale";
import { Transaction } from "@/types/transaction";

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
  const transactions = useDonationStore((state) => state.transactions);

  const chartData = React.useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = addMonths(new Date(), -i);
      return { year: date.getFullYear(), month: date.getMonth() };
    }).reverse();

    return last6Months.map(({ year, month }) => {
      const monthTransactions = transactions.filter((t) => {
        const date = new Date(t.date);
        return date.getFullYear() === year && date.getMonth() === month;
      });

      const monthIncomes = monthTransactions
        .filter((t) => t.type === "income")
        .reduce((sum, t) => sum + t.amount, 0);

      const monthDonations = monthTransactions
        .filter((t) => t.type === "donation")
        .reduce((sum, t) => sum + t.amount, 0);

      // Calculate monthly expenses
      const monthExpenses = monthTransactions
        .filter((t) => t.type === "expense" || t.type === "recognized-expense") // Include both expense types
        .reduce((sum, t) => sum + t.amount, 0);

      const monthLabel = format(new Date(year, month), "MMM yyyy", {
        locale: he,
      });

      return {
        month: monthLabel,
        הכנסות: monthIncomes,
        תרומות: monthDonations,
        הוצאות: monthExpenses, // Add expenses to chart data
      };
    });
  }, [transactions]);

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
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="month"
              className="text-sm font-medium"
              tick={{ fill: "currentColor" }}
            />
            <YAxis
              className="text-sm font-medium"
              tick={{ fill: "currentColor" }}
              tickFormatter={(value) => `₪${value.toLocaleString()}`}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ fill: "rgba(200, 200, 200, 0.1)" }}
            />
            <Legend
              wrapperStyle={{ paddingTop: "20px" }}
              formatter={(value) => (
                <span className="text-sm font-medium">{value}</span>
              )}
            />
            {/* Income Bar - Green */}
            <Bar
              dataKey="הכנסות"
              // Use appropriate green color (Tailwind or HSL)
              fill="hsl(142.1 70.6% 45.3%)" // Example green
              radius={[4, 4, 0, 0]}
            />
            {/* Expense Bar - Red */}
            <Bar
              dataKey="הוצאות"
              // Use appropriate red color
              fill="hsl(0 72.2% 50.6%)" // Example red
              radius={[4, 4, 0, 0]}
            />
            {/* Donation Bar - Yellow/Gold */}
            <Bar
              dataKey="תרומות"
              // Use appropriate yellow color
              fill="hsl(47.9 95.8% 53.1%)" // Example yellow
              radius={[4, 4, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
