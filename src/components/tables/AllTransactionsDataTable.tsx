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
      // TODO: Add color/styling based on type using Badge?
      return <Badge variant="outline">{type}</Badge>; // Example using Badge
    },
    // Enable filtering for this column
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
      // Optional: Add sign based on type? (+ for income, - for others?)
      return formatCurrency(amount, currency);
    },
  },
  {
    accessorKey: "isChomesh",
    header: "חומש?",
    cell: ({ row }) => {
      const transaction = row.original;
      return transaction.type === "income"
        ? row.getValue("isChomesh")
          ? "כן"
          : "לא"
        : "-";
    },
  },
  // Add more columns as needed (e.g., specific category, recipient column if preferred)
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

  // Prepare items for the type filter dropdown
  const typeFilterItems = filterableTypes.map((type) => ({
    value: type,
    label: type,
  })); // TODO: Translate labels

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <CardTitle>{title}</CardTitle>
        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <DatePickerWithRange
              date={dateRange}
              onDateChange={setDateRange}
              className="w-full sm:w-auto" // Make date picker responsive
            />
            {/* Updated Select for single type filtering */}
            <Select
              value={selectedType ?? ""} // Use empty string for controlled value when undefined to show placeholder
              onValueChange={(value) =>
                setSelectedType(value ? (value as TransactionType) : undefined)
              } // Set to undefined if value is empty
            >
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="סנן לפי סוג" />
              </SelectTrigger>
              <SelectContent>
                {/* No explicit "All Types" item needed */}
                {/* <SelectItem value="">כל הסוגים</SelectItem> */}
                {typeFilterItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </CardHeader>
      <CardContent>
        <DataTable
          columns={transactionColumns}
          data={data}
          // Pass any other necessary props to DataTable if it expects them
        />
      </CardContent>
    </Card>
  );
}
