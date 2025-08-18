import React from "react";
import { useTranslation } from "react-i18next";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ChevronsUpDown } from "lucide-react";
import { Transaction } from "@/types/transaction";

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
}

export const TransactionsTableHeader: React.FC<
  TransactionsTableHeaderProps
> = ({ sorting, handleSort, sortableColumns }) => {
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

  const getAlignmentClass = (field: SortableField) => {
    switch (field) {
      case "date":
      case "description":
        return "text-start";
      case "amount":
      case "type":
      case "category":
      case "recipient":
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
            className={`${getAlignmentClass(
              col.field
            )} whitespace-nowrap cursor-pointer hover:bg-muted/50`}
            onClick={() => handleSort(col.field)}
          >
            <div
              className={`flex items-center ${
                getAlignmentClass(col.field) === "text-center"
                  ? "justify-center"
                  : ""
              }`}
            >
              {col.label}
              {renderSortIcon(col.field)}
            </div>
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
      </TableRow>
    </TableHeader>
  );
};
