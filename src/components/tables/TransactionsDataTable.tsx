import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-range-picker';
import { format } from 'date-fns';
import { formatCurrency } from '@/lib/utils';
import { useDonationStore } from '@/lib/store';
import { startOfMonth, endOfMonth } from 'date-fns';
import type { Income, Donation } from '@/lib/store';

interface TransactionsDataTableProps {
  type: 'income' | 'donation' | 'all';
  title?: string;
  showFilters?: boolean;
}

const columns = {
  income: [
    {
      accessorKey: 'date',
      header: 'תאריך',
      cell: ({ row }) => format(new Date(row.getValue('date')), 'dd/MM/yyyy'),
    },
    {
      accessorKey: 'description',
      header: 'תיאור',
    },
    {
      accessorKey: 'amount',
      header: 'סכום',
      cell: ({ row }) => formatCurrency(row.getValue('amount'), (row.original as Income).currency),
    },
    {
      accessorKey: 'isChomesh',
      header: 'חומש',
      cell: ({ row }) => row.getValue('isChomesh') ? 'כן' : 'לא',
    },
    {
      accessorKey: 'isRecurring',
      header: 'תשלום קבוע',
      cell: ({ row }) => row.getValue('isRecurring') ? 'כן' : 'לא',
    },
  ],
  donation: [
    {
      accessorKey: 'date',
      header: 'תאריך',
      cell: ({ row }) => format(new Date(row.getValue('date')), 'dd/MM/yyyy'),
    },
    {
      accessorKey: 'recipient',
      header: 'מקבל',
    },
    {
      accessorKey: 'amount',
      header: 'סכום',
      cell: ({ row }) => formatCurrency(row.getValue('amount'), (row.original as Donation).currency),
    },
    {
      accessorKey: 'isRecurring',
      header: 'תשלום קבוע',
      cell: ({ row }) => row.getValue('isRecurring') ? 'כן' : 'לא',
    },
  ],
  all: [
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
          return (row.original as Income).isChomesh ? 'חומש' : '';
        }
        return '';
      },
    }
  ]
};

export function TransactionsDataTable({ type, title, showFilters = true }: TransactionsDataTableProps) {
  const { incomes, donations } = useDonationStore();
  const [selectedType, setSelectedType] = React.useState<'all' | 'income' | 'donation'>(type === 'all' ? 'all' : type);
  const [dateRange, setDateRange] = React.useState({
    from: startOfMonth(new Date()),
    to: endOfMonth(new Date())
  });

  const data = React.useMemo(() => {
    let filteredData: any[] = [];

    if (type === 'income' || (type === 'all' && selectedType !== 'donation')) {
      filteredData.push(...incomes.map(income => ({
        ...income,
        type: 'income',
        searchableText: `${income.description} ${income.amount} ${income.isChomesh ? 'חומש' : ''}`
      })));
    }

    if (type === 'donation' || (type === 'all' && selectedType !== 'income')) {
      filteredData.push(...donations.map(donation => ({
        ...donation,
        type: 'donation',
        searchableText: `${donation.recipient} ${donation.amount}`
      })));
    }

    filteredData = filteredData.filter(item => {
      const itemDate = new Date(item.date);
      const matchesDate = (!dateRange.from || itemDate >= dateRange.from) &&
                         (!dateRange.to || itemDate <= dateRange.to);
      return matchesDate;
    });

    return filteredData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [incomes, donations, type, selectedType, dateRange]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title || 'היסטוריית פעולות'}</CardTitle>
        {showFilters && (
          <div className="flex gap-4">
            <DatePickerWithRange 
              date={dateRange}
              onDateChange={setDateRange}
            />
            {type === 'all' && (
              <Select value={selectedType} onValueChange={(value: 'all' | 'income' | 'donation') => setSelectedType(value)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="סוג פעולה" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">הכל</SelectItem>
                  <SelectItem value="income">הכנסות</SelectItem>
                  <SelectItem value="donation">תרומות</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>
        )}
      </CardHeader>
      <CardContent>
        <DataTable 
          columns={columns[type]} 
          data={data} 
          type={type}
        />
      </CardContent>
    </Card>
  );
}