import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useTableTransactionsStore } from "@/lib/tableTransactions/tableTransactions.store";
import { usePlatform } from "@/contexts/PlatformContext";
import { Table, TableBody, TableRow, TableCell } from "@/components/ui/table";
import { TransactionsFilters } from "./TransactionsFilters";
import { ExportButton } from "./ExportButton";
import { Upload } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
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
import {
  RecurringTransaction,
  Transaction,
  TransactionForTable,
} from "@/types/transaction";
import { DeleteConfirmationDialog } from "../ui/DeleteConfirmationDialog";
import { OpeningBalanceModal } from "@/components/settings/OpeningBalanceModal";
import { TableTransactionsService } from "@/lib/tableTransactions/tableTransactionService";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { BulkEditDialog } from "./BulkEditDialog";
import { BulkEditFields } from "./BulkEditFields";
import { useLoadedRowSelection } from "@/hooks/useLoadedRowSelection";
import {
  assertBulkPatch,
  buildBulkPatch,
  getBulkCategoryFamily,
  getBulkEditAvailability,
  getSelectionActionMode,
  INITIAL_BULK_FIELD_ACTIONS,
  normalizeBulkFieldActions,
} from "@/lib/tableTransactions/bulkActions";
import { getErrorMessage } from "@/lib/utils/error-message";

// sortableColumns definition - will be defined inside the component to use t()

