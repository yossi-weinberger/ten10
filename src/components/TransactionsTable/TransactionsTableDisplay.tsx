import React, { useEffect, useState } from "react";
import { useTableTransactionsStore } from "@/lib/tableTransactions/tableTransactions.store";
import { usePlatform } from "@/contexts/PlatformContext";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { TransactionsFilters } from "./TransactionsFilters";
import { ExportButton } from "./ExportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
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
import { TransactionEditModal } from "./TransactionEditModal";
import { TransactionRow } from "./TransactionRow";
import {
  TransactionsTableHeader,
  SortableField,
} from "./TransactionsTableHeader"; // TableSortConfig is also exported but not directly used here for props
import { TransactionsTableFooter } from "./TransactionsTableFooter";

// Define Transaction type (can be imported from a central types file if available)
type Transaction = import("@/types/transaction").Transaction;

// sortableColumns definition remains here as it's specific to this table's configuration
// and passed to TransactionsTableHeader
const sortableColumns: { label: string; field: SortableField }[] = [
  { label: "תאריך", field: "date" },
  { label: "תיאור", field: "description" },
  { label: "סכום", field: "amount" },
  { label: "מטבע", field: "currency" },
  { label: "סוג", field: "type" },
  { label: "קטגוריה", field: "category" },
  { label: "נמען/משלם", field: "recipient" },
];

export function TransactionsTableDisplay() {
  const {
    transactions,
    loading,
    error,
    fetchTransactions,
    setLoadMorePagination,
    pagination,
    sorting,
    setSorting,
    deleteTransaction,
  } = useTableTransactionsStore();

  const { platform } = usePlatform(); // platform is used directly here for API calls

  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  useEffect(() => {
    // Initial fetch logic remains here as it depends on platform and sorting from the store
    if (platform !== "loading") {
      fetchTransactions(true, platform);
    }
  }, [fetchTransactions, platform, sorting]);

  const handleLoadMore = () => {
    setLoadMorePagination();
    fetchTransactions(false, platform); // platform is available from usePlatform hook
  };

  const handleSort = (field: SortableField) => {
    setSorting(field);
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
        } catch (err: any) {
          console.error("Failed to delete transaction from component:", err);
          toast.error(
            `שגיאה במחיקת "${deletedTransactionDescription}": ${
              err.message || "שגיאה לא ידועה"
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

  // The initial platform loading check (spinner/message) should be handled by the parent page component (src/pages/TransactionsTable.tsx)
  // If platform is loading, this component might not even be rendered, or rendered with a specific loading state passed via props.
  // For now, assuming this component is rendered when platform is determined.

  return (
    <div className="space-y-6">
      {" "}
      {/* Removed container and py-4 for better composability */}
      {/* The main title <h1 className="text-3xl font-bold text-center">טבלת תנועות</h1> can be added by the parent page component */}
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
              <TransactionsTableHeader
                sorting={sorting}
                handleSort={handleSort}
                sortableColumns={sortableColumns}
              />
              <TableBody>
                {loading && transactions.length === 0 && (
                  <>
                    {Array.from({ length: 20 }).map((_, rowIndex) => (
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
                  <TransactionRow
                    key={transaction.id}
                    transaction={transaction}
                    onEdit={handleEditInitiate}
                    onDelete={handleDeleteInitiate}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <TransactionsTableFooter
        loading={loading}
        pagination={pagination}
        transactionsLength={transactions.length}
        handleLoadMore={handleLoadMore}
      />
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
