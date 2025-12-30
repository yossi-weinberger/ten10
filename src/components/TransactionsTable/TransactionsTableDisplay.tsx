import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useTableTransactionsStore } from "@/lib/tableTransactions/tableTransactions.store";
import { usePlatform } from "@/contexts/PlatformContext";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { TransactionsFilters } from "./TransactionsFilters";
import { ExportButton } from "./ExportButton";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
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
import { RecurringTransactionEditModal } from "./RecurringTransactionEditModal";
import { TransactionRow } from "./TransactionRow";
import {
  TransactionsTableHeader,
  SortableField,
} from "./TransactionsTableHeader"; // TableSortConfig is also exported but not directly used here for props
import { TransactionsTableFooter } from "./TransactionsTableFooter";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { getRecurringTransactionById } from "@/lib/data-layer/recurringTransactions.service";
import { RecurringTransaction, TransactionForTable } from "@/types/transaction";
import { DeleteConfirmationDialog } from "../ui/DeleteConfirmationDialog";

// Define Transaction type (can be imported from a central types file if available)
type Transaction = import("@/types/transaction").Transaction;

// sortableColumns definition - will be defined inside the component to use t()

export function TransactionsTableDisplay() {
  const { t, i18n } = useTranslation("data-tables");

  // sortableColumns definition with translations
  const sortableColumns: { label: string; field: SortableField }[] = [
    { label: t("columns.date"), field: "date" },
    { label: t("columns.description"), field: "description" },
    { label: t("columns.amount"), field: "amount" },
    { label: t("columns.type"), field: "type" },
    { label: t("columns.category"), field: "category" },
    { label: t("columns.recipient"), field: "recipient" },
  ];

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
  } = useTableTransactionsStore(
    useShallow((state) => ({
      transactions: state.transactions,
      loading: state.loading,
      error: state.error,
      fetchTransactions: state.fetchTransactions,
      setLoadMorePagination: state.setLoadMorePagination,
      pagination: state.pagination,
      sorting: state.sorting,
      setSorting: state.setSorting,
      deleteTransaction: state.deleteTransaction,
    }))
  );

  const { platform } = usePlatform(); // platform is used directly here for API calls
  const navigate = useNavigate();

  const [transactionToDelete, setTransactionToDelete] =
    useState<Transaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] =
    useState<Transaction | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [editingRecTransaction, setEditingRecTransaction] =
    useState<RecurringTransaction | null>(null);
  const [isRecEditModalOpen, setIsRecEditModalOpen] = useState(false);
  const [isFetchingRec, setIsFetchingRec] = useState(false);

  useEffect(() => {
    // Initial fetch logic remains here as it depends on platform and sorting from the store
    if (platform !== "loading") {
      fetchTransactions(true, platform);
    }
  }, [fetchTransactions, platform, sorting]);

  const handleLoadMore = useCallback(() => {
    setLoadMorePagination();
    fetchTransactions(false, platform); // platform is available from usePlatform hook
  }, [setLoadMorePagination, fetchTransactions, platform]);

  const handleSort = useCallback(
    (field: SortableField) => {
      setSorting(field);
    },
    [setSorting]
  );

  const handleDeleteInitiate = useCallback((transaction: Transaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (transactionToDelete) {
      const deletedTransactionId = transactionToDelete.id;
      const deletedTransactionDescription =
        transactionToDelete.description || t("messages.defaultTransactionName");

      if (platform === "web" || platform === "desktop") {
        try {
          await deleteTransaction(deletedTransactionId, platform);
          toast.success(
            t("messages.deleteSuccess", {
              description: deletedTransactionDescription,
            })
          );
        } catch (err: any) {
          logger.error("Failed to delete transaction from component:", err);
          toast.error(
            t("messages.deleteErrorWithDescription", {
              description: deletedTransactionDescription,
              error: err.message || t("messages.unknownError"),
            })
          );
        }
      } else {
        toast.error(t("messages.platformError"));
      }
    }
    setIsDeleteDialogOpen(false);
    setTransactionToDelete(null);
  }, [transactionToDelete, platform, deleteTransaction]);

  const handleEditInitiate = useCallback((transaction: Transaction) => {
    // Defer opening modal to the next frame to allow DropdownMenu to close first
    setEditingTransaction(transaction);
    requestAnimationFrame(() => setIsEditModalOpen(true));
  }, []);

  const handleEditRecurringInitiate = useCallback(async (recId: string) => {
    setIsFetchingRec(true);
    try {
      const recData = await getRecurringTransactionById(recId);
      setEditingRecTransaction(recData);
      // Defer opening modal to the next frame to allow DropdownMenu to close first
      requestAnimationFrame(() => setIsRecEditModalOpen(true));
    } catch (error) {
      logger.error("Failed to fetch recurring transaction details", error);
      toast.error(t("messages.recurringError"));
    } finally {
      setIsFetchingRec(false);
    }
  }, []);

  // Helper function to get month key from date string (YYYY-MM format)
  const getMonthKey = useCallback((dateString: string): string => {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
      2,
      "0"
    )}`;
  }, []);

  // Helper function to format month label
  const formatMonthLabel = useCallback(
    (monthKey: string): string => {
      const [year, month] = monthKey.split("-");
      const date = new Date(parseInt(year), parseInt(month) - 1, 1);
      return date.toLocaleDateString(i18n.language, {
        year: "numeric",
        month: "long",
      });
    },
    [i18n.language]
  );

  // Create array of transactions with month separators when sorting by date
  const transactionsWithSeparators = useMemo(() => {
    // Only add separators when sorting by date
    if (sorting.field !== "date") {
      return transactions.map((transaction) => ({
        type: "transaction" as const,
        transaction,
      }));
    }

    const result: Array<
      | { type: "transaction"; transaction: TransactionForTable }
      | { type: "separator"; monthKey: string; monthLabel: string }
    > = [];

    let previousMonthKey: string | null = null;

    transactions.forEach((transaction) => {
      const currentMonthKey = getMonthKey(transaction.date);

      // Add separator if month changed (not for first transaction)
      if (previousMonthKey !== null && previousMonthKey !== currentMonthKey) {
        result.push({
          type: "separator",
          monthKey: currentMonthKey,
          monthLabel: formatMonthLabel(currentMonthKey),
        });
      }

      result.push({
        type: "transaction",
        transaction: transaction as TransactionForTable,
      });

      previousMonthKey = currentMonthKey;
    });

    return result;
  }, [transactions, sorting.field, getMonthKey, formatMonthLabel]);

  // The initial platform loading check (spinner/message) should be handled by the parent page component (src/pages/TransactionsTable.tsx)
  // If platform is loading, this component might not even be rendered, or rendered with a specific loading state passed via props.
  // For now, assuming this component is rendered when platform is determined.

  return (
    <div className="space-y-4">
      <TransactionsFilters />

      <div className="flex justify-between items-center gap-4 mb-4">
        <ExportButton />
        <Button
          onClick={() =>
            navigate({ to: "/transactions-table/recurring-transactions" })
          }
          variant="default"
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {t("buttons.showRecurring")}
        </Button>
      </div>

      {error && (
        <p className="text-red-500 text-center py-4">
          {t("messages.loadingError", { error })}
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
                      {t("messages.noData")}
                    </TableCell>
                  </TableRow>
                )}
                {transactionsWithSeparators.map((item) => {
                  if (item.type === "separator") {
                    return (
                      <TableRow
                        key={`month-separator-${item.monthKey}`}
                        className="border-t-2 border-border hover:bg-transparent"
                      >
                        <TableCell
                          colSpan={sortableColumns.length + 3}
                          className="py-1 px-4 relative"
                        >
                          <span className="absolute rtl:right-4 ltr:left-4 top-1/2 -translate-y-1/2 text-xs font-medium text-muted-foreground bg-background px-2">
                            {item.monthLabel}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  }
                  return (
                    <TransactionRow
                      key={item.transaction.id}
                      transaction={item.transaction as TransactionForTable}
                      onEdit={handleEditInitiate}
                      onDelete={handleDeleteInitiate}
                      onEditRecurring={handleEditRecurringInitiate}
                      isFetchingRec={isFetchingRec}
                    />
                  );
                })}
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
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        title={t("dialog.deleteTitle")}
        description={t("dialog.deleteDescription", {
          description:
            transactionToDelete?.description ||
            t("messages.defaultTransactionName"),
          date: transactionToDelete?.date
            ? new Date(transactionToDelete.date).toLocaleDateString(
                i18n.language
              )
            : "",
        })}
      />
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
      {isRecEditModalOpen && editingRecTransaction && (
        <RecurringTransactionEditModal
          isOpen={isRecEditModalOpen}
          onClose={() => {
            setIsRecEditModalOpen(false);
            setEditingRecTransaction(null);
          }}
          transaction={editingRecTransaction}
        />
      )}
    </div>
  );
}
