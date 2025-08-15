import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
  ColumnDef,
} from "@tanstack/react-table";
import { useRecurringTableStore } from "@/lib/tableTransactions/recurringTable.store";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { toast } from "sonner";
import { deleteRecurringTransaction } from "@/lib/tableTransactions/recurringTable.service";
import { MoreHorizontal, Repeat, Infinity } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils/formatting";
import { Skeleton } from "@/components/ui/skeleton";
import { RecurringTransactionsFilters } from "./RecurringTransactionsFilters";
import {
  RecurringTransactionsTableHeader,
  SortableField,
} from "./RecurringTransactionsTableHeader";
import { RecurringProgressBadge } from "./RecurringProgressBadge";
import { DeleteConfirmationDialog } from "../ui/DeleteConfirmationDialog";

export function RecurringTransactionsTableDisplay() {
  const { t } = useTranslation("data-tables");
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<RecurringTransaction | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [transactionToDelete, setTransactionToDelete] =
    useState<RecurringTransaction | null>(null);

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
      fetchRecurring(); // Refresh the table
    } catch (error) {
      console.error("Failed to delete recurring transaction:", error);
      toast.error(t("messages.recurringDeleteError"));
    } finally {
      setIsDeleteDialogOpen(false);
      setTransactionToDelete(null);
    }
  };

  const {
    recurring,
    loading,
    error,
    fetchRecurring,
    sorting,
    setSorting,
    filters,
  } = useRecurringTableStore();

  useEffect(() => {
    fetchRecurring();
  }, [fetchRecurring, sorting, filters]);

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
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>{t("recurringTable.title")}</CardTitle>
          <CardDescription>{t("recurringTable.description")}</CardDescription>
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
              />
              <TableBody>
                {loading &&
                  [...Array(5)].map((_, i) => (
                    <TableRow key={`skeleton-${i}`}>
                      <TableCell colSpan={8}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    </TableRow>
                  ))}
                {!loading && !error && recurring.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      {t("recurringTable.noData")}
                    </TableCell>
                  </TableRow>
                )}
                {!loading && error && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-red-500"
                    >
                      {t("messages.loadingError", { error })}
                    </TableCell>
                  </TableRow>
                )}
                {!loading &&
                  recurring.map((rec) => (
                    <TableRow key={rec.id}>
                      <TableCell className="text-right whitespace-nowrap">
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
                      <TableCell>{rec.description || "-"}</TableCell>
                      <TableCell className="font-medium whitespace-nowrap">
                        {rec.amount.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{" "}
                        {rec.currency}
                      </TableCell>
                      <TableCell>
                        {t(
                          `recurring.frequencies.${rec.frequency}`,
                          rec.frequency
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(rec.next_due_date).toLocaleDateString(
                          "he-IL"
                        )}
                      </TableCell>
                      <TableCell>
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
                      <TableCell>
                        <RecurringProgressBadge
                          status={rec.status}
                          type={rec.type}
                          executionCount={rec.execution_count}
                          totalOccurrences={rec.total_occurrences}
                          frequency={rec.frequency}
                          dayOfMonth={rec.day_of_month}
                        />
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
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
                              onClick={() => handleEditClick(rec)}
                              disabled={rec.status === "completed"}
                            >
                              {t("actions.edit")}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => handleDeleteClick(rec)}
                              disabled={rec.status === "completed"}
                            >
                              {t("actions.delete")}
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
      <RecurringTransactionEditModal
        isOpen={isEditModalOpen}
        onClose={handleCloseModal}
        transaction={selectedTransaction}
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
