import React from "react";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { useTranslation } from "react-i18next";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { Transaction } from "@/types/transaction";
import { cn } from "@/lib/utils/formatting";

export type SortableField = keyof Transaction | string;

export interface TableSortConfig {
  field: SortableField;
  direction: "asc" | "desc";
}

interface TransactionsTableHeaderProps {
  sorting: {
    field: string;
    direction: "asc" | "desc";
  };
  handleSort: (field: SortableField) => void;
  sortableColumns: { label: string; field: SortableField }[];
  selectionChecked: CheckedState;
  onToggleAllLoaded: () => void;
  selectAllLoadedLabel: string;
  selectionDisabled?: boolean;
}

export const TransactionsTableHeader: React.FC<
  TransactionsTableHeaderProps
> = ({
  sorting,
  handleSort,
  sortableColumns,
  selectionChecked,
  onToggleAllLoaded,
  selectAllLoadedLabel,
  selectionDisabled = false,
}) => {
  const { t } = useTranslation("data-tables");
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

  const getAlignmentClass = (field: SortableField) => {
    switch (field) {
      case "date":
      case "description":
        return "text-start";
      case "amount":
      case "type":
      case "category":
      case "recipient":
      case "payment_method":
        return "text-center";
      default:
        return "text-start";
    }
  };

  return (
    <TableHeader>
      <TableRow>
        {sortableColumns.map((col) => (
          <TableHead
            key={col.field}
            aria-sort={getAriaSort(col.field)}
            className={cn("whitespace-nowrap", getAlignmentClass(col.field))}
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
        <TableHead className="text-center whitespace-nowrap">
          {t("columns.chomesh")}
        </TableHead>
        <TableHead className="text-center whitespace-nowrap">
          {t("columns.recurring")}
        </TableHead>
        <TableHead className="text-center whitespace-nowrap">
          {t("columns.actions")}
        </TableHead>
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
