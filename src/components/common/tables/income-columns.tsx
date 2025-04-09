import { ColumnDef } from '@tanstack/react-table';
import { Button } from '@/components/ui/button';
import { MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Income } from '@/lib/store';
import { useDonationStore } from '@/lib/store';
import { formatHebrewDate } from '@/lib/hebrew-date';

export const columns: ColumnDef<Income>[] = [
  {
    accessorKey: 'date',
    header: 'תאריך',
    cell: ({ row }) => {
      const { settings } = useDonationStore.getState();
      const date = new Date(row.getValue('date'));
      return settings.calendarType === 'hebrew' 
        ? formatHebrewDate(date)
        : new Intl.DateTimeFormat('he-IL').format(date);
    }
  },
  {
    accessorKey: 'description',
    header: 'תיאור',
  },
  {
    accessorKey: 'amount',
    header: 'סכום',
    cell: ({ row }) => {
      const amount = parseFloat(row.getValue('amount'));
      const currency = row.original.currency || 'ILS';
      return new Intl.NumberFormat('he-IL', {
        style: 'currency',
        currency,
      }).format(amount);
    },
  },
  {
    accessorKey: 'isChomesh',
    header: 'חומש',
    cell: ({ row }) => (row.getValue('isChomesh') ? 'כן' : 'לא'),
  },
  {
    accessorKey: 'isRecurring',
    header: 'תשלום קבוע',
    cell: ({ row }) => (row.getValue('isRecurring') ? 'כן' : 'לא'),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const income = row.original;
 
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">פתח תפריט</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>פעולות</DropdownMenuLabel>
            <DropdownMenuItem>ערוך הכנסה</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              מחק הכנסה
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];