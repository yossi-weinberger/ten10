import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useRecurringTableStore } from "@/lib/tableTransactions/recurringTable.store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { formatPaymentMethod } from "@/lib/payment-methods";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { deleteRecurringTransaction } from "@/lib/tableTransactions/recurringTable.service";
import {
  InfoIcon,
  MoreHorizontal,
} from "lucide-react";
import { RecurringTransaction, TransactionType } from "@/types/transaction";
import { recurringStatusBadgeColors } from "@/types/recurringTransactionLabels";
import { typeBadgeColors } from "@/types/transactionLabels";
import { RecurringTransactionEditModal } from "./RecurringTransactionEditModal";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/formatting";
import { Skeleton } from "@/components/ui/skeleton";
import { RecurringTransactionsFilters } from "./RecurringTransactionsFilters";
import {
  RecurringTransactionsTableHeader,
  SortableField,
} from "./RecurringTransactionsTableHeader";
import { RecurringProgressBadge } from "./RecurringProgressBadge";
import { DeleteConfirmationDialog } from "../ui/DeleteConfirmationDialog";
import { usePlatform } from "@/contexts/PlatformContext";
import { useDonationStore } from "@/lib/store";
import { CurrencyConversionInfo } from "@/components/Currency/CurrencyConversionInfo";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { BulkEditDialog } from "./BulkEditDialog";
import { BulkEditFields } from "./BulkEditFields";
import { useLoadedRowSelection } from "@/hooks/useLoadedRowSelection";
import {
  assertBulkPatch,
  buildBulkPatch,
  getBulkCategoryFamily,
  getBulkChomeshType,
  getBulkEditAvailability,
  getSelectionActionMode,
  getSharedBulkValues,
  shouldShowBulkChomeshField,
  INITIAL_BULK_FIELD_ACTIONS,
  normalizeBulkFieldActions,
} from "@/lib/tableTransactions/bulkActions";
import { getErrorMessage } from "@/lib/utils/error-message";


