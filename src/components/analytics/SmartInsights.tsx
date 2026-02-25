import { useTranslation } from "react-i18next";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Info,
} from "lucide-react";
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
import type { InsightItem, DriverImpact } from "@/lib/insights-engine";

interface SmartInsightsProps {
  insights: InsightItem[];
  isLoading: boolean;
  periodLabel: string;
}

const impactConfig: Record<
  DriverImpact,
  { icon: typeof TrendingUp; color: string; bg: string }
> = {
  positive: {
    icon: TrendingUp,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-100 dark:bg-green-900/30",
  },
  negative: {
    icon: TrendingDown,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-100 dark:bg-red-900/30",
  },
  neutral: {
    icon: Minus,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
};

export function SmartInsights({
  insights,
  isLoading,
  periodLabel,
}: SmartInsightsProps) {
  const { t } = useTranslation("analytics");

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">
          {t("insights.title")}
        </CardTitle>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        ) : insights.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            {t("insights.noInsights")}
          </p>
        ) : (
          <div className="space-y-3">
            {insights.map((insight) => {
              const cfg = impactConfig[insight.impact];
              const Icon = cfg.icon;

              return (
                <div
                  key={insight.id}
                  className={`flex items-start gap-3 rounded-lg p-3 ${cfg.bg}`}
                >
                  <div
                    className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${cfg.bg}`}
                  >
                    <Icon className={`h-4 w-4 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">
                      {t(insight.labelKey, insight.labelParams ?? {})}
                    </p>
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
                      <p className="text-sm">
                        {t(insight.tooltipKey)}
                      </p>
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
