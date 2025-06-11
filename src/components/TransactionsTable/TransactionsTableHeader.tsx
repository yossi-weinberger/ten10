import React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { Transaction } from "@/types/transaction"; // Assuming Transaction type is needed for SortableField

export type SortableField = keyof Transaction | string;

export interface TableSortConfig {
  field: SortableField;
  direction: "asc" | "desc";
}

interface TransactionsTableHeaderProps {
  sorting: TableSortConfig;
  handleSort: (field: SortableField) => void;
  sortableColumns: { label: string; field: SortableField }[];
}

export const TransactionsTableHeader: React.FC<
  TransactionsTableHeaderProps
> = ({ sorting, handleSort, sortableColumns }) => {
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
        <TableHead className="text-right whitespace-nowrap">חומש?</TableHead>
        <TableHead className="text-center whitespace-nowrap">
          הוראת קבע
        </TableHead>
        <TableHead className="text-center whitespace-nowrap">פעולות</TableHead>
      </TableRow>
    </TableHeader>
  );
};
