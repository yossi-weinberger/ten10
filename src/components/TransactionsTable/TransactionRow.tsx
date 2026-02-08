import React from "react";
import { useTranslation } from "react-i18next";
import { Transaction, TransactionForTable, TransactionType } from "@/types/transaction";
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
import { TableCell, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Trash2, Edit3, Repeat } from "lucide-react";
import { typeBadgeColors } from "@/types/transactionLabels";
import { formatBoolean, cn } from "@/lib/utils/formatting";
import { RecurringProgressBadge } from "./RecurringProgressBadge";
import { CurrencyConversionInfo } from "@/components/Currency/CurrencyConversionInfo";

interface TransactionRowProps {
  transaction: TransactionForTable;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onEditRecurring: (recurringId: string) => void;
  isFetchingRec: boolean;
}

const TransactionRowComponent: React.FC<TransactionRowProps> = ({
  transaction,
  onEdit,
  onDelete,
  onEditRecurring,
  isFetchingRec,
}) => {
  const { t } = useTranslation("data-tables");
  const { t: tTransactions } = useTranslation("transactions");

  return (
    <TableRow key={transaction.id}>
      <TableCell className="text-start whitespace-nowrap">
        {new Date(transaction.date).toLocaleDateString("he-IL", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        })}
      </TableCell>
      <TableCell className="text-start">
        {transaction.description || "-"}
      </TableCell>
      <TableCell className="text-center font-medium whitespace-nowrap">
        <CurrencyConversionInfo
          amount={transaction.amount}
          currency={transaction.currency}
          originalAmount={transaction.original_amount}
          originalCurrency={transaction.original_currency}
          conversionRate={transaction.conversion_rate}
          conversionDate={transaction.conversion_date}
          rateSource={transaction.rate_source}
          mode="static"
        />
      </TableCell>
      <TableCell className="text-center whitespace-nowrap">
        <Badge
          variant="outline"
          className={cn(
            "border",
            typeBadgeColors[transaction.type as TransactionType]
          )}
        >
          {t(`types.${transaction.type}`, transaction.type)}
        </Badge>
      </TableCell>
      <TableCell className="text-center">
        {transaction.category || "-"}
      </TableCell>
      <TableCell className="text-center">
        {transaction.recipient || "-"}
      </TableCell>
      <TableCell className="text-center">
        {transaction.payment_method
          ? tTransactions(
              `transactionForm.paymentMethod.options.${transaction.payment_method}`,
              transaction.payment_method
            )
          : "-"}
      </TableCell>
      <TableCell className="text-center whitespace-nowrap">
        {formatBoolean(transaction.is_chomesh)}
      </TableCell>
      <TableCell className="text-center whitespace-nowrap">
        {transaction.recurring_info ? (
          <RecurringProgressBadge
            status={transaction.recurring_info.status}
            type={transaction.type}
            executionCount={transaction.recurring_info.execution_count}
            totalOccurrences={transaction.recurring_info.total_occurrences}
            occurrenceNumber={transaction.occurrence_number}
            frequency={transaction.recurring_info.frequency}
            dayOfMonth={transaction.recurring_info.day_of_month}
          />
        ) : (
          "-"
        )}
      </TableCell>
      <TableCell className="text-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="h-8 w-8 p-0"
              disabled={isFetchingRec}
            >
              <span className="sr-only">{t("accessibility.openMenu")}</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>{t("actions.title")}</DropdownMenuLabel>
            <DropdownMenuItem onClick={() => onEdit(transaction)}>
              <Edit3 className="mr-2 h-4 w-4" />
              {t("actions.edit")}
            </DropdownMenuItem>
            {transaction.source_recurring_id && (
              <DropdownMenuItem
                onClick={() =>
                  onEditRecurring(transaction.source_recurring_id!)
                }
                disabled={
                  isFetchingRec ||
                  transaction.recurring_info?.status === "completed"
                }
              >
                <Repeat className="mr-2 h-4 w-4" />
                <span>
                  {isFetchingRec
                    ? t("messages.loading")
                    : t("actions.editRecurring")}
                </span>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(transaction)}
              className="text-red-600 hover:!text-red-600 focus:!text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {t("actions.delete")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export const TransactionRow = React.memo(TransactionRowComponent);
