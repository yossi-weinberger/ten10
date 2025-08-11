import React from "react";
import { useTranslation } from "react-i18next";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { RecurringTransaction } from "@/types/transaction";

export type SortableField = keyof RecurringTransaction | string;

interface RecurringTableHeaderProps {
  sorting: {
    field: string;
    direction: "asc" | "desc";
  };
  handleSort: (field: SortableField) => void;
  sortableColumns: { label: string; field: SortableField }[];
  extraColumns?: { label: string }[];
}

export const RecurringTransactionsTableHeader: React.FC<
  RecurringTableHeaderProps
> = ({ sorting, handleSort, sortableColumns, extraColumns = [] }) => {
  const { t } = useTranslation("data-tables");
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
        {sortableColumns.map((col) => (
          <TableHead
            key={col.field}
            className="text-right whitespace-nowrap cursor-pointer hover:bg-muted/50"
            onClick={() => handleSort(col.field)}
          >
            <div className="flex items-center justify-end">
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
