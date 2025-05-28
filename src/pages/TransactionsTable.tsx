import React, { useEffect } from "react";
import { useTableTransactionsStore } from "@/lib/tableTransactions.store";
import { usePlatform } from "@/contexts/PlatformContext";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { Transaction, TransactionType } from "@/types/transaction";
import { TransactionsFilters } from "@/components/transactions/TransactionsFilters";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  transactionTypeLabels,
  typeBadgeColors,
} from "@/types/transactionLabels";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react"; // Import icons

const formatBoolean = (value: boolean | null | undefined) => {
  if (value === true) return "כן";
  if (value === false) return "לא";
  return "-";
};

// Define which columns are sortable and their corresponding field names in Transaction type
type SortableField = keyof Transaction | string; // Allow string for custom/non-direct fields if any
const sortableColumns: { label: string; field: SortableField }[] = [
  { label: "תאריך", field: "date" },
  { label: "תיאור", field: "description" },
  { label: "סכום", field: "amount" },
  { label: "מטבע", field: "currency" },
  { label: "סוג", field: "type" },
  { label: "קטגוריה", field: "category" },
  { label: "נמען/משלם", field: "recipient" },
  // { label: "חומש?", field: "is_chomesh" }, // Booleans might be tricky to sort meaningfully in DB
  // { label: "קבועה?", field: "is_recurring" },
];

export function TransactionsTable() {
  const {
    transactions,
    loading,
    error,
    fetchTransactions,
    setLoadMorePagination,
    pagination,
    sorting, // Get sorting state
    setSorting, // Get setSorting action
  } = useTableTransactionsStore();

  const { platform } = usePlatform();

  useEffect(() => {
    if (platform !== "loading") {
      fetchTransactions(true, platform);
    }
  }, [fetchTransactions, platform, sorting]); // Add sorting to dependency array

  if (platform === "loading") {
    return (
      <div className="container mx-auto py-4">
        <h1 className="text-3xl font-bold text-center mb-6">טבלת תנועות</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center">מזהה פלטפורמה...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleLoadMore = () => {
    setLoadMorePagination();
    fetchTransactions(false, platform);
  };

  const handleSort = (field: SortableField) => {
    setSorting(field);
  };

  const renderSortIcon = (field: SortableField) => {
    if (sorting.field !== field) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    if (sorting.direction === "asc") {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <div className="container mx-auto py-4 space-y-6">
      <h1 className="text-3xl font-bold text-center">טבלת תנועות</h1>
      <TransactionsFilters />
      {error && (
        <p className="text-red-500 text-center py-4">
          שגיאה בטעינת נתונים: {error}
        </p>
      )}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {sortableColumns.map((col) => (
                    <TableHead
                      key={col.field}
                      className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort(col.field)}
                    >
                      <div className="flex items-center justify-end">
                        {col.label}
                        {renderSortIcon(col.field)}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead className="text-right whitespace-nowrap">
                    חומש?
                  </TableHead>
                  <TableHead className="text-right whitespace-nowrap">
                    קבועה?
                  </TableHead>
                  {/* <TableHead className="text-right">פעולות</TableHead> */}
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && transactions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={sortableColumns.length + 2}
                      className="h-24 text-center"
                    >
                      טוען נתונים...
                    </TableCell>
                  </TableRow>
                )}
                {!loading && !error && transactions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={sortableColumns.length + 2}
                      className="h-24 text-center"
                    >
                      לא נמצאו תנועות.
                    </TableCell>
                  </TableRow>
                )}
                {transactions.map((transaction: Transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell className="text-right whitespace-nowrap">
                      {new Date(transaction.date).toLocaleDateString("he-IL", {
                        year: "numeric",
                        month: "2-digit",
                        day: "2-digit",
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.description || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium whitespace-nowrap">
                      {transaction.amount.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {transaction.currency}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Badge
                        variant="outline"
                        className={cn(
                          "border",
                          typeBadgeColors[transaction.type as TransactionType]
                        )}
                      >
                        {transactionTypeLabels[
                          transaction.type as TransactionType
                        ] || transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.category || "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {transaction.recipient || "-"}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatBoolean(transaction.is_chomesh)}
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      {formatBoolean(transaction.is_recurring)}
                    </TableCell>
                    {/* <TableCell className="text-right">TODO: Actions</TableCell> */}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {loading && transactions.length > 0 && (
        <p className="text-center mt-4">טוען עוד נתונים...</p>
      )}
      {!loading && pagination.hasMore && (
        <div className="text-center mt-6">
          <Button onClick={handleLoadMore}>טען עוד</Button>
        </div>
      )}
    </div>
  );
}

function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}
