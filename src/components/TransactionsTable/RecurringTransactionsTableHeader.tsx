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
      return (
        <ChevronsUpDown
          aria-hidden="true"
          className="h-4 w-4 opacity-50"
        />
      );
    }
    if (sorting.direction === "asc") {
      return <ArrowUp aria-hidden="true" className="h-4 w-4" />;
    }
    return <ArrowDown aria-hidden="true" className="h-4 w-4" />;
  };

  const getAriaSort = (
    field: SortableField
  ): React.AriaAttributes["aria-sort"] => {
    if (sorting.field !== field) {
      return "none";
    }

    return sorting.direction === "asc" ? "ascending" : "descending";
  };

  return (
    <TableHeader>
      <TableRow>
        {sortableColumns.map((col) => (
          <TableHead
            key={col.field}
            aria-sort={getAriaSort(col.field)}
            className={cn(
              "whitespace-nowrap",
              getAlignmentClass(col.field)
            )}
          >
            <button
              type="button"
              className={cn(
                "flex h-full w-full items-center gap-2 rounded-sm border-0 bg-transparent px-0 py-2 text-inherit focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                getAlignmentClass(col.field) === "text-center"
                  ? "justify-center"
                  : "justify-start"
              )}
              onClick={() => handleSort(col.field)}
            >
              {col.label}
              {renderSortIcon(col.field)}
            </button>
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
        <TableHead className="w-12 overflow-visible text-center whitespace-nowrap">
          <Checkbox
            checked={selectionChecked}
            onCheckedChange={onToggleAllLoaded}
            disabled={selectionDisabled}
            aria-label={selectAllLoadedLabel}
            className="relative before:absolute before:-inset-3.5 before:content-['']"
          />
        </TableHead>
      </TableRow>
    </TableHeader>
  );
};
