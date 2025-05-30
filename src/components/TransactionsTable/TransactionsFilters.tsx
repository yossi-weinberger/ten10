import React, { useState, useEffect } from "react";
import { useTableTransactionsStore } from "@/lib/tableTransactions/tableTransactions.store";
import { initialTableTransactionFilters } from "@/lib/tableTransactions/tableTransactions.types";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"; // Import Card components
import { ListFilter } from "lucide-react"; // Icon for dropdown trigger

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
    setLocalTypes(newTypes); // Update local state for immediate UI feedback in dropdown
    setStoreFilters({ types: newTypes }); // Update store, which will trigger fetch
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-4 gap-y-6 items-end">
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

          <div className="flex items-end">
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
