import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { formatCurrency } from "@/lib/utils/currency";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { RefreshCw } from "lucide-react";
import { ExchangeRateService } from "@/lib/services/exchange-rate.service";
import { useDonationStore } from "@/lib/store";
import { CurrencyCode } from "@/lib/currencies";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

interface CurrencyConversionInfoProps {
  amount: number;
  currency: string;
  // Optional pre-calculated values (for existing transactions)
  originalAmount?: number | null;
  originalCurrency?: string | null;
  conversionRate?: number | null;
  conversionDate?: string | null;
  rateSource?: string | null;
  // Mode configuration
  mode?: "static" | "live";
}

export function CurrencyConversionInfo({
  amount,
  currency,
  originalAmount,
  originalCurrency,
  conversionRate,
  conversionDate,
  rateSource,
  mode = "static",
}: CurrencyConversionInfoProps) {
  const { i18n } = useTranslation();
  const { t: tCurrency } = useTranslation("currency-features");
  const defaultCurrency = useDonationStore((state) => state.settings.defaultCurrency);

  // If we have stored conversion details (originalAmount & originalCurrency), treat as static.
  // This applies to BOTH manual AND auto rates that were "locked in" at creation time.
  // Live mode is only for legacy recurring transactions that haven't been converted yet.
  const effectiveMode = (originalAmount && originalCurrency) ? "static" : mode;

  // State for live mode
  const [liveConverted, setLiveConverted] = useState<number | null>(null);
  const [liveRate, setLiveRate] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Only run effect in live mode if currency differs
  useEffect(() => {
    if (effectiveMode === "live" && currency !== defaultCurrency) {
      let isMounted = true;
      setIsLoading(true);

      ExchangeRateService.fetchExchangeRate(
        currency as CurrencyCode,
        defaultCurrency as CurrencyCode
      )
        .then((rate) => {
          if (isMounted && rate) {
            setLiveRate(rate);
            setLiveConverted(Number((amount * rate).toFixed(2)));
          }
        })
        .catch((err) => {
          logger.error("Failed to fetch rate for currency display", err);
        })
        .finally(() => {
          if (isMounted) setIsLoading(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [effectiveMode, currency, defaultCurrency, amount]);

  // Determine what to display based on mode
  
  if (effectiveMode === "static") {
    // Standard Transaction Row behavior
    // 'amount' = Final amount (ILS)
    // 'currency' = Final currency (ILS)
    // 'originalAmount' = Source amount (USD)
    
    // If no conversion happened or same currency, just show amount
    if (
      originalAmount == null ||
      originalAmount === amount ||
      originalCurrency === currency
    ) {
      return <>{formatCurrency(amount, currency as CurrencyCode, i18n.language)}</>;
    }

    return (
      <div className="flex items-center justify-center gap-1">
        {formatCurrency(amount, currency as CurrencyCode, i18n.language)}
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <RefreshCw className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="text-xs bg-popover text-popover-foreground border shadow-md p-3">
              <div className="grid gap-1 text-start">
                <div className="font-semibold text-foreground border-b pb-1 mb-1">
                  {tCurrency("row.tooltip.conversionDetails")}
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1">
                  <span className="text-muted-foreground">
                    {tCurrency("row.tooltip.original")}:
                  </span>
                  <span className="font-medium">
                    {formatCurrency(
                      originalAmount,
                      originalCurrency as any,
                      i18n.language
                    )}
                  </span>

                  <span className="text-muted-foreground">
                    {tCurrency("row.tooltip.rate")}:
                  </span>
                  <span className="font-medium">{conversionRate?.toFixed(2) || "-"}</span>

                  <span className="text-muted-foreground">
                    {tCurrency("row.tooltip.date")}:
                  </span>
                  <span className="font-medium">
                    {conversionDate
                      ? new Date(conversionDate).toLocaleDateString("en-GB", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "2-digit",
                        })
                      : "-"}
                  </span>

                  <span className="text-muted-foreground">
                    {tCurrency("row.tooltip.source")}:
                  </span>
                  <span className="font-medium">
                    {rateSource
                      ? tCurrency(
                          `conversion.rateTypes.${rateSource}`,
                          rateSource
                        )
                      : "-"}
                  </span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  } else {
    // Live Mode (Recurring Table)
    // 'amount' = Source amount (USD)
    // 'currency' = Source currency (USD)
    // We want to display Converted (ILS)
    
    if (currency === defaultCurrency) {
        return <>{formatCurrency(amount, currency as CurrencyCode, i18n.language)}</>;
    }

    return (
      <div className="flex items-center justify-center gap-1">
        {isLoading ? (
            <RefreshCw className="h-3 w-3 animate-spin text-muted-foreground" />
        ) : (
            <span className={cn(liveConverted ? "underline decoration-dotted decoration-muted-foreground/50 underline-offset-4" : "")}>
                {liveConverted ? formatCurrency(liveConverted, defaultCurrency as CurrencyCode, i18n.language) : "..."}
            </span>
        )}
        
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
               <RefreshCw className="h-3 w-3 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="text-xs bg-popover text-popover-foreground border shadow-md p-3">
              <div className="grid gap-1 text-start">
                <div className="font-semibold text-foreground border-b pb-1 mb-1">
                  {tCurrency("row.tooltip.conversionDetails")}
                </div>
                <div className="grid grid-cols-[80px_1fr] gap-x-2 gap-y-1">
                  <span className="text-muted-foreground">
                    {tCurrency("row.tooltip.original")}:
                  </span>
                  <span className="font-medium">
                    {formatCurrency(
                      amount,
                      currency as CurrencyCode,
                      i18n.language
                    )}
                  </span>

                  <span className="text-muted-foreground">
                    {tCurrency("row.tooltip.rate")}:
                  </span>
                  <span className="font-medium">{liveRate?.toFixed(2) || "N/A"}</span>

                  <span className="text-muted-foreground">
                    {tCurrency("row.tooltip.source")}:
                  </span>
                  <span className="font-medium">
                    {tCurrency("conversion.rateTypes.auto")} ({tCurrency("row.tooltip.estimated")})
                  </span>
                </div>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    );
  }
}
