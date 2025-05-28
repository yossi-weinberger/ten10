import React from "react";
import { Transaction, TransactionType } from "@/types/transaction";
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
import { MoreHorizontal, Trash2, Edit3 } from "lucide-react";
import {
  transactionTypeLabels,
  typeBadgeColors,
} from "@/types/transactionLabels";
import { formatBoolean, cn } from "@/utils/formatting"; // Import helper functions

interface TransactionRowProps {
  transaction: Transaction;
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
