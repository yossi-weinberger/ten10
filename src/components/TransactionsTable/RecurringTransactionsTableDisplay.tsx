import {
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import { logger } from "@/lib/logger";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { useRecurringTableStore } from "@/lib/tableTransactions/recurringTable.store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  CirclePause,
  CreditCard,
  InfoIcon,
  MoreHorizontal,
  Tags,
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
import { CurrencyConversionInfo } from "@/components/Currency/CurrencyConversionInfo";
import { BulkActionsToolbar } from "./BulkActionsToolbar";
import { BulkEditDialog } from "./BulkEditDialog";
import { PaymentMethodCombobox } from "@/components/ui/payment-method-combobox";
import { CategoryCombobox } from "@/components/ui/category-combobox";
import { useLoadedRowSelection } from "@/hooks/useLoadedRowSelection";
import {
  getBulkCategoryFamily,
  getBulkEditAvailability,
  isRecurringBulkStatusValue,
  RECURRING_BULK_STATUS_VALUES,
  type RecurringBulkChange,
  type RecurringBulkField,
  type RecurringBulkStatusValue,
} from "@/lib/tableTransactions/bulkActions";
import { getErrorMessage } from "@/lib/utils/error-message";

type RecurringBulkEditField = RecurringBulkField;
type BulkEditValueAction = "untouched" | "set" | "clear";

function normalizeNullableBulkValue(value: string | null): string | null {
  const normalized = value?.trim() ?? "";
  return normalized.length > 0 ? normalized : null;
}

export function RecurringTransactionsTableDisplay() {
  const { t, i18n } = useTranslation(["data-tables", "transactions"]);
  const { platform } = usePlatform();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<RecurringTransaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] =
    useState<RecurringTransaction | null>(null);
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [isBulkDeleteDialogOpen, setIsBulkDeleteDialogOpen] = useState(false);
  const [bulkEditField, setBulkEditField] =
    useState<RecurringBulkEditField | "">("");
  const [bulkStatus, setBulkStatus] =
    useState<RecurringBulkStatusValue | "">("");
  const [bulkPaymentMethod, setBulkPaymentMethod] = useState<string | null>(null);
  const [bulkPaymentMethodAction, setBulkPaymentMethodAction] =
    useState<BulkEditValueAction>("untouched");
  const [bulkCategory, setBulkCategory] = useState<string | null>(null);
  const [bulkCategoryAction, setBulkCategoryAction] =
    useState<BulkEditValueAction>("untouched");

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

  const handleDeleteClick = (transaction: RecurringTransaction) => {
    setTransactionToDelete(transaction);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      await deleteRecurringTransaction(transactionToDelete.id);
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
  const selectedRecurringIds = selectedRecurring.map(
    (transaction) => transaction.id
  );
  const bulkCategoryFamily = getBulkCategoryFamily(selectedRecurring);
  const bulkPending = bulkLoading;

  const recurringBulkFields: {
    value: RecurringBulkEditField;
    label: string;
    icon: ReactNode;
  }[] = [];
  const statusAvailability = getBulkEditAvailability({
    kind: "recurring",
    rows: selectedRecurring,
    field: "status",
  });
  const paymentMethodAvailability = getBulkEditAvailability({
    kind: "recurring",
    rows: selectedRecurring,
    field: "payment_method",
  });
  const categoryAvailability = getBulkEditAvailability({
    kind: "recurring",
    rows: selectedRecurring,
    field: "category",
  });

  if (statusAvailability.allowed) {
    recurringBulkFields.push({
      value: "status",
      label: t("bulkEdit.fields.status"),
      icon: <CirclePause aria-hidden="true" className="h-4 w-4" />,
    });
  }

  if (paymentMethodAvailability.allowed) {
    recurringBulkFields.push({
      value: "payment_method",
      label: t("bulkEdit.fields.paymentMethod"),
      icon: <CreditCard aria-hidden="true" className="h-4 w-4" />,
    });
  }

  if (categoryAvailability.allowed) {
    recurringBulkFields.push({
      value: "category",
      label: t("bulkEdit.fields.category"),
      icon: <Tags aria-hidden="true" className="h-4 w-4" />,
    });
  }

  const activeBulkEditField = recurringBulkFields.some(
    (field) => field.value === bulkEditField
  )
    ? bulkEditField
    : recurringBulkFields[0]?.value ?? "";

  const resetBulkEditValues = useCallback(() => {
    setBulkStatus("");
    setBulkPaymentMethod(null);
    setBulkPaymentMethodAction("untouched");
    setBulkCategory(null);
    setBulkCategoryAction("untouched");
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

  const bulkEditSubmitDisabled = (() => {
    switch (activeBulkEditField) {
      case "status":
        return bulkStatus === "";
      case "payment_method":
        return bulkPaymentMethodAction === "untouched";
      case "category":
        return bulkCategoryFamily === null || bulkCategoryAction === "untouched";
      case "":
        return true;
      default: {
        const exhaustive: never = activeBulkEditField;
        return exhaustive;
      }
    }
  })();

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
      await deleteRecurringBulkAction(selectedRecurringIds);
      toast.dismiss(toastId);
      toast.success(
        t("bulkDelete.recurring.toast.success", {
          count: selectedRecurringIds.length,
        })
      );
      clearSelection();
      setIsBulkDeleteDialogOpen(false);
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
    if (selectedRecurringIds.length === 0 || activeBulkEditField === "") {
      return;
    }

    let change: RecurringBulkChange;

    switch (activeBulkEditField) {
      case "status":
        if (bulkStatus === "") {
          return;
        }
        change = {
          kind: "recurring",
          field: "status",
          value: bulkStatus,
        };
        break;
      case "payment_method":
        change = {
          kind: "recurring",
          field: "payment_method",
          value:
            bulkPaymentMethodAction === "clear"
              ? null
              : normalizeNullableBulkValue(bulkPaymentMethod),
        };
        break;
      case "category":
        change = {
          kind: "recurring",
          field: "category",
          value:
            bulkCategoryAction === "clear"
              ? null
              : normalizeNullableBulkValue(bulkCategory),
        };
        break;
      case "":
        return;
      default: {
        const exhaustive: never = activeBulkEditField;
        return exhaustive;
      }
    }
    const toastId = toast.loading(
      t("bulkEdit.recurring.toast.loading", {
        count: selectedRecurringIds.length,
      })
    );

    try {
      await updateRecurringBulkAction(selectedRecurringIds, change);
      toast.dismiss(toastId);
      setIsBulkEditOpen(false);
      requestAnimationFrame(() => {
        void (async () => {
          clearSelection();
          await fetchRecurring();
          toast.success(
            t("bulkEdit.recurring.toast.success", {
              count: selectedRecurringIds.length,
            })
          );
        })();
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
    activeBulkEditField,
    bulkCategory,
    bulkCategoryAction,
    bulkPaymentMethod,
    bulkPaymentMethodAction,
    bulkStatus,
    clearSelection,
    fetchRecurring,
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

  const bulkEditValueEditor = (() => {
    switch (activeBulkEditField) {
      case "status":
        return (
          <Select
            value={bulkStatus}
            onValueChange={(value) => {
              if (isRecurringBulkStatusValue(value)) {
                setBulkStatus(value);
              }
            }}
            disabled={bulkPending}
          >
            <SelectTrigger>
              <SelectValue placeholder={t("bulkEdit.placeholders.status")} />
            </SelectTrigger>
            <SelectContent>
              {RECURRING_BULK_STATUS_VALUES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`recurring.statuses.${status}`, status)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case "payment_method":
        return (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <PaymentMethodCombobox
                value={bulkPaymentMethod}
                onChange={(value) => {
                  setBulkPaymentMethod(value);
                  setBulkPaymentMethodAction(value === null ? "clear" : "set");
                }}
                placeholder={t("bulkEdit.placeholders.paymentMethod")}
                disabled={bulkPending}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 shrink-0 sm:min-h-9"
              onClick={() => {
                setBulkPaymentMethod(null);
                setBulkPaymentMethodAction("clear");
              }}
              disabled={bulkPending}
            >
              {t("bulkEdit.clearValue")}
            </Button>
          </div>
        );
      case "category":
        if (bulkCategoryFamily === null) {
          return (
            <p className="text-sm text-muted-foreground">
              {t("bulkEdit.messages.categoryUnavailable")}
            </p>
          );
        }

        return (
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <CategoryCombobox
                value={bulkCategory}
                onChange={(value) => {
                  setBulkCategory(value);
                  setBulkCategoryAction(value === null ? "clear" : "set");
                }}
                transactionType={bulkCategoryFamily}
                placeholder={t("bulkEdit.placeholders.category")}
                disabled={bulkPending}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="min-h-11 shrink-0 sm:min-h-9"
              onClick={() => {
                setBulkCategory(null);
                setBulkCategoryAction("clear");
              }}
              disabled={bulkPending}
            >
              {t("bulkEdit.clearValue")}
            </Button>
          </div>
        );
      case "":
        return (
          <p className="text-sm text-muted-foreground">
            {t("bulkEdit.messages.noAvailableFields")}
          </p>
        );
      default: {
        const exhaustive: never = activeBulkEditField;
        return exhaustive;
      }
    }
  })();

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
            editLabel={t("bulkToolbar.edit")}
            deleteLabel={t("bulkToolbar.delete")}
            clearLabel={t("bulkToolbar.clear")}
            onEdit={handleBulkEditClick}
            onDelete={() => setIsBulkDeleteDialogOpen(true)}
            onClear={clearSelection}
            ariaLabel={t("bulkToolbar.recurringAriaLabel")}
            pending={bulkPending}
            editDisabled={recurringBulkFields.length === 0}
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
      <RecurringTransactionEditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        transaction={selectedTransaction}
      />
      <BulkEditDialog
        open={isBulkEditOpen}
        onOpenChange={handleBulkEditOpenChange}
        title={t("bulkEdit.recurring.title")}
        description={t("bulkEdit.recurring.description", {
          count: selection.selectedCount,
        })}
        fieldLabel={t("bulkEdit.fieldLabel")}
        valueLabel={t("bulkEdit.valueLabel")}
        cancelLabel={t("actions.cancel")}
        submitLabel={t("bulkEdit.submit")}
        pendingLabel={t("bulkEdit.pending")}
        pending={bulkPending}
        submitDisabled={bulkEditSubmitDisabled}
        fields={recurringBulkFields}
        selectedField={activeBulkEditField}
        valueEditor={bulkEditValueEditor}
        onFieldChange={(field) =>
          setBulkEditField(field as RecurringBulkEditField)
        }
        onSubmit={handleBulkEditSubmit}
        dir={i18n.dir()}
      />
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
