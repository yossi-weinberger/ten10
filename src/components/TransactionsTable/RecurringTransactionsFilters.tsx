import React, { useState, useEffect, useMemo } from "react";
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
import { Badge } from "@/components/ui/badge";
import { useRecurringTableStore } from "@/lib/tableTransactions/recurringTable.store";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ListFilter } from "lucide-react";
import { transactionTypes } from "@/types/transaction";
import { useMediaQuery } from "@/hooks/use-media-query";

// Moved to translation files - no longer needed

export function RecurringTransactionsFilters() {
  const { t, i18n } = useTranslation("data-tables");
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [isExpanded, setIsExpanded] = useState(false);
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
      ? Array.from(new Set([...localTypes, type]))
      : localTypes.filter((t) => t !== type);
    setLocalTypes(newTypes);
    setFilters({ types: newTypes });
  };

  const handleFrequencyChange = (frequency: string, checked: boolean) => {
    const newFrequencies = checked
      ? Array.from(new Set([...localFrequencies, frequency]))
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

  const isRtl = i18n.dir(i18n.language) === "rtl";
  const dropdownAlign = isRtl ? "end" : "start";
  const dropdownDir = isRtl ? "rtl" : "ltr";

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (localTypes.length > 0) count++;
    if (filters.statuses.length > 0) count++;
    if (localFrequencies.length > 0) count++;
    return count;
  }, [localTypes, filters.statuses, localFrequencies]);

  if (isMobile && !isExpanded) {
    return (
      <Card className="mb-4">
        <CardContent className="p-3">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                placeholder={t("recurringFilters.searchPlaceholder")}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="h-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setIsExpanded(true)}
              className="h-9 gap-2 shrink-0"
            >
              <ListFilter className="h-4 w-4" />
              {t("filters.showFilters")}
              {activeFiltersCount > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1">
                  {activeFiltersCount}
                </Badge>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader className={isMobile ? "pb-2" : ""}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{t("recurringFilters.title")}</CardTitle>
          {isMobile && (
            <Button
              variant="ghost"
              onClick={() => setIsExpanded(false)}
              className="h-8 text-sm"
            >
              {t("filters.hideFilters")}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className={isMobile ? "p-3 pt-0" : ""}>
        <div className={isMobile ? "grid grid-cols-2 gap-3" : "flex flex-wrap items-end gap-4"}>
          <div className={isMobile ? "col-span-2" : "flex-grow sm:flex-grow-0 sm:w-auto"}>
            <Label className={isMobile ? "mb-1 block text-sm font-medium" : "mb-2 block text-sm font-medium"}>
              {t("filters.freeSearch")}
            </Label>
            <Input
              placeholder={t("recurringFilters.searchPlaceholder")}
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              className={isMobile ? "h-9 w-full" : "w-full"}
            />
          </div>

          <div className={isMobile ? "" : "flex-grow sm:flex-grow-0 sm:w-auto"}>
            <Label className={isMobile ? "mb-1 block text-sm font-medium" : "mb-2 block text-sm font-medium"}>
              {t("filters.transactionTypes")}
            </Label>
            <DropdownMenu
              open={typesDropdownOpen}
              onOpenChange={setTypesDropdownOpen}
              dir={dropdownDir}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={isMobile ? "h-9 w-full justify-between text-sm" : "w-full justify-between"}>
                  <span className="truncate">
                    {localTypes.length === 0
                      ? t("filters.allTypes")
                      : localTypes.length === 1
                      ? t(`types.${localTypes[0]}`)
                      : t("filters.typesSelected", {
                          count: localTypes.length,
                        })}
                  </span>
                  <ListFilter className="ml-2 rtl:ml-0 rtl:mr-2 h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                align={dropdownAlign}
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

          <div className={isMobile ? "" : "flex-grow sm:flex-grow-0 sm:w-auto"}>
            <Label className={isMobile ? "mb-1 block text-sm font-medium" : "mb-2 block text-sm font-medium"}>
              {t("recurringFilters.filterByStatus")}
            </Label>
            <DropdownMenu
              open={statusDropdownOpen}
              onOpenChange={setStatusDropdownOpen}
              dir={dropdownDir}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={isMobile ? "h-9 w-full justify-between text-sm" : "w-full justify-between"}>
                  <span className="truncate">
                    {filters.statuses.length === 0
                      ? t("filters.allStatuses")
                      : filters.statuses.length === 1
                      ? t(`recurring.statuses.${filters.statuses[0]}`)
                      : t("recurringFilters.statusesSelected", {
                          count: filters.statuses.length,
                        })}
                  </span>
                  <ListFilter className="ml-2 rtl:ml-0 rtl:mr-2 h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                align={dropdownAlign}
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
                          ? Array.from(new Set([...filters.statuses, status]))
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

          <div className={isMobile ? "" : "flex-grow sm:flex-grow-0 sm:w-auto"}>
            <Label className={isMobile ? "mb-1 block text-sm font-medium" : "mb-2 block text-sm font-medium"}>
              {t("filters.recurringFrequency")}
            </Label>
            <DropdownMenu
              open={frequencyDropdownOpen}
              onOpenChange={setFrequencyDropdownOpen}
              dir={dropdownDir}
            >
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className={isMobile ? "h-9 w-full justify-between text-sm" : "w-full justify-between"}>
                  <span className="truncate">
                    {localFrequencies.length === 0
                      ? t("filters.allFrequencies")
                      : t("filters.frequenciesSelected", {
                          count: localFrequencies.length,
                        })}
                  </span>
                  <ListFilter className="ml-2 rtl:ml-0 rtl:mr-2 h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56"
                align={dropdownAlign}
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

          <div className={isMobile ? "col-span-2" : "flex-grow sm:flex-grow-0 sm:w-auto"}>
            {!isMobile && (
              <Label className="mb-2 block text-sm font-medium opacity-0">
                {t("filters.resetFilters")}
              </Label>
            )}
            <Button onClick={handleReset} variant="outline" className={isMobile ? "h-9 w-full" : "w-full"}>
              {t("filters.resetFilters")}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
