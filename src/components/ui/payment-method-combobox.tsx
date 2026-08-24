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
import {
  getPaymentMethodAliases,
  mergePaymentMethodOptions,
  normalizePaymentMethodValue,
  PAYMENT_METHOD_PRIORITY,
  type PaymentMethodKey,
  type PaymentMethodOption,
  isPredefinedPaymentMethod,
} from "@/lib/payment-methods";

interface PaymentMethodComboboxProps {
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

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
      keywords: getPaymentMethodAliases(key),
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
    return mergePaymentMethodOptions(
      getPredefinedMethods(),
      userMethods,
      i18n.language
    );
  }, [getPredefinedMethods, userMethods, i18n.language]);

  const normalizedSearchValue = normalizePaymentMethodValue(searchValue);
  const isNewValue =
    normalizedSearchValue !== null &&
    !allMethods.some((method) => method.value === normalizedSearchValue);

  const handleSelect = (selectedValue: string) => {
    onChange(
      selectedValue === normalizePaymentMethodValue(value)
        ? null
        : selectedValue
    );
    setOpen(false);
    setSearchValue("");
  };

  const handleCreateNew = () => {
    const newMethod = normalizePaymentMethodValue(searchValue);
    if (newMethod) {
      onChange(newMethod);
      setOpen(false);
      setSearchValue("");
    }
  };

  const displayPlaceholder =
    placeholder || t("transactionForm.paymentMethod.placeholder");

  const normalizedValue = normalizePaymentMethodValue(value);
  const displayValue = normalizedValue
    ? isPredefinedPaymentMethod(normalizedValue)
      ? getLabelForKey(normalizedValue)
      : normalizedValue
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
            placeholder={t("transactionForm.paymentMethod.searchPlaceholder")}
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            {/* Predefined methods are available synchronously, so render the list
                immediately. Only the user's saved methods need the async fetch;
                surface that with an unobtrusive inline row rather than replacing
                the whole list with a spinner (which made the control feel
                unresponsive on open). */}
            <CommandEmpty>
              {isNewValue ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.preventDefault();
                    handleCreateNew();
                  }}
                  className="flex w-full items-center justify-center gap-2 px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>
                    {t("transactionForm.paymentMethod.createNew")}
                    : <strong>"{searchValue.trim()}"</strong>
                  </span>
                </button>
              ) : (
                t("transactionForm.paymentMethod.noResults")
              )}
            </CommandEmpty>
            <CommandGroup>
              {allMethods.map((method) => (
                <CommandItem
                  key={method.value}
                  value={method.value}
                  keywords={method.keywords}
                  onSelect={() => handleSelect(method.value)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2",
                      normalizedValue === method.value
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {method.label}
                </CommandItem>
              ))}
            </CommandGroup>
            {isLoading && (
              <div className="flex items-center justify-center py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="ml-2 rtl:ml-0 rtl:mr-2 text-sm text-muted-foreground">
                  {t("transactionForm.paymentMethod.loading")}
                </span>
              </div>
            )}
            {isNewValue && allMethods.length > 0 && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem onSelect={handleCreateNew}>
                    <Plus className="mr-2 h-4 w-4 rtl:mr-0 rtl:ml-2" />
                    {t("transactionForm.paymentMethod.createNew")}
                    :{" "}
                    <strong className="ml-1 rtl:ml-0 rtl:mr-1">
                      "{searchValue.trim()}"
                    </strong>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
