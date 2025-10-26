import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useShallow } from "zustand/react/shallow";
import { useTableTransactionsStore } from "@/lib/tableTransactions/tableTransactions.store";
import {
  initialTableTransactionFilters,
  IsRecurringFilter,
} from "@/lib/tableTransactions/tableTransactions.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { TransactionType } from "@/types/transaction";
import { usePlatform } from "@/contexts/PlatformContext";
import type { DateRange } from "react-day-picker";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ListFilter } from "lucide-react";

const availableTransactionTypes: TransactionType[] = [
  "income",
  "donation",
  "expense",
  "exempt-income",
  "recognized-expense",
  "non_tithe_donation",
];

// Moved to translation files - will use t() function

export function TransactionsFilters() {
  const { t } = useTranslation("data-tables");
  const { platform } = usePlatform();
  const {
    storeFilters,
    setStoreFilters,
    resetStoreFiltersState,
    fetchTransactions,
  } = useTableTransactionsStore(
    useShallow((state) => ({
      storeFilters: state.filters,
      setStoreFilters: state.setFilters,
      resetStoreFiltersState: state.resetFiltersState,
      fetchTransactions: state.fetchTransactions,
    }))
  );

  const [localSearch, setLocalSearch] = useState(storeFilters.search);
  const [localDateRange, setLocalDateRange] = useState<DateRange | undefined>(
    storeFilters.dateRange.from || storeFilters.dateRange.to
      ? {
          from: storeFilters.dateRange.from
            ? new Date(storeFilters.dateRange.from)
            : undefined,
          to: storeFilters.dateRange.to
            ? new Date(storeFilters.dateRange.to)
            : undefined,
        }
      : undefined
  );
  const [localTypes, setLocalTypes] = useState<string[]>(storeFilters.types);
  const [localIsRecurring, setLocalIsRecurring] = useState<IsRecurringFilter>(
    storeFilters.isRecurring
  );
  const [localRecurringStatuses, setLocalRecurringStatuses] = useState<
    string[]
  >(storeFilters.recurringStatuses);
  // Commented out - frequency filter disabled until multiple frequencies are supported
  // const [localRecurringFrequencies, setLocalRecurringFrequencies] = useState<
  //   string[]
  // >(storeFilters.recurringFrequencies);

  // Added state for dropdown visibility
  const [typesDropdownOpen, setTypesDropdownOpen] = useState(false);
  const [statusDropdownOpen, setStatusDropdownOpen] = useState(false);
  // const [frequencyDropdownOpen, setFrequencyDropdownOpen] = useState(false); // Commented out - frequency filter disabled

  useEffect(() => {
    const handler = setTimeout(() => {
      if (localSearch !== storeFilters.search) {
        setStoreFilters({ search: localSearch });
      }
    }, 500);
    return () => clearTimeout(handler);
  }, [localSearch, storeFilters.search, setStoreFilters]);

  const handleDateChange = (selectedDateRange: DateRange | undefined) => {
    setLocalDateRange(selectedDateRange);
    setStoreFilters({
      dateRange: {
        from: selectedDateRange?.from
          ? selectedDateRange.from.toISOString().split("T")[0]
          : null,
        to: selectedDateRange?.to
          ? selectedDateRange.to.toISOString().split("T")[0]
          : null,
      },
    });
  };

  const handleTypeChange = (type: TransactionType, checked: boolean) => {
    const newTypes = checked
      ? [...localTypes, type]
      : localTypes.filter((t) => t !== type);
    setLocalTypes(newTypes);
    setStoreFilters({ types: newTypes });
  };

  const handleIsRecurringChange = (value: IsRecurringFilter) => {
    setLocalIsRecurring(value);
    const newFilters: Partial<typeof storeFilters> = { isRecurring: value };
    // If not filtering by recurring, clear the status/frequency filters
    if (value !== "recurring") {
      setLocalRecurringStatuses([]);
      // setLocalRecurringFrequencies([]); // Commented out - frequency filter disabled
      newFilters.recurringStatuses = [];
      newFilters.recurringFrequencies = [];
    }
    setStoreFilters(newFilters);
  };

  const handleRecurringStatusChange = (status: string, checked: boolean) => {
    const newStatuses = checked
      ? [...localRecurringStatuses, status]
      : localRecurringStatuses.filter((s) => s !== status);
    setLocalRecurringStatuses(newStatuses);
    setStoreFilters({ recurringStatuses: newStatuses });
  };

  // Commented out - frequency filter disabled until multiple frequencies are supported
  // const handleRecurringFrequencyChange = (
  //   frequency: string,
  //   checked: boolean
  // ) => {
  //   const newFrequencies = checked
  //     ? [...localRecurringFrequencies, frequency]
  //     : localRecurringFrequencies.filter((f) => f !== frequency);
  //   setLocalRecurringFrequencies(newFrequencies);
  //   setStoreFilters({ recurringFrequencies: newFrequencies });
  // };

  const handleResetFilters = () => {
    setLocalSearch(initialTableTransactionFilters.search);
    setLocalDateRange(
      initialTableTransactionFilters.dateRange.from ||
        initialTableTransactionFilters.dateRange.to
        ? {
            from: initialTableTransactionFilters.dateRange.from
              ? new Date(initialTableTransactionFilters.dateRange.from)
              : undefined,
            to: initialTableTransactionFilters.dateRange.to
              ? new Date(initialTableTransactionFilters.dateRange.to)
              : undefined,
          }
        : undefined
    );
    setLocalTypes(initialTableTransactionFilters.types);
    setLocalIsRecurring(initialTableTransactionFilters.isRecurring);
    setLocalRecurringStatuses(initialTableTransactionFilters.recurringStatuses);
    // setLocalRecurringFrequencies( // Commented out - frequency filter disabled
    //   initialTableTransactionFilters.recurringFrequencies
    // );
    resetStoreFiltersState();
    if (platform !== "loading") {
      fetchTransactions(true, platform);
    }
  };

  useEffect(() => {
    if (platform !== "loading") {
      fetchTransactions(true, platform);
    }
  }, [storeFilters, platform, fetchTransactions]); // Re-fetch when storeFilters or platform changes

  const stopPropagation = (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
  };

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex flex-wrap items-end gap-4">
          {/* Main Filters Group */}
          <div className="flex flex-wrap items-end gap-4 flex-1 min-w-full sm:min-w-0">
            {/* Free Search */}
            <div className="flex-grow sm:flex-grow-0 sm:w-auto">
              <Label
                htmlFor="search"
                className="mb-2 block text-sm font-medium"
              >
                {t("filters.freeSearch")}
              </Label>
              <Input
                id="search"
                placeholder={t("filters.searchPlaceholder")}
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Date Range */}
            <div className="flex-grow sm:flex-grow-0 sm:w-auto">
              <Label className="mb-2 block text-sm font-medium">
                {t("filters.dateRange")}
              </Label>
              <DatePickerWithRange
                date={localDateRange}
                onDateChange={handleDateChange}
              />
            </div>

            {/* Transaction Types */}
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
                  {availableTransactionTypes.map((type) => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={localTypes.includes(type)}
                      onCheckedChange={(checked) =>
                        handleTypeChange(type, !!checked)
                      }
                      onClick={stopPropagation} // Prevent closing
                    >
                      {t(`types.${type}`)}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Recurring Filter */}
            <div className="flex-grow sm:flex-grow-0 sm:w-auto">
              <Label className="mb-2 block text-sm font-medium">
                {t("filters.recurringTransactions")}
              </Label>
              <Select
                value={localIsRecurring}
                onValueChange={handleIsRecurringChange}
                dir="rtl"
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={t("filters.filterRecurringPlaceholder")}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("filters.all")}</SelectItem>
                  <SelectItem value="recurring">
                    {t("filters.recurringOnly")}
                  </SelectItem>
                  <SelectItem value="regular">
                    {t("filters.regularOnly")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Conditional Recurring Filters & Reset Button Group */}
          <div className="flex flex-wrap items-end gap-4 w-full sm:w-auto">
            {localIsRecurring === "recurring" && (
              <>
                {/* Recurring Status */}
                <div className="flex-grow sm:flex-grow-0 sm:w-auto">
                  <Label className="mb-2 block text-sm font-medium">
                    {t("filters.recurringStatus")}
                  </Label>
                  <DropdownMenu
                    open={statusDropdownOpen}
                    onOpenChange={setStatusDropdownOpen}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        disabled={localIsRecurring !== "recurring"}
                      >
                        <span>
                          {localRecurringStatuses.length === 0
                            ? t("filters.allStatuses")
                            : t("filters.statusesSelected", {
                                count: localRecurringStatuses.length,
                              })}
                        </span>
                        <ListFilter className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56"
                      onClick={stopPropagation}
                    >
                      <DropdownMenuLabel>
                        {t("filters.filterByStatus")}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {["active", "paused", "completed", "cancelled"].map(
                        (value) => (
                          <DropdownMenuCheckboxItem
                            key={value}
                            checked={localRecurringStatuses.includes(value)}
                            onCheckedChange={(checked) =>
                              handleRecurringStatusChange(value, !!checked)
                            }
                            onClick={stopPropagation} // Prevent closing
                          >
                            {t(`recurring.statuses.${value}`)}
                          </DropdownMenuCheckboxItem>
                        )
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Recurring Frequency - commented out until multiple frequencies are supported */}
                {/* 
                <div className="flex-grow sm:flex-grow-0 sm:w-auto">
                  <Label className="mb-2 block text-sm font-medium">
                    {t("filters.recurringFrequency")}
                  </Label>
                  <DropdownMenu
                    open={frequencyDropdownOpen}
                    onOpenChange={setFrequencyDropdownOpen}
                  >
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between"
                        disabled={localIsRecurring !== "recurring"}
                      >
                        <span>
                          {localRecurringFrequencies.length === 0
                            ? t("filters.allFrequencies")
                            : t("filters.frequenciesSelected", {
                                count: localRecurringFrequencies.length,
                              })}
                        </span>
                        <ListFilter className="ml-2 h-4 w-4 opacity-50" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-56"
                      onClick={stopPropagation}
                    >
                      <DropdownMenuLabel>
                        {t("filters.filterByFrequency")}
                      </DropdownMenuLabel>
                      <DropdownMenuSeparator />
                      {["daily", "weekly", "monthly", "yearly"].map((value) => (
                        <DropdownMenuCheckboxItem
                          key={value}
                          checked={localRecurringFrequencies.includes(value)}
                          onCheckedChange={(checked) =>
                            handleRecurringFrequencyChange(value, !!checked)
                          }
                          onClick={stopPropagation} // Prevent closing
                        >
                          {t(`recurring.frequencies.${value}`)}
                        </DropdownMenuCheckboxItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                */}
              </>
            )}

            {/* Reset Button */}
            <div className="flex-grow sm:flex-grow-0 sm:w-auto">
              <Button
                onClick={handleResetFilters}
                variant="outline"
                className="w-full"
              >
                {t("filters.resetFilters")}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
