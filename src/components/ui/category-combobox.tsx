/**
 * CategoryCombobox Component
 *
 * A combobox for selecting transaction categories with:
 * - Predefined categories based on transaction type (from translations)
 * - User's previously used categories (fetched lazily on open)
 * - Ability to create new categories by typing
 */

import * as React from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TransactionType } from "@/types/transaction";
import { getUserCategories, getCategoryCacheVersion } from "@/lib/data-layer";

interface CategoryComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  transactionType: TransactionType;
  placeholder?: string;
  disabled?: boolean;
}

// Map transaction types to their category keys in translations
const typeToTranslationKey: Record<string, string> = {
  income: "income",
  "exempt-income": "income",
  expense: "expense",
  "recognized-expense": "expense",
  donation: "donation",
  non_tithe_donation: "donation",
};

export function CategoryCombobox({
  value,
  onChange,
  transactionType,
  placeholder,
  disabled = false,
}: CategoryComboboxProps) {
  const { t } = useTranslation("transactions");
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [userCategories, setUserCategories] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  // Track which cache version we last loaded - allows detecting when cache was invalidated
  const [loadedCacheVersion, setLoadedCacheVersion] = React.useState<number | null>(null);

  // Get predefined categories from translations
  const getPredefinedCategories = React.useCallback((): string[] => {
    const translationKey = typeToTranslationKey[transactionType];
    if (!translationKey) return [];

    const categoryKeys = [
      "salary",
      "business",
      "freelance",
      "investment",
      "allowance",
      "gift",
      "food",
      "transportation",
      "housing",
      "utilities",
      "healthcare",
      "education",
      "leisure",
      "shopping",
      "charity",
      "religious",
      "health",
      "community",
      "other",
    ];

    const categories: string[] = [];
    for (const key of categoryKeys) {
      const translated = t(
        `transactionForm.category.${translationKey}.${key}`,
        ""
      );
      if (translated) {
        categories.push(translated);
      }
    }
    return categories;
  }, [transactionType, t]);

  // Fetch user categories when combobox opens
  const handleOpenChange = React.useCallback(
    async (newOpen: boolean) => {
      setOpen(newOpen);

      if (newOpen) {
        const currentCacheVersion = getCategoryCacheVersion();
        // Refetch if we haven't loaded yet, or if the cache was invalidated
        if (loadedCacheVersion === null || loadedCacheVersion !== currentCacheVersion) {
          setIsLoading(true);
          try {
            const categories = await getUserCategories(transactionType);
            setUserCategories(categories);
            setLoadedCacheVersion(currentCacheVersion);
          } catch (error) {
            console.error("Failed to fetch user categories:", error);
          } finally {
            setIsLoading(false);
          }
        }
      }
    },
    [loadedCacheVersion, transactionType]
  );

  // Reset loaded state when transaction type changes
  React.useEffect(() => {
    setLoadedCacheVersion(null);
    setUserCategories([]);
  }, [transactionType]);

  // Combine and deduplicate categories
  const allCategories = React.useMemo(() => {
    const predefined = getPredefinedCategories();
    const combined = [...new Set([...predefined, ...userCategories])];
    return combined.sort((a, b) => a.localeCompare(b, "he"));
  }, [getPredefinedCategories, userCategories]);

  // Check if search value is a new category (not in the list)
  const isNewCategory =
    searchValue.trim() !== "" &&
    !allCategories.some(
      (cat) => cat.toLowerCase() === searchValue.trim().toLowerCase()
    );

  // Handle category selection
  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue === value ? null : selectedValue);
    setOpen(false);
    setSearchValue("");
  };

  // Handle creating a new category
  const handleCreateNew = () => {
    const newCategory = searchValue.trim();
    if (newCategory) {
      onChange(newCategory);
      setOpen(false);
      setSearchValue("");
    }
  };

  const displayPlaceholder =
    placeholder || t("transactionForm.category.placeholder");

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between text-start font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">{value || displayPlaceholder}</span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50 rtl:ml-0 rtl:mr-2" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command shouldFilter={true}>
          <CommandInput
            placeholder={t("transactionForm.category.searchPlaceholder", "חפש או הקלד קטגוריה...")}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 rtl:ml-0 rtl:mr-2 text-sm text-muted-foreground">
                  {t("transactionForm.category.loading", "טוען...")}
                </span>
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {isNewCategory ? (
                    <button
                      onClick={handleCreateNew}
                      className="flex w-full items-center justify-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>
                        {t("transactionForm.category.createNew", "צור קטגוריה חדשה")}:{" "}
                        <strong>"{searchValue.trim()}"</strong>
                      </span>
                    </button>
                  ) : (
                    t("transactionForm.category.noResults", "לא נמצאו קטגוריות")
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {allCategories.map((category) => (
                    <CommandItem
                      key={category}
                      value={category}
                      onSelect={() => handleSelect(category)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2",
                          value === category ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {category}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {isNewCategory && allCategories.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem onSelect={handleCreateNew}>
                        <Plus className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2" />
                        {t("transactionForm.category.createNew", "צור קטגוריה חדשה")}:{" "}
                        <strong className="ml-1 rtl:ml-0 rtl:mr-1">"{searchValue.trim()}"</strong>
                      </CommandItem>
                    </CommandGroup>
                  </>
                )}
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
