import React from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
  ColumnFiltersState,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileSpreadsheet, FileText, FileJson } from 'lucide-react';
import { exportToExcel, exportToPDF } from '@/lib/utils';
import { useDonationStore } from '@/lib/store';
import { useShallow } from 'zustand/react/shallow';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  type?: 'income' | 'donation' | 'all';
}

export function DataTable<TData, TValue>({
  columns,
  data,
  type = 'all',
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const { settings, incomes, donations } = useDonationStore(
    useShallow((state: DonationStoreState) => ({
      settings: state.settings,
      incomes: state.incomes,
      donations: state.donations,
    }))
  );

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, columnId, filterValue) => {
      const searchableText = row.original.searchableText as string;
      if (!searchableText) return false;
      return searchableText.toLowerCase().includes(filterValue.toLowerCase());
    },
  });

  const handleExportExcel = () => {
    if (type === 'income') {
      exportToExcel(incomes, [], settings.defaultCurrency);
    } else if (type === 'donation') {
      exportToExcel([], donations, settings.defaultCurrency);
    } else {
      exportToExcel(incomes, donations, settings.defaultCurrency);
    }
  };

  const handleExportPDF = () => {
    if (type === 'income') {
      exportToPDF(incomes, [], settings.defaultCurrency);
    } else if (type === 'donation') {
      exportToPDF([], donations, settings.defaultCurrency);
    } else {
      exportToPDF(incomes, donations, settings.defaultCurrency);
    }
  };

  const handleExportCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      data.map(row => Object.values(row as any).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `export-${type}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div>
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="חיפוש..."
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExportExcel}>
            <FileSpreadsheet className="h-4 w-4 ml-2" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <FileText className="h-4 w-4 ml-2" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportCSV}>
            <FileJson className="h-4 w-4 ml-2" />
            CSV
          </Button>
        </div>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  אין נתונים להצגה
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          הקודם
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          הבא
        </Button>
      </div>
    </div>
  );
}