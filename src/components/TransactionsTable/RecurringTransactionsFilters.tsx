import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { recurringStatusLabels } from "@/types/recurringTransactionLabels";
import { useRecurringTableStore } from "@/lib/tableTransactions/recurringTable.store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ListFilter } from "lucide-react";

// Moved to translation files - no longer needed

export function RecurringTransactionsFilters() {
  const { t } = useTranslation("data-tables");
  const { filters, setFilters, resetFilters } = useRecurringTableStore();
  const [localSearch, setLocalSearch] = useState(filters.search);

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== filters.search) {
        setFilters({ search: localSearch });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [localSearch, filters.search, setFilters]);

  // Sync local search with global state on reset
  useEffect(() => {
    setLocalSearch(filters.search);
  }, [filters.search]);

  const handleStatusChange = (newSelection: string[]) => {
    setFilters({ statuses: newSelection });
  };

  const handleReset = () => {
    resetFilters();
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">{t("recurringFilters.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Input
            placeholder={t("recurringFilters.searchPlaceholder")}
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 justify-between">
                <span>
                  {filters.statuses.length === 0
                    ? t("recurringFilters.filterByStatus")
                    : filters.statuses.length === 1
                    ? t(`recurring.statuses.${filters.statuses[0]}`)
                    : t("recurringFilters.statusesSelected", {
                        count: filters.statuses.length,
                      })}
                </span>
                <ListFilter className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>{t("recurring.status")}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {["active", "paused", "completed", "cancelled"].map((status) => (
                <DropdownMenuCheckboxItem
                  key={status}
                  checked={filters.statuses.includes(status)}
                  onCheckedChange={(checked) => {
                    const newSelection = checked
                      ? [...filters.statuses, status]
                      : filters.statuses.filter((s) => s !== status);
                    handleStatusChange(newSelection);
                  }}
                >
                  {t(`recurring.statuses.${status}`)}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleReset} variant="outline">
            {t("filters.resetFilters")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
