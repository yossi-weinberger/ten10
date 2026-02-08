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
import {
  getUserPaymentMethods,
  getPaymentMethodCacheVersion,
} from "@/lib/data-layer";

interface PaymentMethodComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

export const PAYMENT_METHOD_KEYS = [
  "cash",
  "credit_card",
  "debit_card",
  "bank_transfer",
  "check",
  "bit_paybox",
  "paypal",
  "other",
] as const;

export const PAYMENT_METHOD_PRIORITY = [
  "credit_card",
  "cash",
  "bank_transfer",
  "debit_card",
  "check",
  "bit_paybox",
  "paypal",
  "other",
] as const;

type PaymentMethodKey = (typeof PAYMENT_METHOD_KEYS)[number];

type PaymentMethodOption = {
  value: string;
  label: string;
};

export function PaymentMethodCombobox({
  value,
  onChange,
  placeholder,
  disabled = false,
}: PaymentMethodComboboxProps) {
  const { t, i18n } = useTranslation("transactions");
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState("");
  const [userMethods, setUserMethods] = React.useState<string[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [loadedCacheVersion, setLoadedCacheVersion] = React.useState<
    number | null
  >(null);

  const getLabelForKey = React.useCallback(
    (key: PaymentMethodKey) =>
      t(`transactionForm.paymentMethod.options.${key}`, key),
    [t]
  );

  const getPredefinedMethods = React.useCallback((): PaymentMethodOption[] => {
    return PAYMENT_METHOD_PRIORITY.map((key) => ({
      value: key,
      label: getLabelForKey(key),
    }));
  }, [getLabelForKey]);

  const handleOpenChange = React.useCallback(
    async (newOpen: boolean) => {
      setOpen(newOpen);

      if (newOpen) {
        const currentCacheVersion = getPaymentMethodCacheVersion();
        if (
          loadedCacheVersion === null ||
          loadedCacheVersion !== currentCacheVersion
        ) {
          setIsLoading(true);
          try {
            const methods = await getUserPaymentMethods();
            setUserMethods(methods);
            setLoadedCacheVersion(currentCacheVersion);
          } catch (error) {
            console.error("Failed to fetch payment methods:", error);
          } finally {
            setIsLoading(false);
          }
        }
      }
    },
    [loadedCacheVersion]
  );

  React.useEffect(() => {
    setLoadedCacheVersion(null);
    setUserMethods([]);
  }, []);

  const allMethods = React.useMemo<PaymentMethodOption[]>(() => {
    const predefined = getPredefinedMethods();
    const userOptions = userMethods.map((method) => ({
      value: method,
      label: PAYMENT_METHOD_KEYS.includes(method as PaymentMethodKey)
        ? getLabelForKey(method as PaymentMethodKey)
        : method,
    }));

    const dedupedMap = new Map<string, PaymentMethodOption>();
    const sortedUserOptions = [...userOptions].sort((a, b) =>
      a.label.localeCompare(b.label, i18n.language)
    );

    predefined.forEach((item) => {
      const key = item.value.toLowerCase();
      if (!dedupedMap.has(key)) {
        dedupedMap.set(key, item);
      }
    });

    sortedUserOptions.forEach((item) => {
      const key = item.value.toLowerCase();
      if (!dedupedMap.has(key)) {
        dedupedMap.set(key, item);
      }
    });

    return Array.from(dedupedMap.values());
  }, [getPredefinedMethods, userMethods, i18n.language]);

  const isNewValue =
    searchValue.trim() !== "" &&
    !allMethods.some(
      (method) =>
        method.label.toLowerCase() === searchValue.trim().toLowerCase() ||
        method.value.toLowerCase() === searchValue.trim().toLowerCase()
    );

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue === value ? null : selectedValue);
    setOpen(false);
    setSearchValue("");
  };

  const handleCreateNew = () => {
    const newMethod = searchValue.trim();
    if (newMethod) {
      onChange(newMethod);
      setOpen(false);
      setSearchValue("");
    }
  };

  const displayPlaceholder =
    placeholder || t("transactionForm.paymentMethod.placeholder");

  const displayValue = value
    ? PAYMENT_METHOD_KEYS.includes(value as PaymentMethodKey)
      ? getLabelForKey(value as PaymentMethodKey)
      : value
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
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={true}>
          <CommandInput
            placeholder={t(
              "transactionForm.paymentMethod.searchPlaceholder",
              "חפש או הקלד אמצעי תשלום..."
            )}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {isLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 rtl:ml-0 rtl:mr-2 text-sm text-muted-foreground">
                  {t("transactionForm.paymentMethod.loading", "טוען...")}
                </span>
              </div>
            ) : (
              <>
                <CommandEmpty>
                  {isNewValue ? (
                    <button
                      onClick={handleCreateNew}
                      className="flex w-full items-center justify-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-pointer"
                    >
                      <Plus className="h-4 w-4" />
                      <span>
                        {t(
                          "transactionForm.paymentMethod.createNew",
                          "צור אפשרות חדשה"
                        )}
                        : <strong>"{searchValue.trim()}"</strong>
                      </span>
                    </button>
                  ) : (
                    t(
                      "transactionForm.paymentMethod.noResults",
                      "לא נמצאו אפשרויות"
                    )
                  )}
                </CommandEmpty>
                <CommandGroup>
                  {allMethods.map((method) => (
                    <CommandItem
                      key={method.value}
                      value={method.label}
                      onSelect={() => handleSelect(method.value)}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2",
                          value === method.value ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {method.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
                {isNewValue && allMethods.length > 0 && (
                  <>
                    <CommandSeparator />
                    <CommandGroup>
                      <CommandItem onSelect={handleCreateNew}>
                        <Plus className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2" />
                        {t(
                          "transactionForm.paymentMethod.createNew",
                          "צור אפשרות חדשה"
                        )}
                        :{" "}
                        <strong className="ml-1 rtl:ml-0 rtl:mr-1">
                          "{searchValue.trim()}"
                        </strong>
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
