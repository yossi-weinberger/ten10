import React from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CURRENCIES, CurrencyCode } from "@/lib/currencies";
import { cn } from "@/lib/utils";
import { MoreHorizontal } from "lucide-react";

interface CurrencyPickerProps {
  value: CurrencyCode;
  onChange: (value: CurrencyCode) => void;
  className?: string;
}

export function CurrencyPicker({ value, onChange, className }: CurrencyPickerProps) {
  const commonCurrencies: CurrencyCode[] = ["ILS", "USD", "EUR"];
  const otherCurrencies = CURRENCIES.filter((c) => !commonCurrencies.includes(c.code));

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

      <Popover>
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
                <MoreHorizontal className="h-4 w-4" />
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
                onClick={() => onChange(currency.code)}
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