export function TransactionsTableDisplay() {
  const { t, i18n } = useTranslation("data-tables");
  const { t: tImport } = useTranslation("import");

  // sortableColumns definition with translations
  const sortableColumns: { label: string; field: SortableField }[] = [
    { label: t("columns.date"), field: "date" },
    { label: t("columns.description"), field: "description" },
    { label: t("columns.amount"), field: "amount" },
    { label: t("columns.type"), field: "type" },
    { label: t("columns.category"), field: "category" },
    { label: t("columns.recipient"), field: "recipient" },
    { label: t("columns.paymentMethod"), field: "payment_method" },
  ];

  // Total number of columns: selection + sortable columns + chomesh + recurring + actions
  const TOTAL_TABLE_COLUMNS = sortableColumns.length + 4;

  const {
    transactions,
    loading,
    error,
    fetchTransactions,
    setLoadMorePagination,
    pagination,
    filters,
    sorting,
    setSorting,
    deleteTransaction,
    deleteTransactionsBulk,
    updateTransactionsBulk,
    bulkLoading,
  } = useTableTransactionsStore(
    useShallow((state) => ({
      transactions: state.transactions,
      loading: state.loading,
      error: state.error,
      fetchTransactions: state.fetchTransactions,
      setLoadMorePagination: state.setLoadMorePagination,
      pagination: state.pagination,
      filters: state.filters,
      sorting: state.sorting,
      setSorting: state.setSorting,
      deleteTransaction: state.deleteTransaction,
      deleteTransactionsBulk: state.deleteTransactionsBulk,
      updateTransactionsBulk: state.updateTransactionsBulk,
      bulkLoading: state.bulkLoading,
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

  const [editingOpeningBalanceTransaction, setEditingOpeningBalanceTransaction] =
    useState<Transaction | null>(null);
  const [isOpeningBalanceEditModalOpen, setIsOpeningBalanceEditModalOpen] =
    useState(false);

  const [editingRecTransaction, setEditingRecTransaction] =
    useState<RecurringTransaction | null>(null);
  const [isRecEditModalOpen, setIsRecEditModalOpen] = useState(false);
  const [isFetchingRec, setIsFetchingRec] = useState(false);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkFieldActions, setBulkFieldActions] = useState(
    INITIAL_BULK_FIELD_ACTIONS,
  );

  const loadedTransactionIds = useMemo(
    () => transactions.map((transaction) => transaction.id),
    [transactions]
  );
  const selection = useLoadedRowSelection(loadedTransactionIds);
  const selectionScopeKey = useMemo(
    () => JSON.stringify({ filters, sorting }),
    [filters, sorting]
  );
  const previousSelectionScopeKey = useRef(selectionScopeKey);
  const clearSelection = selection.clear;
  const selectedTransactions = transactions.filter((transaction) =>
    selection.selectedIds.has(transaction.id)
  );
  const selectionActionMode = getSelectionActionMode(selection.selectedCount);
  const selectedTransactionIds = selectedTransactions.map(
    (transaction) => transaction.id
  );
  const selectedHasInitialBalance = selectedTransactions.some(
    (transaction) => transaction.type === "initial_balance"
  );
  const selectedHasRecurringOccurrence = selectedTransactions.some(
    (transaction) => Boolean(transaction.source_recurring_id)
  );
  const bulkCategoryFamily = getBulkCategoryFamily(selectedTransactions);
  const bulkPending = bulkLoading;

  const bulkFieldAvailability = {
    description: getBulkEditAvailability({
      kind: "transaction",
      rows: selectedTransactions,
      field: "description",
    }).allowed,
    payment_method: getBulkEditAvailability({
      kind: "transaction",
      rows: selectedTransactions,
      field: "payment_method",
    }).allowed,
    category: getBulkEditAvailability({
      kind: "transaction",
      rows: selectedTransactions,
      field: "category",
    }).allowed,
    recipient: getBulkEditAvailability({
      kind: "transaction",
      rows: selectedTransactions,
      field: "recipient",
    }).allowed,
    is_chomesh: getBulkEditAvailability({
      kind: "transaction",
      rows: selectedTransactions,
      field: "is_chomesh",
    }).allowed,
  };

  const resetBulkEditValues = useCallback(() => {
    setBulkFieldActions(INITIAL_BULK_FIELD_ACTIONS);
  }, []);

  const handleBulkEditOpenChange = useCallback(
    (open: boolean) => {
      if (open) {
        resetBulkEditValues();
      }

      setIsBulkEditOpen(open);
    },
    [resetBulkEditValues]
  );

  const handleBulkEditClick = useCallback(() => {
    resetBulkEditValues();
    setIsBulkEditOpen(true);
  }, [resetBulkEditValues]);

  const bulkEditPatch = buildBulkPatch(
    normalizeBulkFieldActions(bulkFieldActions),
  );
  const bulkEditSubmitDisabled = Object.keys(bulkEditPatch).length === 0;

  useEffect(() => {
    // Initial fetch logic remains here as it depends on platform and sorting from the store
    if (platform !== "loading") {
      fetchTransactions(true, platform);
    }
  }, [fetchTransactions, platform, sorting]);

  useEffect(() => {
    if (previousSelectionScopeKey.current !== selectionScopeKey) {
      clearSelection();
      previousSelectionScopeKey.current = selectionScopeKey;
    }
  }, [clearSelection, selectionScopeKey]);

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
          clearSelection();
          toast.success(
            t("messages.deleteSuccess", {
              description: deletedTransactionDescription,
            })
          );
        } catch (err: unknown) {
          logger.error("Failed to delete transaction from component:", err);
          toast.error(
            t("messages.deleteErrorWithDescription", {
              description: deletedTransactionDescription,
              error: getErrorMessage(err) || t("messages.unknownError"),
            })
          );
        }
      } else {
        toast.error(t("messages.platformError"));
      }
    }
    setIsDeleteDialogOpen(false);
    setTransactionToDelete(null);
  }, [transactionToDelete, platform, deleteTransaction, clearSelection, t]);

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (selectedTransactionIds.length === 0) {
      setIsBulkDeleteDialogOpen(false);
      return;
    }

    if (platform !== "web" && platform !== "desktop") {
      toast.error(t("messages.platformError"));
      return;
    }

    const toastId = toast.loading(
      t("bulkDelete.transactions.toast.loading", {
        count: selectedTransactionIds.length,
      })
    );

    try {
      const result = await deleteTransactionsBulk(
        selectedTransactionIds,
        platform
      );
      toast.dismiss(toastId);
      toast.success(
        t("bulkDelete.transactions.toast.success", {
          count: selectedTransactionIds.length,
        })
      );
      clearSelection();
      setIsBulkDeleteDialogOpen(false);
      if (result.refreshError) {
        toast.warning(t("bulkFeedback.refreshWarning"));
      }
    } catch (err: unknown) {
      logger.error("Failed to bulk delete transactions:", err);
      toast.dismiss(toastId);
      toast.error(
        t("bulkDelete.transactions.toast.error", {
          error: getErrorMessage(err) || t("messages.unknownError"),
        })
      );
    }
  }, [
    deleteTransactionsBulk,
    platform,
    selectedTransactionIds,
    clearSelection,
    t,
  ]);

  const handleBulkEditSubmit = useCallback(async () => {
    if (selectedTransactionIds.length === 0) {
      return;
    }

    if (platform !== "web" && platform !== "desktop") {
      toast.error(t("messages.platformError"));
      return;
    }

    const patch = buildBulkPatch(normalizeBulkFieldActions(bulkFieldActions));
    try {
      assertBulkPatch(patch);
    } catch {
      return;
    }

    const toastId = toast.loading(
      t("bulkEdit.transactions.toast.loading", {
        count: selectedTransactionIds.length,
      })
    );

    try {
      const result = await updateTransactionsBulk(
        selectedTransactionIds,
        patch,
        platform
      );
      toast.dismiss(toastId);
      setIsBulkEditOpen(false);
      requestAnimationFrame(() => {
        clearSelection();
        toast.success(
          t("bulkEdit.transactions.toast.success", {
            count: selectedTransactionIds.length,
          })
        );
        if (result.refreshError) {
          toast.warning(t("bulkFeedback.refreshWarning"));
        }
      });
    } catch (err: unknown) {
      logger.error("Failed to bulk update transactions:", err);
      toast.dismiss(toastId);
      toast.error(
        t("bulkEdit.transactions.toast.error", {
          error: getErrorMessage(err) || t("messages.unknownError"),
        })
      );
    }
  }, [
    bulkFieldActions,
    clearSelection,
    platform,
    selectedTransactionIds,
    t,
    updateTransactionsBulk,
  ]);

  const handleEditInitiate = useCallback((transaction: Transaction) => {
    // If it's an initial_balance transaction, open the dedicated modal
    if (transaction.type === "initial_balance") {
      setEditingOpeningBalanceTransaction(transaction);
      requestAnimationFrame(() => setIsOpeningBalanceEditModalOpen(true));
      return;
    }

    // Defer opening modal to the next frame to allow DropdownMenu to close first
    setEditingTransaction(transaction);
    requestAnimationFrame(() => setIsEditModalOpen(true));
  }, []);

  const handleSelectionEdit = useCallback(() => {
    const row = selectedTransactions[0];
    if (selectionActionMode === "single" && row) {
      handleEditInitiate(row);
      return;
    }

    handleBulkEditClick();
  }, [
    handleBulkEditClick,
    handleEditInitiate,
    selectedTransactions,
    selectionActionMode,
  ]);

  const handleSelectionDelete = useCallback(() => {
    const row = selectedTransactions[0];
    if (selectionActionMode === "single" && row) {
      handleDeleteInitiate(row);
      return;
    }

    setIsBulkDeleteDialogOpen(true);
  }, [handleDeleteInitiate, selectedTransactions, selectionActionMode]);

  const handleUpdateOpeningBalance = useCallback(
    async (transactionId: string, updates: Partial<Transaction>) => {
      if (platform === "web" || platform === "desktop") {
        // Use service directly so the modal can handle errors and keep itself open.
        await TableTransactionsService.updateTransaction(
          transactionId,
          updates,
          platform
        );

        try {
          // Refresh table data to reflect changes (reset=true to avoid appending duplicates)
          await fetchTransactions(true, platform);
        } catch (refreshError) {
          logger.warn("Failed to refresh table after update", refreshError);
          // Do not re-throw refresh error - the update succeeded, so we should allow the modal to close
        }
      } else {
        throw new Error(t("messages.platformError"));
      }
    },
    [platform, fetchTransactions, t]
  );

  const handleUpdateSelectedOpeningBalance = useCallback(
    async (transactionId: string, updates: Partial<Transaction>) => {
      await handleUpdateOpeningBalance(transactionId, updates);
      clearSelection();
    },
    [clearSelection, handleUpdateOpeningBalance]
  );

  const handleEditRecurringInitiate = useCallback(
    async (recId: string) => {
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
    },
    [t]
  );

  // Helper function to get month key from date string (YYYY-MM format)
  const getMonthKey = useCallback((dateString: string): string => {
    // Parse directly from string to avoid timezone issues with Date object
    // Expects YYYY-MM-DD format which is standard in this app
    return dateString.substring(0, 7);
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

  const bulkDeleteWarnings = [
    selectedHasInitialBalance
      ? t("bulkDelete.transactions.warnings.initialBalance")
      : null,
    selectedHasRecurringOccurrence
      ? t("bulkDelete.transactions.warnings.recurringOccurrence")
      : null,
  ].filter((warning): warning is string => warning !== null);

  // The initial platform loading check (spinner/message) should be handled by the parent page component (src/pages/TransactionsTable.tsx)
  // If platform is loading, this component might not even be rendered, or rendered with a specific loading state passed via props.
  // For now, assuming this component is rendered when platform is determined.

  return (
    <div className="space-y-4">
      <TransactionsFilters />

      <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <ExportButton />
          <Button
            variant="outline"
            onClick={() => navigate({ to: "/transactions-table/import" })}
            className="gap-1.5"
          >
            <Upload className="h-4 w-4" />
            {t("buttons.importTransactions")}
            <span className="ms-0.5 inline-flex h-4 items-center rounded-full bg-primary px-1.5 text-[9px] font-bold uppercase leading-none text-primary-foreground">
              {tImport("newBadge")}
            </span>
          </Button>
        </div>
        <BulkActionsToolbar
          selectedCount={selection.selectedCount}
          selectedCountLabel={t("bulkToolbar.selectedCount", {
            count: selection.selectedCount,
          })}
          editLabel={
            selectionActionMode === "single"
              ? t("actions.edit")
              : t("bulkToolbar.edit")
          }
          deleteLabel={
            selectionActionMode === "single"
              ? t("actions.delete")
              : t("bulkToolbar.delete")
          }
          clearLabel={t("bulkToolbar.clear")}
          onEdit={handleSelectionEdit}
          onDelete={handleSelectionDelete}
          onClear={clearSelection}
          ariaLabel={t("bulkToolbar.ariaLabel")}
          pending={bulkPending}
          editDisabled={
            selectionActionMode === "bulk" &&
            !Object.values(bulkFieldAvailability).some(Boolean)
          }
          dir={i18n.dir()}
        />
      </div>

      {error && (
        <p className="text-destructive text-center py-4">
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
                selectionChecked={selection.checked}
                onToggleAllLoaded={selection.toggleAllLoaded}
                selectAllLoadedLabel={t("bulkSelection.selectAllLoaded", {
                  count: selection.loadedCount,
                })}
                selectionDisabled={
                  loading || bulkPending || transactions.length === 0
                }
              />
              <TableBody>
                {loading && transactions.length === 0 && (
                  <>
                    {Array.from({ length: 20 }).map((_, rowIndex) => (
                      <TableRow key={`skeleton-row-${rowIndex}`}>
                        {Array.from({ length: TOTAL_TABLE_COLUMNS }).map(
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
                      colSpan={TOTAL_TABLE_COLUMNS}
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
                          colSpan={TOTAL_TABLE_COLUMNS}
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
                      selected={selection.selectedIds.has(item.transaction.id)}
                      onToggleSelected={selection.toggle}
                      selectLabel={t("bulkSelection.selectRow", {
                        description:
                          item.transaction.description ||
                          t("messages.defaultTransactionName"),
                      })}
                      selectionDisabled={bulkPending}
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
      <BulkEditDialog
        open={isBulkEditOpen}
        onOpenChange={handleBulkEditOpenChange}
        title={t("bulkEdit.transactions.title")}
        description={t("bulkEdit.transactions.description", {
          count: selection.selectedCount,
        })}
        cancelLabel={t("actions.cancel")}
        submitLabel={t("bulkEdit.submit")}
        pendingLabel={t("bulkEdit.pending")}
        pending={bulkPending}
        submitDisabled={bulkEditSubmitDisabled}
        onSubmit={handleBulkEditSubmit}
        dir={i18n.dir()}
      >
        <BulkEditFields
          pending={bulkPending}
          actions={bulkFieldActions}
          availability={bulkFieldAvailability}
          categoryFamily={bulkCategoryFamily}
          onActionsChange={setBulkFieldActions}
        />
      </BulkEditDialog>
      <DeleteConfirmationDialog
        isOpen={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        onConfirm={handleBulkDeleteConfirm}
        title={t("bulkDelete.transactions.title")}
        description={[
          t("bulkDelete.transactions.description", {
            count: selection.selectedCount,
          }),
          ...bulkDeleteWarnings,
        ].join(" ")}
        confirmLabel={t("bulkToolbar.delete")}
        pendingLabel={t("bulkDelete.pending")}
        pending={bulkPending}
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
          onMutationSuccess={clearSelection}
          onSubmitSuccess={clearSelection}
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
          onSubmitSuccess={clearSelection}
        />
      )}

      <OpeningBalanceModal
        key={editingOpeningBalanceTransaction?.id ?? "opening-balance-edit"}
        isOpen={isOpeningBalanceEditModalOpen}
        onClose={() => {
          setIsOpeningBalanceEditModalOpen(false);
          setEditingOpeningBalanceTransaction(null);
        }}
        initialData={editingOpeningBalanceTransaction}
        onUpdate={handleUpdateSelectedOpeningBalance}
      />
    </div>
  );
}
