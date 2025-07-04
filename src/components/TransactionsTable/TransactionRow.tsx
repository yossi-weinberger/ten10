import React from "react";
import {
  Transaction,
  TransactionForTable,
  TransactionType,
} from "@/types/transaction";
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TableCell, TableRow } from "@/components/ui/table";
import { MoreHorizontal, Trash2, Edit3, Repeat, Infinity } from "lucide-react";
import {
  transactionTypeLabels,
  typeBadgeColors,
} from "@/types/transactionLabels";
import { formatBoolean, cn } from "@/lib/utils/formatting"; // Import helper functions

const recurringStatusMap: { [key: string]: string } = {
  active: "פעיל",
  paused: "מושהה",
  completed: "הושלם",
  cancelled: "בוטל",
};

const recurringFrequencyMap: { [key: string]: string } = {
  daily: "יומי",
  weekly: "שבועי",
  monthly: "חודשי",
  yearly: "שנתי",
};

interface TransactionRowProps {
  transaction: TransactionForTable;
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
}

const TransactionRowComponent: React.FC<TransactionRowProps> = ({
  transaction,
  onEdit,
  onDelete,
}) => {
  return (
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
          {transactionTypeLabels[transaction.type as TransactionType] ||
            transaction.type}
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
      <TableCell className="text-center whitespace-nowrap">
        {transaction.recurring_info ? (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="outline"
                  className={cn(
                    "cursor-default",
                    transaction.recurring_info.status === "active"
                      ? "border-green-500 text-green-700"
                      : "border-gray-400 text-gray-600"
                  )}
                >
                  <div className="flex items-center gap-1">
                    {transaction.recurring_info.total_occurrences ? (
                      <span>
                        {transaction.occurrence_number ??
                          transaction.recurring_info.execution_count}
                        /{transaction.recurring_info.total_occurrences}
                      </span>
                    ) : (
                      <div className="flex items-center gap-1" dir="ltr">
                        <span>
                          {transaction.occurrence_number ??
                            transaction.recurring_info.execution_count}
                        </span>
                        <span>/</span>
                        <Infinity className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  סטטוס:{" "}
                  {recurringStatusMap[transaction.recurring_info.status] ||
                    transaction.recurring_info.status}
                </p>
                <p>
                  תדירות:{" "}
                  {recurringFrequencyMap[
                    transaction.recurring_info.frequency
                  ] || transaction.recurring_info.frequency}
                </p>
                {transaction.recurring_info.frequency === "monthly" &&
                  transaction.recurring_info.day_of_month && (
                    <p>יום חיוב: {transaction.recurring_info.day_of_month}</p>
                  )}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          "-"
        )}
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
            <DropdownMenuItem onClick={() => onEdit(transaction)}>
              <Edit3 className="mr-2 h-4 w-4" />
              עריכה
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => onDelete(transaction)}
              className="text-red-600 hover:!text-red-600 focus:!text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              מחיקה
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
};

export const TransactionRow = React.memo(TransactionRowComponent);
