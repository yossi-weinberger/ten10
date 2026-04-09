/**
 * CategoryCombobox Component
 *
 * A combobox for selecting transaction categories with:
 * - Predefined categories stored as stable keys (e.g. "food", "salary")
 *   and displayed as localized labels at render time.
 * - User's previously used categories (fetched lazily on open).
 * - Ability to create new categories by typing (stored as raw free text).
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
import { normalizeToBaseType } from "@/lib/data-layer/transactionForm.service";
import {
  CATEGORY_KEYS_BY_TYPE,
  formatCategory,
  normalizeCategoryValue,
} from "@/lib/category-registry";

interface CategoryComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  transactionType: TransactionType;
  placeholder?: string;
  disabled?: boolean;
}

type CategoryOption = {
  value: string;
  label: string;
};

// Donation types intentionally excluded: donations use the recipient field
// instead of category in the transaction form.
const CATEGORY_BASE_TYPES = ["income", "expense"] as const;

export function CategoryCombobox({
  value,
  onChange,
  transactionType,
  placeholder,
  disabled = false,
}: CategoryComboboxProps) {
  const { t, i18n } = useTranslation("transactions");
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [userCategories, setUserCategories] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadedCacheVersion, setLoadedCacheVersion] = React.useState<number | null>(null);

  const baseType = React.useMemo(
    () => normalizeToBaseType(transactionType),
    [transactionType]
  );

  const validBaseType: "income" | "expense" | null =
    CATEGORY_BASE_TYPES.includes(baseType as typeof CATEGORY_BASE_TYPES[number])
      ? (baseType as "income" | "expense")
      : null;

  // Build predefined options from stable keys. Labels are resolved from i18n
  // so they switch automatically when the app language changes.
  const predefinedOptions = React.useMemo<CategoryOption[]>(() => {
    if (!validBaseType) return [];
    const keys = CATEGORY_KEYS_BY_TYPE[validBaseType] as readonly string[];
    return keys.map((key) => ({
      value: key,
      label: formatCategory(validBaseType, key, i18n.language),
    }));
  }, [validBaseType, i18n.language]);

  const handleOpenChange = React.useCallback(
    async (newOpen: boolean) => {
      setOpen(newOpen);
      if (newOpen) {
        const currentCacheVersion = getCategoryCacheVersion();
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

  React.useEffect(() => {
    setLoadedCacheVersion(null);
    setUserCategories([]);
  }, [transactionType]);

  // Merge predefined options with user-created categories.
  // User categories are normalized so that predefined labels saved in old
  // localized form ("מזון", "Food") collapse into the same key.
  const allOptions = React.useMemo<CategoryOption[]>(() => {
    const predefinedKeys = new Set(predefinedOptions.map((o) => o.value));

    const userOptions: CategoryOption[] = userCategories
      .map((raw) => {
        const normalized = normalizeCategoryValue(raw) ?? raw;
        if (predefinedKeys.has(normalized)) return null; // already shown above
        return {
          value: normalized,
          label: validBaseType
            ? formatCategory(validBaseType, normalized, i18n.language)
            : normalized,
        };
      })
      .filter((o): o is CategoryOption => o !== null);

    // Dedupe user options by value
    const seen = new Set<string>();
    const uniqueUserOptions = userOptions.filter((o) => {
      if (seen.has(o.value)) return false;
      seen.add(o.value);
      return true;
    });

    const combinedUserOptions = uniqueUserOptions.sort((a, b) =>
      a.label.localeCompare(b.label, i18n.language)
    );

    return [...predefinedOptions, ...combinedUserOptions];
  }, [predefinedOptions, userCategories, validBaseType, i18n.language]);

  // For the search filter we compare against localized labels so the user
  // can type "food" or "מזון" and find the same entry.
  const isNewCategory =
    searchValue.trim() !== "" &&
    !allOptions.some(
      (opt) =>
        opt.label.toLowerCase() === searchValue.trim().toLowerCase() ||
        opt.value.toLowerCase() === searchValue.trim().toLowerCase()
    );

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue === value ? null : selectedValue);
    setOpen(false);
    setSearchValue("");
  };

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

  // Resolve the stored value to its localized label for display in the trigger.
  const displayValue = value
    ? formatCategory(validBaseType ?? undefined, value, i18n.language)
    : displayPlaceholder;

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full h-10 px-3 justify-between text-start font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <span className="truncate">{displayValue}</span>
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
                  {allOptions.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={`${option.label} ${option.value}`}
                      onSelect={() => handleSelect(option.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2",
                          value === option.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {option.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {isNewCategory && allOptions.length > 0 && (
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
