import React, { useEffect, useState } from "react";
import { UseFormReturn } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { TransactionFormValues } from "@/lib/schemas";
import {
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Wifi, WifiOff, PenTool, CheckCircle2, RefreshCw, Globe } from "lucide-react";
import { formatCurrency } from "@/lib/utils/currency";
import { CURRENCIES, CurrencyCode } from "@/lib/currencies";
import { ExchangeRateService } from "@/lib/services/exchange-rate.service";
import { useDonationStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface CurrencyConversionSectionProps {
  form: UseFormReturn<TransactionFormValues>;
  selectedCurrency: string;
  amount?: number;
}

export function CurrencyConversionSection({
  form,
  selectedCurrency,
  amount,
}: CurrencyConversionSectionProps) {
  const { t, i18n } = useTranslation("currency-features");
  const [isOnline, setIsOnline] = useState(true);
  const [autoRate, setAutoRate] = useState<number | null>(null);
  const [loadingRate, setLoadingRate] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const defaultCurrency = useDonationStore((state) => state.settings.defaultCurrency);
  const defaultCurrencySymbol = CURRENCIES.find((c) => c.code === defaultCurrency)?.symbol || defaultCurrency;
  const selectedCurrencySymbol = CURRENCIES.find((c) => c.code === selectedCurrency)?.symbol || selectedCurrency;

  const rateSource = form.watch("rate_source");
  const conversionRate = form.watch("conversion_rate");

  // Check online status
  useEffect(() => {
    ExchangeRateService.isOnline().then(setIsOnline);
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch auto rate
  useEffect(() => {
    // Only fetch if currencies are valid and different
    if (selectedCurrency && defaultCurrency && selectedCurrency !== defaultCurrency) {
      setLoadingRate(true);
      ExchangeRateService.fetchExchangeRate(selectedCurrency as CurrencyCode, defaultCurrency as CurrencyCode)
        .then((rate) => {
          setAutoRate(rate);
          if (rate) {
              setLastUpdated(new Date());
              // Use current value of rateSource from closure, which is fine as this effect runs on currency change
              const currentRateSource = form.getValues("rate_source");
              // If source is auto or not set, use this rate
              if (!currentRateSource || currentRateSource === 'auto') {
                form.setValue('conversion_rate', rate);
                form.setValue('conversion_date', new Date().toISOString().split('T')[0]);
                form.setValue('rate_source', 'auto');
              }
          }
        })
        .finally(() => setLoadingRate(false));
    }
  }, [selectedCurrency, defaultCurrency]); // Removed form and rateSource to prevent loops

  // Handle offline fallback
  useEffect(() => {
    if (!isOnline && rateSource === 'auto' && !autoRate) {
        form.setValue('rate_source', 'manual');
    }
  }, [isOnline, rateSource, autoRate, form]);

  if (!selectedCurrency || selectedCurrency === defaultCurrency) {
    return null;
  }

  const effectiveRate = conversionRate;
  const totalConverted = amount && effectiveRate ? amount * effectiveRate : 0;

  const tabs = [
    { id: "auto", label: t("conversion.rateTypes.auto"), icon: Wifi },
    { id: "manual", label: t("conversion.rateTypes.manual"), icon: PenTool },
  ];

  return (
    <div className="bg-muted/30 rounded-lg p-4 border border-border mt-4 space-y-4">
      {/* Title */}
      <div className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4 text-muted-foreground" />
        <h4 className="font-medium text-sm text-foreground">
          {t("conversion.title", { symbol: defaultCurrencySymbol })}
        </h4>
      </div>

      {/* Tabs */}
      <div className="bg-muted p-1 rounded-lg flex relative">
        <FormField
          control={form.control}
          name="rate_source"
          render={({ field }) => (
            <>
              {tabs.map((tab) => {
                const isActive = field.value === tab.id;
                const isDisabled = tab.id === "auto" && !isOnline && !autoRate;
                
                return (
                  <button
                    key={tab.id}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => {
                        field.onChange(tab.id);
                        if (tab.id === 'auto' && autoRate) {
                            form.setValue('conversion_rate', autoRate);
                            form.setValue('conversion_date', new Date().toISOString().split('T')[0]);
                        }
                    }}
                    className={cn(
                      "flex-1 relative z-10 flex items-center justify-center gap-2 py-1.5 text-sm font-medium transition-colors rounded-md",
                      isDisabled && "opacity-50 cursor-not-allowed",
                      isActive ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <tab.icon className="h-3.5 w-3.5" />
                    {tab.label}
                    {isActive && (
                      <motion.div
                        layoutId="rate-source-bubble"
                        className="absolute inset-0 bg-background shadow-sm rounded-md -z-10"
                        transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                      />
                    )}
                  </button>
                );
              })}
            </>
          )}
        />
      </div>

      {/* Input & Info Container - Fixed Height */}
      <div className="flex flex-col justify-start h-[80px]"> 
        <div className="relative max-w-[240px] mx-auto w-full">
            <FormField
                control={form.control}
                name="conversion_rate"
                render={({ field }) => (
                <FormItem className="space-y-0">
                    <FormControl>
                        <div className="relative">
                            <Label className="absolute -top-2 right-2 bg-background px-1 text-xs text-muted-foreground z-10 rounded">
                                {t("conversion.manualRate.label")}
                            </Label>
                            <div className="relative flex items-center shadow-sm rounded-md">
                                <span className="absolute left-3 text-sm text-muted-foreground font-mono select-none pointer-events-none">
                                    1 {selectedCurrencySymbol} =
                                </span>
                                <Input
                                    type="number"
                                    step="0.0001"
                                    {...field}
                                    value={field.value ?? ""}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        field.onChange(isNaN(val) ? undefined : val);
                                        form.setValue('conversion_date', new Date().toISOString().split('T')[0]);
                                    }}
                                    className={cn(
                                        "pl-14 pr-10 font-mono text-center h-10 text-lg transition-all", 
                                        rateSource === 'auto' 
                                            ? "bg-muted/50 text-muted-foreground border-transparent focus-visible:ring-0 cursor-default"
                                            : "bg-background border-input"
                                    )}
                                    placeholder="0.00"
                                    readOnly={rateSource === 'auto'}
                                />
                                <span className="absolute right-3 text-sm text-muted-foreground font-bold select-none pointer-events-none">
                                    {defaultCurrencySymbol}
                                </span>
                            </div>
                        </div>
                    </FormControl>
                    <FormMessage className="text-center absolute w-full top-11" />
                </FormItem>
                )}
            />
        </div>

        {/* Info / Status Line - Absolute positioning or fixed height container below input */}
        <div className="mt-3 flex justify-center h-5">
            {rateSource === 'auto' && autoRate && (
                <div className="flex justify-center items-center gap-2 text-[10px] sm:text-xs animate-in fade-in slide-in-from-top-1 duration-300">
                    <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-0.5 rounded-full border border-emerald-100 dark:border-emerald-900/50">
                        <Globe className="h-3 w-3" />
                        <span>{t("conversion.autoRate.source")}</span> 
                    </div>
                    {lastUpdated && (
                        <span className="text-muted-foreground whitespace-nowrap">
                            {t("conversion.autoRate.updatedAt")} {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>
            )}
        </div>
      </div>

      <div className="h-px bg-border/50 w-full" />

      {/* Total Calculation */}
      <div className="flex justify-between items-center px-1">
        <span className="text-sm font-medium text-muted-foreground">{t("conversion.total")}:</span>
        <span className={cn(
            "font-bold text-2xl tracking-tight transition-colors",
            totalConverted > 0 ? "text-primary" : "text-muted-foreground/50"
        )}>
          {formatCurrency(totalConverted, defaultCurrency as CurrencyCode, i18n.language)}
        </span>
      </div>
    </div>
  );
}
