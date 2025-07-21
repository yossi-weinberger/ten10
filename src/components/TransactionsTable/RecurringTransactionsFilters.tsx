import React, { useState, useEffect } from "react";
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

const statusOptions = Object.entries(recurringStatusLabels).map(
  ([value, label]) => ({ value, label })
);

export function RecurringTransactionsFilters() {
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
        <CardTitle className="text-lg">סינון הוראות קבע</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <Input
            placeholder="חיפוש לפי תיאור..."
            value={localSearch}
            onChange={(e) => setLocalSearch(e.target.value)}
            className="max-w-sm"
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex-1 justify-between">
                <span>
                  {filters.statuses.length === 0
                    ? "סנן לפי סטטוס"
                    : filters.statuses.length === 1
                    ? recurringStatusLabels[
                        filters
                          .statuses[0] as keyof typeof recurringStatusLabels
                      ]
                    : `${filters.statuses.length} סטטוסים נבחרו`}
                </span>
                <ListFilter className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuLabel>סטטוס</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {statusOptions.map((option) => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  checked={filters.statuses.includes(option.value)}
                  onCheckedChange={(checked) => {
                    const newSelection = checked
                      ? [...filters.statuses, option.value]
                      : filters.statuses.filter((s) => s !== option.value);
                    handleStatusChange(newSelection);
                  }}
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={handleReset} variant="outline">
            אפס סינונים
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
