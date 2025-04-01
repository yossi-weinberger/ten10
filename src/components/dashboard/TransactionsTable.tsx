import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useDonationStore } from '@/lib/store';

const columns = [
  {
    accessorKey: 'date',
    header: 'תאריך',
    cell: ({ row }) => format(new Date(row.getValue('date')), 'dd/MM/yyyy'),
  },
  {
    accessorKey: 'type',
    header: 'סוג',
    cell: ({ row }) => row.getValue('type') === 'income' ? 'הכנסה' : 'תרומה',
  },
  {
    accessorKey: 'description',
    header: 'תיאור',
    cell: ({ row }) => row.getValue('type') === 'income' ? row.original.description : row.original.recipient,
  },
  {
    accessorKey: 'amount',
    header: 'סכום',
    cell: ({ row }) => formatCurrency(row.getValue('amount'), row.original.currency),
  },
  {
    accessorKey: 'details',
    header: 'פרטים נוספים',
    cell: ({ row }) => {
      if (row.getValue('type') === 'income') {
        return row.original.isChomesh ? 'חומש' : '';
      }
      return '';
    },
  }
];

interface TransactionsTableProps {
  dateRange: { from: Date; to: Date };
  onDateRangeChange: (range: { from: Date; to: Date }) => void;
}

export function TransactionsTable({ dateRange, onDateRangeChange }: TransactionsTableProps) {
  const { incomes, donations } = useDonationStore();
  const [type, setType] = React.useState<'all' | 'income' | 'donation'>('all');

  const combinedData = React.useMemo(() => {
    const allData = [
      ...incomes.map(income => ({
        ...income,
        type: 'income',
        searchableText: `${income.description} ${income.amount} ${income.isChomesh ? 'חומש' : ''}`
      })),
      ...donations.map(donation => ({
        ...donation,
        type: 'donation',
        searchableText: `${donation.recipient} ${donation.amount}`
      }))
    ].filter(item => {
      const itemDate = new Date(item.date);
      const matchesType = type === 'all' || item.type === type;
      const matchesDate = (!dateRange.from || itemDate >= dateRange.from) &&
                         (!dateRange.to || itemDate <= dateRange.to);
      return matchesType && matchesDate;
    });

    return allData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incomes, donations, type, dateRange]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>היסטוריית פעולות</CardTitle>
        <div className="flex gap-4">
          <DatePickerWithRange 
            date={dateRange}
            onDateChange={onDateRangeChange}
          />
          <Select value={type} onValueChange={(value: 'all' | 'income' | 'donation') => setType(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="סוג פעולה" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="income">הכנסות</SelectItem>
              <SelectItem value="donation">תרומות</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        <DataTable columns={columns} data={combinedData} type="all" />
      </CardContent>
    </Card>
  );
}