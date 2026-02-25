import { useMemo } from "react";
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
import type { DailyExpense } from "@/lib/data-layer/category-analytics.service";
import { formatCurrency } from "@/lib/utils/currency";
import { useDonationStore } from "@/lib/store";

interface ExpensesHeatMapProps {
  data: DailyExpense[];
  isLoading: boolean;
  periodLabel: string;
}

function getIntensityClass(amount: number, max: number): string {
  if (amount === 0) return "bg-muted";
  const ratio = amount / max;
  if (ratio >= 0.75)
    return "bg-red-500 dark:bg-red-600";
  if (ratio >= 0.5)
    return "bg-orange-400 dark:bg-orange-500";
  if (ratio >= 0.25)
    return "bg-yellow-400 dark:bg-yellow-500";
  return "bg-green-300 dark:bg-green-500";
}

export function ExpensesHeatMap({
  data,
  isLoading,
  periodLabel,
}: ExpensesHeatMapProps) {
  const { t, i18n } = useTranslation("analytics");
  const defaultCurrency = useDonationStore(
    (state) => state.settings.defaultCurrency
  );

  const { dailyMap, maxAmount, weeks } = useMemo(() => {
    const map = new Map<string, number>();
    let max = 0;
    for (const d of data) {
      map.set(d.expense_date, d.total_amount);
      if (d.total_amount > max) max = d.total_amount;
    }

    if (data.length === 0) {
      return { dailyMap: map, maxAmount: 0, weeks: [] as string[][] };
    }

    const dates = data.map((d) => d.expense_date).sort();
    const startDate = new Date(dates[0] + "T00:00:00");
    const endDate = new Date(dates[dates.length - 1] + "T00:00:00");

    const allWeeks: string[][] = [];
    let currentWeek: string[] = [];

    const dayOfWeek = startDate.getDay();
    for (let i = 0; i < dayOfWeek; i++) {
      currentWeek.push("");
    }

    const cursor = new Date(startDate);
    while (cursor <= endDate) {
      const dateStr = cursor.toISOString().split("T")[0];
      currentWeek.push(dateStr);

      if (cursor.getDay() === 6) {
        allWeeks.push(currentWeek);
        currentWeek = [];
      }
      cursor.setDate(cursor.getDate() + 1);
    }
    if (currentWeek.length > 0) {
      allWeeks.push(currentWeek);
    }

    return { dailyMap: map, maxAmount: max, weeks: allWeeks };
  }, [data]);

  const dayLabels = useMemo(() => {
    if (i18n.language === "he") {
      return ["א", "ב", "ג", "ד", "ה", "ו", "ש"];
    }
    return ["S", "M", "T", "W", "T", "F", "S"];
  }, [i18n.language]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">
            {t("heatMap.title")}
          </CardTitle>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground focus:outline-none rounded p-1"
              >
                <Info className="h-4 w-4" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs z-50">
              <p className="text-sm">{t("heatMap.tooltip")}</p>
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-xs text-muted-foreground">{periodLabel}</p>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          </div>
        ) : data.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            {t("noData")}
          </p>
        ) : (
          <div className="space-y-3">
            {/* Day labels row */}
            <div className="flex gap-1 justify-center">
              <div className="w-5" />
              {dayLabels.map((label, i) => (
                <div
                  key={i}
                  className="w-5 h-5 text-[10px] text-muted-foreground flex items-center justify-center"
                >
                  {label}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="flex flex-col gap-1 items-center overflow-x-auto">
              {weeks.map((week, wIdx) => (
                <div key={wIdx} className="flex gap-1">
                  <div className="w-5 text-[10px] text-muted-foreground flex items-center justify-center">
                    {wIdx + 1}
                  </div>
                  {week.map((dateStr, dIdx) => {
                    if (!dateStr) {
                      return (
                        <div key={`empty-${dIdx}`} className="w-5 h-5" />
                      );
                    }
                    const amount = dailyMap.get(dateStr) ?? 0;
                    const dayNum = new Date(dateStr + "T00:00:00").getDate();
                    return (
                      <Tooltip key={dateStr}>
                        <TooltipTrigger asChild>
                          <div
                            className={`w-5 h-5 rounded-sm cursor-pointer transition-colors text-[8px] flex items-center justify-center ${getIntensityClass(
                              amount,
                              maxAmount
                            )}`}
                          >
                            {dayNum}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="z-50">
                          <p className="text-xs font-medium">{dateStr}</p>
                          <p className="text-xs">
                            {formatCurrency(
                              amount,
                              defaultCurrency,
                              i18n.language
                            )}
                          </p>
                        </TooltipContent>
                      </Tooltip>
                    );
                  })}
                  {/* Pad remaining days in the week */}
                  {Array.from({ length: 7 - week.length }).map((_, i) => (
                    <div key={`pad-${i}`} className="w-5 h-5" />
                  ))}
                </div>
              ))}
            </div>

            {/* Legend */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <span>{t("heatMap.less")}</span>
              <div className="w-4 h-4 rounded-sm bg-muted" />
              <div className="w-4 h-4 rounded-sm bg-green-300 dark:bg-green-500" />
              <div className="w-4 h-4 rounded-sm bg-yellow-400 dark:bg-yellow-500" />
              <div className="w-4 h-4 rounded-sm bg-orange-400 dark:bg-orange-500" />
              <div className="w-4 h-4 rounded-sm bg-red-500 dark:bg-red-600" />
              <span>{t("heatMap.more")}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
