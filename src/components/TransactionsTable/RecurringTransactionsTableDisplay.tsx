import React, { useEffect, useMemo, useState } from "react";
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
import { MoreHorizontal, Repeat, Infinity } from "lucide-react";
import { RecurringTransaction, TransactionType } from "@/types/transaction";
import {
  recurringFrequencyLabels,
  recurringStatusLabels,
  recurringStatusBadgeColors,
} from "@/types/recurringTransactionLabels";
import {
  transactionTypeLabels,
  typeBadgeColors,
} from "@/types/transactionLabels";
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

export function RecurringTransactionsTableDisplay() {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<RecurringTransaction | null>(null);

  const handleEditClick = (transaction: RecurringTransaction) => {
    setSelectedTransaction(transaction);
    setIsEditModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setSelectedTransaction(null);
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

  const handleSort = (field: SortableField) => {
    setSorting(field);
  };

  const sortableColumns = useMemo(
    () => [
      { label: "סוג", field: "type" as SortableField },
      { label: "תיאור", field: "description" as SortableField },
      { label: "סכום", field: "amount" as SortableField },
      { label: "תדירות", field: "frequency" as SortableField },
      { label: "תאריך ביצוע הבא", field: "next_due_date" as SortableField },
      { label: "סטטוס", field: "status" as SortableField },
    ],
    []
  );

  return (
    <>
      <RecurringTransactionsFilters />
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>הוראות קבע</CardTitle>
          <CardDescription>
            רשימת כל הוראות הקבע הפעילות והלא פעילות.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <RecurringTransactionsTableHeader
                sorting={sorting}
                handleSort={handleSort}
                sortableColumns={sortableColumns}
                extraColumns={[{ label: "התקדמות" }, { label: "פעולות" }]}
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
                      לא נמצאו הוראות קבע.
                    </TableCell>
                  </TableRow>
                )}
                {!loading && error && (
                  <TableRow>
                    <TableCell
                      colSpan={8}
                      className="h-24 text-center text-red-500"
                    >
                      שגיאה בטעינת הנתונים: {error}
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
                          {transactionTypeLabels[rec.type as TransactionType] ||
                            rec.type}
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
                        {recurringFrequencyLabels[rec.frequency] ||
                          rec.frequency}
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
                          {recurringStatusLabels[rec.status] || rec.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant="secondary"
                                className="cursor-pointer"
                              >
                                <Repeat className="w-4 h-4 ml-1" />
                                {rec.total_occurrences ? (
                                  <span>
                                    {rec.execution_count} /{" "}
                                    {rec.total_occurrences}
                                  </span>
                                ) : (
                                  <Infinity className="w-4 h-4" />
                                )}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>
                                בוצעו {rec.execution_count} תשלומים מתוך{" "}
                                {rec.total_occurrences || "∞"}.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </TableCell>
                      <TableCell>
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
                              onClick={() => handleEditClick(rec)}
                            >
                              עריכה
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              מחק (לא פעיל)
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
    </>
  );
}
