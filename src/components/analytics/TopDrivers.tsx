import { useTranslation } from "react-i18next";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { Driver, DriverImpact } from "@/lib/insights-engine";

interface TopDriversProps {
  drivers: Driver[];
  isLoading: boolean;
  periodLabel: string;
}

const impactBadge: Record<DriverImpact, { label: string; className: string }> =
  {
    positive: {
      label: "insights.positive",
      className:
        "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400",
    },
    negative: {
      label: "insights.negative",
      className:
        "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400",
    },
    neutral: {
      label: "insights.neutral",
      className: "bg-muted text-muted-foreground",
    },
  };

export function TopDrivers({
  drivers,
  isLoading,
  periodLabel,
}: TopDriversProps) {
  const { t } = useTranslation("analytics");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          {t("insights.driversTitle")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        ) : drivers.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {t("insights.noInsights")}
          </p>
        ) : (
          <div className="space-y-3">
            {drivers.map((driver, idx) => {
              const badge = impactBadge[driver.impact];

              return (
                <div
                  key={driver.id}
                  className="flex items-center gap-3 rounded-lg border border-border p-3"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-bold text-muted-foreground">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {t(driver.labelKey, driver.labelParams ?? {})}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-lg font-bold tabular-nums text-foreground">
                        {driver.numericValue}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${badge.className}`}
                      >
                        {t(badge.label)}
                      </span>
                    </div>
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        className="shrink-0 text-muted-foreground hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded p-0.5"
                        aria-label={t("insights.tooltipHow")}
                      >
                        <Info className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs z-50">
                      <p className="text-sm">{t(driver.tooltipKey)}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
