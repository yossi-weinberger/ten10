import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CURRENCIES, CurrencyCode } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { ArrowLeftRight, Plus } from "lucide-react";

interface CurrencyPickerProps {
  value: CurrencyCode;
  onChange: (value: CurrencyCode) => void;
  className?: string;
  /** "compact" shows selected + exchange icon, "expanded" shows 4 common + more button */
  variant?: "compact" | "expanded";
}

export function CurrencyPicker({ value, onChange, className, variant = "compact" }: CurrencyPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedCurrency = CURRENCIES.find((c) => c.code === value);
  const commonCurrencies: CurrencyCode[] = ["ILS", "USD", "EUR", "GBP"];
  const otherCurrencies = CURRENCIES.filter((c) => !commonCurrencies.includes(c.code));

  const handleSelect = (code: CurrencyCode) => {
    onChange(code);
    setIsOpen(false);
  };

  // Compact variant - for transaction form
  if (variant === "compact") {
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {/* Selected currency display */}
        <div className="flex items-center gap-1 px-3 py-2 bg-primary text-primary-foreground rounded-md font-medium text-sm min-w-[70px] justify-center">
          <span>{selectedCurrency?.symbol}</span>
          <span>{value}</span>
        </div>

        {/* Change currency button */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[320px] p-3" align="start">
            <div className="grid grid-cols-3 gap-2">
              {CURRENCIES.map((currency) => (
                <Button
                  key={currency.code}
                  type="button"
                  variant={value === currency.code ? "default" : "ghost"}
                  onClick={() => handleSelect(currency.code)}
                  className="justify-start h-9"
                >
                  <span className="w-5 text-center">{currency.symbol}</span>
                  <span className="text-sm">{currency.code}</span>
                </Button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Expanded variant - for settings page
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {commonCurrencies.map((code) => {
        const currency = CURRENCIES.find((c) => c.code === code);
        if (!currency) return null;
        const isSelected = value === code;
        return (
          <Button
            key={code}
            type="button"
            variant={isSelected ? "default" : "outline"}
            onClick={() => onChange(code)}
            className={cn("min-w-[80px]", isSelected && "font-bold")}
          >
            {currency.symbol} {currency.code}
          </Button>
        );
      })}

      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant={otherCurrencies.some(c => c.code === value) ? "default" : "outline"}
            className="px-3"
          >
            {otherCurrencies.some(c => c.code === value) ? (
              <>
                {CURRENCIES.find(c => c.code === value)?.symbol} {value}
              </>
            ) : (
              <Plus className="h-4 w-4" />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[300px] p-2" align="start">
          <div className="grid grid-cols-3 gap-2">
            {otherCurrencies.map((currency) => (
              <Button
                key={currency.code}
                type="button"
                variant={value === currency.code ? "default" : "ghost"}
                onClick={() => handleSelect(currency.code)}
                className="justify-start"
              >
                <span className="mr-2 w-4 text-center">{currency.symbol}</span>
                {currency.code}
              </Button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
