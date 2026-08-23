import React from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { RecurringTransaction } from "@/types/transaction";
import { cn } from "@/lib/utils/formatting";

export type SortableField = keyof RecurringTransaction | string;

interface RecurringTableHeaderProps {
  sorting: {
    field: string;
    direction: "asc" | "desc";
  };
  handleSort: (field: SortableField) => void;
  sortableColumns: { label: string; field: SortableField }[];
  extraColumns?: { label: string }[];
  selectionChecked: CheckedState;
  onToggleAllLoaded: () => void;
  selectAllLoadedLabel: string;
  selectionDisabled?: boolean;
}

function getAlignmentClass(field: SortableField): string {
  switch (field) {
    case "description":
    case "payment_method":
      return "text-start";
    case "type":
    case "amount":
    case "frequency":
    case "next_due_date":
    case "status":
      return "text-center";
    default:
      return "text-start";
  }
}

export const RecurringTransactionsTableHeader: React.FC<
  RecurringTableHeaderProps
> = ({
  sorting,
  handleSort,
  sortableColumns,
  extraColumns = [],
  selectionChecked,
  onToggleAllLoaded,
  selectAllLoadedLabel,
  selectionDisabled = false,
}) => {
  const renderSortIcon = (field: SortableField) => {
    if (sorting.field !== field) {
      return <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />;
    }
    if (sorting.direction === "asc") {
      return <ArrowUp className="ml-2 h-4 w-4" />;
    }
    return <ArrowDown className="ml-2 h-4 w-4" />;
  };

  return (
    <TableHeader>
      <TableRow>
        <TableHead className="sticky rtl:right-0 ltr:left-0 z-30 w-12 bg-muted/95 text-center whitespace-nowrap">
          <Checkbox
            checked={selectionChecked}
            onCheckedChange={onToggleAllLoaded}
            disabled={selectionDisabled}
            aria-label={selectAllLoadedLabel}
          />
        </TableHead>
        {sortableColumns.map((col) => (
          <TableHead
            key={col.field}
            className={cn(
              "whitespace-nowrap cursor-pointer hover:bg-muted/50",
              getAlignmentClass(col.field)
            )}
            onClick={() => handleSort(col.field)}
          >
            <div
              className={cn(
                "flex items-center",
                getAlignmentClass(col.field) === "text-center"
                  ? "justify-center"
                  : ""
              )}
            >
              {col.label}
              {renderSortIcon(col.field)}
            </div>
          </TableHead>
        ))}
        {extraColumns.map((col, index) => (
          <TableHead
            key={`extra-${index}`}
            className="text-center whitespace-nowrap"
          >
            {col.label}
          </TableHead>
        ))}
      </TableRow>
    </TableHeader>
  );
};