export function RecurringTransactionsTableDisplay() {
  const { t, i18n } = useTranslation(["data-tables", "transactions"]);
  const { platform } = usePlatform();
  const trackChomeshSeparately = useDonationStore(
    (state) => state.settings.trackChomeshSeparately,
  );
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<RecurringTransaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] =
    useState<RecurringTransaction | null>(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkFieldActions, setBulkFieldActions] = useState(
    INITIAL_BULK_FIELD_ACTIONS,
  );

  const {
    recurring,
    loading,
    error,
    fetchRecurring,
    sorting,
    setSorting,
    filters,
    bulkLoading,
    deleteRecurringBulk: deleteRecurringBulkAction,
    updateRecurringBulk: updateRecurringBulkAction,
  } = useRecurringTableStore();

  const handleEditClick = useCallback((transaction: RecurringTransaction) => {
    setSelectedTransaction(transaction);
    setIsEditModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsEditModalOpen(false);
    setSelectedTransaction(null);
  }, []);

  const handleDeleteClick = useCallback((transaction: RecurringTransaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  }, []);

  const loadedRecurringIds = useMemo(
    () => recurring.map((transaction) => transaction.id),
    [recurring]
  );
  const selection = useLoadedRowSelection(loadedRecurringIds);
  const selectionScopeKey = useMemo(
    () => JSON.stringify({ filters, sorting }),
    [filters, sorting]
  );
  const previousSelectionScopeKey = useRef(selectionScopeKey);
  const clearSelection = selection.clear;
  const selectedRecurring = recurring.filter((transaction) =>
    selection.selectedIds.has(transaction.id)
  );
  const selectionActionMode = getSelectionActionMode(selection.selectedCount);
  const selectedRecurringIds = selectedRecurring.map(
    (transaction) => transaction.id
  );
  const bulkCategoryFamily = getBulkCategoryFamily(selectedRecurring);
  const bulkChomeshType = getBulkChomeshType(selectedRecurring);
  const sharedBulkValues = getSharedBulkValues(selectedRecurring);
  const bulkPending = bulkLoading;

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await deleteRecurringTransaction(transactionToDelete.id);
      clearSelection();
      toast.success(t("messages.recurringDeleteSuccess"));
    } catch (error) {
      logger.error("Failed to delete recurring transaction:", error);
      toast.error(t("messages.recurringDeleteError"));
    } finally {
      setIsDeleteDialogOpen(false);
      setTransactionToDelete(null);
      // Refresh table after dialog closes to avoid portal race conditions
      requestAnimationFrame(() => fetchRecurring());
    }
  };

  const bulkFieldAvailability = {
    description: getBulkEditAvailability({
      kind: "recurring",
      rows: selectedRecurring,
      field: "description",
    }).allowed,
    payment_method: getBulkEditAvailability({
      kind: "recurring",
      rows: selectedRecurring,
      field: "payment_method",
    }).allowed,
    category: getBulkEditAvailability({
      kind: "recurring",
      rows: selectedRecurring,
      field: "category",
    }).allowed,
    recipient: getBulkEditAvailability({
      kind: "recurring",
      rows: selectedRecurring,
      field: "recipient",
    }).allowed,
    is_chomesh:
      getBulkEditAvailability({
        kind: "recurring",
        rows: selectedRecurring,
        field: "is_chomesh",
      }).allowed &&
      shouldShowBulkChomeshField(bulkChomeshType, trackChomeshSeparately),
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

  const handleSelectionEdit = useCallback(() => {
    const row = selectedRecurring[0];
    if (selectionActionMode === "single" && row) {
      handleEditClick(row);
      return;
    }

    handleBulkEditClick();
  }, [
    handleBulkEditClick,
    handleEditClick,
    selectedRecurring,
    selectionActionMode,
  ]);

  const handleSelectionDelete = useCallback(() => {
    const row = selectedRecurring[0];
    if (selectionActionMode === "single" && row) {
      handleDeleteClick(row);
      return;
    }

    setIsBulkDeleteDialogOpen(true);
  }, [handleDeleteClick, selectedRecurring, selectionActionMode]);

  const bulkEditPatch = buildBulkPatch(
    normalizeBulkFieldActions(bulkFieldActions),
  );
  const bulkEditSubmitDisabled = Object.keys(bulkEditPatch).length === 0;

  const handleBulkDeleteConfirm = useCallback(async () => {
    if (selectedRecurringIds.length === 0) {
      setIsBulkDeleteDialogOpen(false);
      return;
    }

    const toastId = toast.loading(
      t("bulkDelete.recurring.toast.loading", {
        count: selectedRecurringIds.length,
      })
    );

    try {
      const result = await deleteRecurringBulkAction(selectedRecurringIds);
      toast.dismiss(toastId);
      toast.success(
        t("bulkDelete.recurring.toast.success", {
          count: selectedRecurringIds.length,
        })
      );
      clearSelection();
      setIsBulkDeleteDialogOpen(false);
      if (result.refreshError) {
        toast.warning(t("bulkFeedback.refreshWarning"));
      }
    } catch (err: unknown) {
      logger.error("Failed to bulk delete recurring transactions:", err);
      toast.dismiss(toastId);
      toast.error(
        t("bulkDelete.recurring.toast.error", {
          error: getErrorMessage(err) || t("messages.unknownError"),
        })
      );
    }
  }, [clearSelection, deleteRecurringBulkAction, selectedRecurringIds, t]);

  const handleBulkEditSubmit = useCallback(async () => {
    if (selectedRecurringIds.length === 0) {
      return;
    }

    const patch = buildBulkPatch(normalizeBulkFieldActions(bulkFieldActions));
    try {
      assertBulkPatch(patch);
    } catch {
      return;
    }

    const toastId = toast.loading(
      t("bulkEdit.recurring.toast.loading", {
        count: selectedRecurringIds.length,
      })
    );

    try {
      const result = await updateRecurringBulkAction(
        selectedRecurringIds,
        patch
      );
      toast.dismiss(toastId);
      setIsBulkEditOpen(false);
      requestAnimationFrame(() => {
        clearSelection();
        toast.success(
          t("bulkEdit.recurring.toast.success", {
            count: selectedRecurringIds.length,
          })
        );
        if (result.refreshError) {
          toast.warning(t("bulkFeedback.refreshWarning"));
        }
      });
    } catch (err: unknown) {
      logger.error("Failed to bulk update recurring transactions:", err);
      toast.dismiss(toastId);
      toast.error(
        t("bulkEdit.recurring.toast.error", {
          error: getErrorMessage(err) || t("messages.unknownError"),
        })
      );
    }
  }, [
    bulkFieldActions,
    clearSelection,
    selectedRecurringIds,
    t,
    updateRecurringBulkAction,
  ]);

  useEffect(() => {
    fetchRecurring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sorting, filters]);

  useEffect(() => {
    if (previousSelectionScopeKey.current !== selectionScopeKey) {
      clearSelection();
      previousSelectionScopeKey.current = selectionScopeKey;
    }
  }, [clearSelection, selectionScopeKey]);

  const handleSort = useCallback(
    (field: SortableField) => {
      setSorting(field);
    },
    [setSorting]
  );

  const sortableColumns = useMemo(
    () => [
      { label: t("columns.type"), field: "type" as SortableField },
      {
        label: t("columns.description"),
        field: "description" as SortableField,
      },
      {
        label: t("columns.paymentMethod"),
        field: "payment_method" as SortableField,
      },
      { label: t("columns.amount"), field: "amount" as SortableField },
      {
        label: t("recurringColumns.frequency"),
        field: "frequency" as SortableField,
      },
      {
        label: t("recurringColumns.nextDueDate"),
        field: "next_due_date" as SortableField,
      },
      { label: t("recurringColumns.status"), field: "status" as SortableField },
    ],
    [t]
  );

  return (
    <>
      <RecurringTransactionsFilters />

      <div className="mt-4 rounded-lg border border-info/30 bg-info/10 p-4 text-info flex items-start gap-3">
        <InfoIcon className="h-5 w-5 mt-0.5 shrink-0" />
        <div>
          <h4 className="font-semibold text-sm">
            {t("recurringTable.howItWorks.title")}
          </h4>
          <p className="text-sm mt-1 opacity-90">
            {platform === "desktop"
              ? t("recurringTable.howItWorks.descriptionDesktop")
              : t("recurringTable.howItWorks.descriptionWeb")}
          </p>
        </div>
      </div>

      <Card className="mt-4">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1.5">
            <CardTitle>{t("recurringTable.title")}</CardTitle>
            <CardDescription>{t("recurringTable.description")}</CardDescription>
          </div>
          <BulkActionsToolbar
            selectedCount={selection.selectedCount}
            selectedCountLabel={t("bulkToolbar.selectedRecurringCount", {
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
            ariaLabel={t("bulkToolbar.recurringAriaLabel")}
            pending={bulkPending}
            editDisabled={
              selectionActionMode === "single"
                ? selectedRecurring[0]?.status === "completed"
                : !Object.values(bulkFieldAvailability).some(Boolean)
            }
            dir={i18n.dir()}
          />
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <RecurringTransactionsTableHeader
                sorting={sorting}
                handleSort={handleSort}
                sortableColumns={sortableColumns}
                extraColumns={[
                  { label: t("recurringColumns.progress") },
                  { label: t("columns.actions") },
                ]}
                selectionChecked={selection.checked}
                onToggleAllLoaded={selection.toggleAllLoaded}
                selectAllLoadedLabel={t("bulkSelection.selectAllLoadedRecurring", {
                  count: selection.loadedCount,
                })}
                selectionDisabled={loading || bulkPending || recurring.length === 0}
              />
              <TableBody>
                {loading &&
                  [...Array(5)].map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={10}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!loading && !error && recurring.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="h-24 text-center">
                      {t("recurringTable.noData")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && error && (
                  <TableRow>
                    <TableCell
                      colSpan={10}
                      className="h-24 text-center text-destructive"
                    >
                      {t("messages.loadingError", { error })}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  recurring.map((rec) => (
                    <TableRow
                      key={rec.id}
                      data-state={
                        selection.selectedIds.has(rec.id) ? "selected" : undefined
                      }
                    >
                      <TableCell className="text-center whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={cn(
                            "border",
                            typeBadgeColors[rec.type as TransactionType]
                          )}
                        >
                          {t(`types.${rec.type}`, rec.type)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-start">
                        {rec.description || "-"}
                      </TableCell>
                      <TableCell className="text-start">
                        {formatPaymentMethod(
                          rec.payment_method,
                          i18n.language,
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-center font-medium whitespace-nowrap">
                        <CurrencyConversionInfo
                          amount={rec.amount}
                          currency={rec.currency}
                          originalAmount={rec.original_amount}
                          originalCurrency={rec.original_currency}
                          conversionRate={rec.conversion_rate}
                          conversionDate={rec.conversion_date}
                          rateSource={rec.rate_source}
                          mode="live"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {t(
                          `recurring.frequencies.${rec.frequency}`,
                          rec.frequency
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {new Date(rec.next_due_date).toLocaleDateString(
                          i18n.language
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={cn(
                            "border",
                            recurringStatusBadgeColors[rec.status]
                          )}
                        >
                          {t(`recurring.statuses.${rec.status}`, rec.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <RecurringProgressBadge
                          status={rec.status}
                          type={rec.type}
                          executionCount={rec.execution_count}
                          totalOccurrences={rec.total_occurrences}
                          frequency={rec.frequency}
                          dayOfMonth={rec.day_of_month}
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <span className="sr-only">
                                {t("accessibility.openMenu")}
                              </span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>
                              {t("actions.title")}
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                requestAnimationFrame(() =>
                                  handleEditClick(rec)
                                );
                              }}
                              disabled={rec.status === "completed"}
                            >
                              {t("actions.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive hover:!text-destructive focus:!text-destructive"
                              onClick={() => {
                                requestAnimationFrame(() =>
                                  handleDeleteClick(rec)
                                );
                              }}
                            >
                              {t("actions.delete")}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                      <TableCell className="w-12 overflow-visible text-center whitespace-nowrap">
                        <Checkbox
                          checked={selection.selectedIds.has(rec.id)}
                          onCheckedChange={() => selection.toggle(rec.id)}
                          disabled={bulkPending}
                          aria-label={t("bulkSelection.selectRecurringRow", {
                            description:
                              rec.description ||
                              t("messages.defaultRecurringName"),
                          })}
                          className="relative before:absolute before:-inset-3.5 before:content-['']"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      {isEditModalOpen && selectedTransaction && (
        <RecurringTransactionEditModal
          isOpen={isEditModalOpen}
          onClose={handleCloseModal}
          onSubmitSuccess={clearSelection}
          transaction={selectedTransaction}
        />
      )}
      <BulkEditDialog
        open={isBulkEditOpen}
        onOpenChange={handleBulkEditOpenChange}
        title={t("bulkEdit.recurring.title")}
        description={t("bulkEdit.recurring.description", {
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
          chomeshType={bulkChomeshType}
          sharedValues={sharedBulkValues}
          onActionsChange={setBulkFieldActions}
        />
      </BulkEditDialog>
      <DeleteConfirmationDialog
        isOpen={isBulkDeleteDialogOpen}
        onOpenChange={setIsBulkDeleteDialogOpen}
        onConfirm={handleBulkDeleteConfirm}
        title={t("bulkDelete.recurring.title")}
        description={t("bulkDelete.recurring.description", {
          count: selection.selectedCount,
        })}
        confirmLabel={t("bulkToolbar.delete")}
        pendingLabel={t("bulkDelete.pending")}
        pending={bulkPending}
      />
      <DeleteConfirmationDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title={t("recurringTable.deleteTitle")}
        description={t("recurringTable.deleteDescription")}
      />
    </>
  );
}
