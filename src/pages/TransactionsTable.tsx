import React, { useEffect, useState } from "react";
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
import { ExportButton } from "@/components/transactions/ExportButton"; // Import ExportButton
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  transactionTypeLabels,
  typeBadgeColors,
} from "@/types/transactionLabels";
import {
  ArrowUp,
  ArrowDown,
  ChevronsUpDown,
  MoreHorizontal,
  Trash2,
  Edit3,
  Loader2, // Import Loader2
  RotateCcw, // For Undo
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { toast } from "sonner"; // Import toast
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { TransactionEditModal } from "@/components/transactions/TransactionEditModal";

const formatBoolean = (value: boolean | null | undefined) => {
  if (value === true) return "כן";
  if (value === false) return "לא";
  return "-";
};

type SortableField = keyof Transaction | string;
const sortableColumns: { label: string; field: SortableField }[] = [
  { label: "תאריך", field: "date" },
  { label: "תיאור", field: "description" },
  { label: "סכום", field: "amount" },
  { label: "מטבע", field: "currency" },
  { label: "סוג", field: "type" },
  { label: "קטגוריה", field: "category" },
  { label: "נמען/משלם", field: "recipient" },
];

export function TransactionsTable() {
  const {
    transactions,
    loading,
    error,
    fetchTransactions,
    setLoadMorePagination,
    pagination,
    sorting,
    setSorting,
    deleteTransaction, // This will now be a direct delete
    // undoDeleteTransaction, // Removed
  } = useTableTransactionsStore();

  const { platform } = usePlatform();
  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    console.log(
      "TransactionsTable useEffect for fetchTransactions triggered. Platform:",
      platform,
      "Sorting:",
      JSON.stringify(sorting)
    );
    if (platform !== "loading") {
      console.log(
        "TransactionsTable: Platform is not loading, calling fetchTransactions(true, platform)."
      );
      fetchTransactions(true, platform);
    } else {
      console.log(
        "TransactionsTable: Platform is loading, fetchTransactions NOT called."
      );
    }
  }, [fetchTransactions, platform, sorting]);

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

  const handleDeleteInitiate = (transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (transactionToDelete) {
      const deletedTransactionId = transactionToDelete.id;
      const deletedTransactionDescription =
        transactionToDelete.description || "תנועה זו";

      if (platform === "web" || platform === "desktop") {
        try {
          await deleteTransaction(deletedTransactionId, platform);
          toast.success(`"${deletedTransactionDescription}" נמחקה בהצלחה.`);
        } catch (error: any) {
          console.error("Failed to delete transaction from component:", error);
          toast.error(
            `שגיאה במחיקת "${deletedTransactionDescription}": ${
              error.message || "שגיאה לא ידועה"
            }`
          );
        }
      } else {
        toast.error("לא ניתן למחוק, הפלטפורמה עדיין בטעינה או לא תקינה.");
      }
    }
    setIsDeleteDialogOpen(false);
    setTransactionToDelete(null);
  };

  const handleEditInitiate = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsEditModalOpen(true);
  };

  return (
    <div className="container mx-auto py-4 space-y-6">
      <h1 className="text-3xl font-bold text-center">טבלת תנועות</h1>
      <div className="flex justify-between items-center gap-4">
        <TransactionsFilters />
        <ExportButton />
      </div>
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
                  <TableHead className="text-center whitespace-nowrap">
                    פעולות
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && transactions.length === 0 && (
                  <>
                    {Array.from({ length: 5 }).map((_, rowIndex) => (
                      <TableRow key={`skeleton-row-${rowIndex}`}>
                        {Array.from({ length: sortableColumns.length + 3 }).map(
                          (_, cellIndex) => (
                            <TableCell
                              key={`skeleton-cell-${rowIndex}-${cellIndex}`}
                              className="text-right whitespace-nowrap"
                            >
                              <Skeleton className="h-6 w-full" />
                            </TableCell>
                          )
                        )}
                      </TableRow>
                    ))}
                  </>
                )}
                {!loading && !error && transactions.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={sortableColumns.length + 3}
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
                    <TableCell className="text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">פתח תפריט</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>פעולות</DropdownMenuLabel>
                          <DropdownMenuItem
                            onClick={() => handleEditInitiate(transaction)}
                          >
                            <Edit3 className="mr-2 h-4 w-4" />
                            עריכה
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteInitiate(transaction)}
                            className="text-red-600 hover:!text-red-600 focus:!text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            מחיקה
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {loading && transactions.length > 0 && (
        <div className="text-center mt-4">
          <Button variant="outline" disabled>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            טוען עוד נתונים...
          </Button>
        </div>
      )}
      <div
        className="flex justify-center items-center mt-6 space-x-4"
        dir="rtl"
      >
        {!loading && pagination.hasMore && (
          <Button onClick={handleLoadMore}>טען עוד</Button>
        )}
        {transactions.length > 0 && (
          <p className="text-sm text-muted-foreground">
            מציג {transactions.length} מתוך {pagination.totalCount} תנועות
          </p>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>אישור מחיקת תנועה</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את התנועה "
              {transactionToDelete?.description || "זו"}" מתאריך{" "}
              {transactionToDelete?.date
                ? new Date(transactionToDelete.date).toLocaleDateString("he-IL")
                : ""}
              ? לא ניתן לשחזר פעולה זו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setIsDeleteDialogOpen(false)}>
              ביטול
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Transaction Modal */}
      {isEditModalOpen && editingTransaction && (
        <TransactionEditModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false);
            setEditingTransaction(null);
          }}
          transaction={editingTransaction}
        />
      )}
    </div>
  );
}

function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}
