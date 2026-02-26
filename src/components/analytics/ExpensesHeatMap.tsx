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
  if (amount === 0) return "bg-muted/50";
  const ratio = amount / max;
  if (ratio >= 0.75) return "bg-red-500 dark:bg-red-500";
  if (ratio >= 0.5) return "bg-orange-400 dark:bg-orange-400";
  if (ratio >= 0.25) return "bg-yellow-400 dark:bg-yellow-400";
  return "bg-green-400 dark:bg-green-500";
}

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface MonthGrid {
  label: string;
  weeks: (string | null)[][]; // 7 days per week, null = empty cell
}

function buildMonthlyGrids(
  startDate: string,
  endDate: string
): MonthGrid[] {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");

  // Cap to last 3 months max for readability
  const threeMonthsAgo = new Date(end);
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
  const effectiveStart = start < threeMonthsAgo ? threeMonthsAgo : start;

  const grids: MonthGrid[] = [];
  const cursor = new Date(
    effectiveStart.getFullYear(),
    effectiveStart.getMonth(),
    1
  );

  while (cursor <= end) {
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    const monthLabel = `${year}-${String(month + 1).padStart(2, "0")}`;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    const weeks: (string | null)[][] = [];
    let currentWeek: (string | null)[] = [];

    // Pad start of first week
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      if (date > end) {
        currentWeek.push(null);
      } else if (date < effectiveStart) {
        currentWeek.push(null);
      } else {
        currentWeek.push(formatLocalDate(date));
      }

      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }

    // Pad end of last week
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) {
        currentWeek.push(null);
      }
      weeks.push(currentWeek);
    }

    grids.push({ label: monthLabel, weeks });
    cursor.setMonth(cursor.getMonth() + 1);
  }

  return grids;
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

  const { dailyMap, maxAmount, grids } = useMemo(() => {
    const map = new Map<string, number>();
    let max = 0;
    for (const d of data) {
      map.set(d.expense_date, d.total_amount);
      if (d.total_amount > max) max = d.total_amount;
    }

    if (data.length === 0) {
      return {
        dailyMap: map,
        maxAmount: 0,
        grids: [] as MonthGrid[],
      };
    }

    const dates = data.map((d) => d.expense_date).sort();
    const startDate = dates[0];
    const endDate = dates[dates.length - 1];
    const monthGrids = buildMonthlyGrids(startDate, endDate);

    return { dailyMap: map, maxAmount: max, grids: monthGrids };
  }, [data]);

  const dayLabels = useMemo(() => {
    if (i18n.language === "he") {
      return ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
    }
    return ["S", "M", "T", "W", "T", "F", "S"];
  }, [i18n.language]);

  const monthNames = useMemo(() => {
    if (i18n.language === "he") {
      return [
        "ינואר", "פברואר", "מרץ", "אפריל", "מאי", "יוני",
        "יולי", "אוגוסט", "ספטמבר", "אוקטובר", "נובמבר", "דצמבר",
      ];
    }
    return [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ];
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
          <div className="space-y-6">
            {grids.map((grid) => {
              const monthIdx = parseInt(grid.label.split("-")[1], 10) - 1;
              return (
                <div key={grid.label}>
                  <h4 className="text-sm font-medium text-foreground mb-2">
                    {monthNames[monthIdx]} {grid.label.split("-")[0]}
                  </h4>

                  {/* Day labels */}
                  <div className="flex gap-1 mb-1">
                    {dayLabels.map((label, i) => (
                      <div
                        key={i}
                        className="w-8 h-5 text-[10px] text-muted-foreground flex items-center justify-center"
                      >
                        {label}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="flex flex-col gap-1">
                    {grid.weeks.map((week, wIdx) => (
                      <div key={wIdx} className="flex gap-1">
                        {week.map((dateStr, dIdx) => {
                          if (!dateStr) {
                            return (
                              <div
                                key={`empty-${wIdx}-${dIdx}`}
                                className="w-8 h-8"
                              />
                            );
                          }
                          const amount = dailyMap.get(dateStr) ?? 0;
                          const dayNum = parseInt(
                            dateStr.split("-")[2],
                            10
                          );
                          return (
                            <Tooltip key={dateStr}>
                              <TooltipTrigger asChild>
                                <div
                                  className={`w-8 h-8 rounded cursor-pointer transition-colors text-[11px] font-medium flex items-center justify-center border border-border/30 ${getIntensityClass(
                                    amount,
                                    maxAmount
                                  )}`}
                                >
                                  {dayNum}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="z-50">
                                <p className="text-xs font-medium">
                                  {dateStr}
                                </p>
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
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {/* Legend */}
            <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground pt-2">
              <span>{t("heatMap.less")}</span>
              <div className="w-4 h-4 rounded border border-border/30 bg-muted/50" />
              <div className="w-4 h-4 rounded border border-border/30 bg-green-400 dark:bg-green-500" />
              <div className="w-4 h-4 rounded border border-border/30 bg-yellow-400 dark:bg-yellow-400" />
              <div className="w-4 h-4 rounded border border-border/30 bg-orange-400 dark:bg-orange-400" />
              <div className="w-4 h-4 rounded border border-border/30 bg-red-500 dark:bg-red-500" />
              <span>{t("heatMap.more")}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
