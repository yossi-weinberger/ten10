import React, { useState, useEffect } from "react";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListFilter } from "lucide-react";

const availableTransactionTypes: TransactionType[] = [
  "income",
  "donation",
  "expense",
  "exempt-income",
  "recognized-expense",
  "non_tithe_donation",
];

// TODO: Provide translations for types
const transactionTypeTranslations: Record<TransactionType, string> = {
  income: "הכנסה",
  donation: "תרומה",
  expense: "הוצאה",
  "exempt-income": "הכנסה פטורה",
  "recognized-expense": "הוצאה מוכרת",
  non_tithe_donation: "תרומה אישית (לא ממעשר)",
};

const recurringStatusOptions = {
  active: "פעיל",
  paused: "מושהה",
  completed: "הושלם",
  cancelled: "בוטל",
};

const recurringFrequencyOptions = {
  daily: "יומי",
  weekly: "שבועי",
  monthly: "חודשי",
  yearly: "שנתי",
};

export function TransactionsFilters() {
  const { platform } = usePlatform();
  const storeFilters = useTableTransactionsStore((state) => state.filters);
  const setStoreFilters = useTableTransactionsStore(
    (state) => state.setFilters
  );
  const resetStoreFiltersState = useTableTransactionsStore(
    (state) => state.resetFiltersState
  );
  const fetchTransactions = useTableTransactionsStore(
    (state) => state.fetchTransactions
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
  const [localRecurringFrequencies, setLocalRecurringFrequencies] = useState<
    string[]
  >(storeFilters.recurringFrequencies);

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
      setLocalRecurringFrequencies([]);
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

  const handleRecurringFrequencyChange = (
    frequency: string,
    checked: boolean
  ) => {
    const newFrequencies = checked
      ? [...localRecurringFrequencies, frequency]
      : localRecurringFrequencies.filter((f) => f !== frequency);
    setLocalRecurringFrequencies(newFrequencies);
    setStoreFilters({ recurringFrequencies: newFrequencies });
  };

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
    setLocalRecurringFrequencies(
      initialTableTransactionFilters.recurringFrequencies
    );
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

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="text-lg">סינון תנועות</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6 items-end">
          <div>
            <Label htmlFor="search" className="mb-1 block">
              חיפוש חופשי
            </Label>
            <Input
              id="search"
              placeholder="תיאור, קטגוריה, נמען..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
            />
          </div>

          <div>
            <Label className="mb-1 block">טווח תאריכים</Label>
            <DatePickerWithRange
              date={localDateRange}
              onDateChange={handleDateChange}
            />
          </div>

          <div>
            <Label className="mb-1 block">סוגי תנועות</Label>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between">
                  <span>
                    {localTypes.length === 0
                      ? "כל הסוגים"
                      : localTypes.length === 1
                      ? transactionTypeTranslations[
                          localTypes[0] as TransactionType
                        ]
                      : `${localTypes.length} סוגים נבחרו`}
                  </span>
                  <ListFilter className="ml-2 h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="start">
                <DropdownMenuLabel>בחר סוגי תנועות</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableTransactionTypes.map((type) => (
                  <DropdownMenuCheckboxItem
                    key={type}
                    checked={localTypes.includes(type)}
                    onCheckedChange={(checked) =>
                      handleTypeChange(type, !!checked)
                    }
                  >
                    {transactionTypeTranslations[type]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div>
            <Label className="mb-1 block">הוראות קבע</Label>
            <Select
              value={localIsRecurring}
              onValueChange={handleIsRecurringChange}
              dir="rtl"
            >
              <SelectTrigger>
                <SelectValue placeholder="סנן הוראות קבע..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">הכל</SelectItem>
                <SelectItem value="recurring">הוראות קבע בלבד</SelectItem>
                <SelectItem value="regular">תנועות רגילות בלבד</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-x-2">
            <div>
              <Label className="mb-1 block">סטטוס קבע</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    disabled={localIsRecurring !== "recurring"}
                  >
                    <span>
                      {localRecurringStatuses.length === 0
                        ? "כל הסטטוסים"
                        : `${localRecurringStatuses.length} נבחרו`}
                    </span>
                    <ListFilter className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>סינון לפי סטטוס</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.entries(recurringStatusOptions).map(
                    ([value, label]) => (
                      <DropdownMenuCheckboxItem
                        key={value}
                        checked={localRecurringStatuses.includes(value)}
                        onCheckedChange={(checked) =>
                          handleRecurringStatusChange(value, !!checked)
                        }
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div>
              <Label className="mb-1 block">תדירות קבע</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    disabled={localIsRecurring !== "recurring"}
                  >
                    <span>
                      {localRecurringFrequencies.length === 0
                        ? "כל התדירויות"
                        : `${localRecurringFrequencies.length} נבחרו`}
                    </span>
                    <ListFilter className="ml-2 h-4 w-4 opacity-50" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56">
                  <DropdownMenuLabel>סינון לפי תדירות</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {Object.entries(recurringFrequencyOptions).map(
                    ([value, label]) => (
                      <DropdownMenuCheckboxItem
                        key={value}
                        checked={localRecurringFrequencies.includes(value)}
                        onCheckedChange={(checked) =>
                          handleRecurringFrequencyChange(value, !!checked)
                        }
                      >
                        {label}
                      </DropdownMenuCheckboxItem>
                    )
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="col-start-1 lg:col-start-auto xl:col-start-5 flex items-end">
            <Button
              onClick={handleResetFilters}
              variant="outline"
              className="w-full"
            >
              אפס סינונים
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
