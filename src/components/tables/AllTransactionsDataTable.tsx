import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table"; // Assuming this wrapper exists and works
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePickerWithRange } from "@/components/ui/date-range-picker"; // Assuming this exists
import { format } from "date-fns";
import { formatCurrency } from "@/lib/utils";
import { useDonationStore } from "@/lib/store";
import { startOfMonth, endOfMonth, startOfYear } from "date-fns";
import type { Transaction, TransactionType } from "@/types/transaction";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge"; // For displaying type/category nicely
import { DateRange } from "react-day-picker"; // Import DateRange
import { Button } from "@/components/ui/button";
import {
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { exportTransactionsToExcel } from "@/lib/utils/export-excel";
import { exportTransactionsToPDF } from "@/lib/utils/export-pdf";
import { FileDown, FileText, FileSpreadsheet } from "lucide-react";
import {
  transactionTypeLabels,
  typeBadgeColors,
} from "@/types/transactionLabels"; // Correct import

interface AllTransactionsDataTableProps {
  title?: string;
  showFilters?: boolean;
  defaultDateRange?: "month" | "year" | "all";
}

// Define columns for the new Transaction model
const transactionColumns: ColumnDef<Transaction>[] = [
  {
    accessorKey: "date",
    header: "תאריך",
    cell: ({ row }) => format(new Date(row.getValue("date")), "dd/MM/yyyy"),
  },
  {
    accessorKey: "type",
    header: "סוג",
    cell: ({ row }) => {
      const type = row.getValue("type") as TransactionType;
      return (
        <Badge
          variant="outline"
          className={cn(
            "font-medium",
            typeBadgeColors[type] || "border-gray-300"
          )}
        >
          {transactionTypeLabels[type] || type}
        </Badge>
      );
    },
    filterFn: (row, id, value) => value.includes(row.getValue(id)),
  },
  {
    accessorKey: "description",
    header: "תיאור / מקבל / קטגוריה",
    cell: ({ row }) => {
      const transaction = row.original;
      switch (transaction.type) {
        case "income":
        case "exempt-income":
          return transaction.description || "-";
        case "donation":
          return transaction.recipient || transaction.description || "-";
        case "expense":
        case "recognized-expense":
          return transaction.category || transaction.description || "-";
        default:
          return transaction.description || "-";
      }
    },
  },
  {
    accessorKey: "amount",
    header: "סכום",
    cell: ({ row }) => {
      const transaction = row.original;
      const amount = row.getValue("amount") as number;
      const currency = transaction.currency;
      return formatCurrency(amount, currency);
    },
  },
  {
    accessorKey: "is_chomesh",
    cell: ({ row }) => {
      const transaction = row.original;
      if (transaction.type === "income" && row.getValue("is_chomesh")) {
        return (
          <Check className="h-4 w-4 mx-auto text-green-600 dark:text-green-400" />
        );
      }
      return "";
    },
    header: ({ column }) => {
      return <div className="text-center">חומש?</div>;
    },
  },
];

// Helper array of transaction types for the filter dropdown
const filterableTypes: TransactionType[] = [
  "income",
  "donation",
  "expense",
  "exempt-income",
  "recognized-expense",
];

export function AllTransactionsDataTable({
  title = "היסטוריית תנועות",
  showFilters = true,
  defaultDateRange = "month",
}: AllTransactionsDataTableProps) {
  const allTransactions = useDonationStore((state) => state.transactions);
  // Use state for a single selected type or undefined
  const [selectedType, setSelectedType] = React.useState<
    TransactionType | undefined
  >(undefined);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(
    () => {
      const now = new Date();
      if (defaultDateRange === "month") {
        return { from: startOfMonth(now), to: endOfMonth(now) };
      } else if (defaultDateRange === "year") {
        return { from: startOfYear(now), to: undefined }; // Keep 'to' undefined for year/all initially?
      } else {
        // 'all'
        return undefined; // Represent 'all' dates with undefined range
      }
    }
  );

  const data = React.useMemo(() => {
    let filteredData = allTransactions;

    // Apply date range filter (using optional chaining for dateRange)
    filteredData = filteredData.filter((item) => {
      const itemDate = new Date(item.date);
      const fromDate = dateRange?.from ? new Date(dateRange.from) : null;
      const toDate = dateRange?.to ? new Date(dateRange.to) : null;
      if (fromDate) fromDate.setHours(0, 0, 0, 0);
      if (toDate) toDate.setHours(23, 59, 59, 999);
      // If dateRange is undefined, fromDate and toDate will be null, so all dates match
      const matchesDate =
        (!fromDate || itemDate >= fromDate) && (!toDate || itemDate <= toDate);
      return matchesDate;
    });

    // Apply single type filter if a type is selected
    if (selectedType) {
      filteredData = filteredData.filter((item) => item.type === selectedType);
    }

    // Sort by date descending
    return filteredData.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [allTransactions, selectedType, dateRange]);

  // Prepare items for the type filter dropdown with translated labels
  const typeFilterItems = filterableTypes.map((type) => ({
    value: type,
    label: transactionTypeLabels[type] || type, // Use Hebrew labels
  }));

  // Setup react-table instance with pagination
  const table = useReactTable({
    data,
    columns: transactionColumns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(), // Enable pagination
    initialState: {
      pagination: {
        pageSize: 10, // Set default page size to 10
      },
    },
  });

  // Function to get current data for export
  const getDataForExport = (): Transaction[] => {
    // Get the rows from the current filtered and sorted view
    return table.getFilteredRowModel().rows.map((row) => row.original);
  };

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle>{title}</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {/* Filters */}
          {showFilters && (
            <>
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
                className="w-full sm:w-auto"
              />
              <Select
                value={selectedType ?? ""}
                onValueChange={(value) =>
                  setSelectedType(
                    value ? (value as TransactionType) : undefined
                  )
                }
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="סנן לפי סוג" />
                </SelectTrigger>
                <SelectContent>
                  {typeFilterItems.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          )}
          {/* Export Buttons */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportTransactionsToExcel(getDataForExport())}
            className="w-full sm:w-auto"
          >
            <FileSpreadsheet className="ml-2 h-4 w-4" />
            ייצוא ל-Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportTransactionsToPDF(getDataForExport())}
            className="w-full sm:w-auto"
          >
            <FileText className="ml-2 h-4 w-4" />
            ייצוא ל-PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Use shadcn Table components with react-table */}
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
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={transactionColumns.length}
                    className="h-24 text-center"
                  >
                    אין נתונים להצגה.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        {/* Pagination Controls */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            הקודם
          </Button>
          <span className="text-sm">
            עמוד {table.getState().pagination.pageIndex + 1} מתוך{" "}
            {table.getPageCount()}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            הבא
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
