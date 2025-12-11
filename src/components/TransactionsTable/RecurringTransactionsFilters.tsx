import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
// Removed - using translations instead
import { useRecurringTableStore } from "@/lib/tableTransactions/recurringTable.store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ListFilter } from "lucide-react";
import { transactionTypes } from "@/types/transaction";

// Moved to translation files - no longer needed

export function RecurringTransactionsFilters() {
  const { t } = useTranslation("data-tables");
  const { filters, setFilters, resetFilters } = useRecurringTableStore();
  const [localSearch, setLocalSearch] = useState(filters.search);
  const [localTypes, setLocalTypes] = useState<string[]>(filters.types);
  const [localFrequencies, setLocalFrequencies] = useState<string[]>(
    filters.frequencies
  );
  const [typesDropdownOpen, setTypesDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  const [frequencyDropdownOpen, setFrequencyDropdownOpen] = useState(false);

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
    setLocalTypes(filters.types);
    setLocalFrequencies(filters.frequencies);
  }, [filters.search, filters.types, filters.frequencies]);

  const handleStatusChange = (newSelection: string[]) => {
    setFilters({ statuses: newSelection });
  };

  const handleTypeChange = (type: string, checked: boolean) => {
    const newTypes = checked
      ? [...localTypes, type]
      : localTypes.filter((t) => t !== type);
    setLocalTypes(newTypes);
    setFilters({ types: newTypes });
  };

  const handleFrequencyChange = (frequency: string, checked: boolean) => {
    const newFrequencies = checked
      ? [...localFrequencies, frequency]
      : localFrequencies.filter((f) => f !== frequency);
    setLocalFrequencies(newFrequencies);
    setFilters({ frequencies: newFrequencies });
  };

  const handleReset = () => {
    resetFilters();
  };

  const stopPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="text-lg">{t("recurringFilters.title")}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-end gap-4">
          <div className="flex-grow sm:flex-grow-0 sm:w-auto">
            <Label className="mb-2 block text-sm font-medium">
              {t("filters.freeSearch")}
            </Label>
            <Input
              placeholder={t("recurringFilters.searchPlaceholder")}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className="w-full"
            />
          </div>

          <div className="flex-grow sm:flex-grow-0 sm:w-auto">
            <Label className="mb-2 block text-sm font-medium">
              {t("filters.transactionTypes")}
            </Label>
            <DropdownMenu
              open={typesDropdownOpen}
              onOpenChange={setTypesDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    {localTypes.length === 0
                      ? t("filters.allTypes")
                      : localTypes.length === 1
                      ? t(`types.${localTypes[0]}`)
                      : t("filters.typesSelected", {
                          count: localTypes.length,
                        })}
                  </span>
                  <ListFilter className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                align="start"
                onClick={stopPropagation}
              >
                <DropdownMenuLabel>
                  {t("filters.selectTransactionTypes")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {transactionTypes.map((type) => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={localTypes.includes(type)}
                    onCheckedChange={(checked) =>
                      handleTypeChange(type, !!checked)
                    }
                    onClick={stopPropagation}
                  >
                    {t(`types.${type}`)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex-grow sm:flex-grow-0 sm:w-auto">
            <Label className="mb-2 block text-sm font-medium">
              {t("recurringFilters.filterByStatus")}
            </Label>
            <DropdownMenu
              open={statusDropdownOpen}
              onOpenChange={setStatusDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    {filters.statuses.length === 0
                      ? t("filters.allStatuses")
                      : filters.statuses.length === 1
                      ? t(`recurring.statuses.${filters.statuses[0]}`)
                      : t("recurringFilters.statusesSelected", {
                          count: filters.statuses.length,
                        })}
                  </span>
                  <ListFilter className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                align="start"
                onClick={stopPropagation}
              >
                <DropdownMenuLabel>{t("recurring.status")}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {["active", "paused", "completed", "cancelled"].map(
                  (status) => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={filters.statuses.includes(status)}
                      onCheckedChange={(checked) => {
                        const newSelection = checked
                          ? [...filters.statuses, status]
                          : filters.statuses.filter((s) => s !== status);
                        handleStatusChange(newSelection);
                      }}
                      onClick={stopPropagation}
                    >
                      {t(`recurring.statuses.${status}`)}
                    </DropdownMenuCheckboxItem>
                  )
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex-grow sm:flex-grow-0 sm:w-auto">
            <Label className="mb-2 block text-sm font-medium">
              {t("filters.recurringFrequency")}
            </Label>
            <DropdownMenu
              open={frequencyDropdownOpen}
              onOpenChange={setFrequencyDropdownOpen}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    {localFrequencies.length === 0
                      ? t("filters.allFrequencies")
                      : t("filters.frequenciesSelected", {
                          count: localFrequencies.length,
                        })}
                  </span>
                  <ListFilter className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                align="start"
                onClick={stopPropagation}
              >
                <DropdownMenuLabel>
                  {t("filters.filterByFrequency")}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                {["daily", "weekly", "monthly", "yearly"].map((frequency) => (
                  <DropdownMenuCheckboxItem
                    key={frequency}
                    checked={localFrequencies.includes(frequency)}
                    onCheckedChange={(checked) =>
                      handleFrequencyChange(frequency, !!checked)
                    }
                    onClick={stopPropagation}
                  >
                    {t(`recurring.frequencies.${frequency}`)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex-grow sm:flex-grow-0 sm:w-auto">
            <Label className="mb-2 block text-sm font-medium opacity-0">
              {t("filters.resetFilters")}
            </Label>
            <Button onClick={handleReset} variant="outline" className="w-full">
              {t("filters.resetFilters")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
