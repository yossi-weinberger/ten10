import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DailyHeatmapResponse, HeatmapTypeGroup } from "@/lib/data-layer/insights.service";
import { useDonationStore } from "@/lib/store";
import { formatCurrency } from "@/lib/utils/currency";
import { CalendarDays } from "lucide-react";
import {
  format, parseISO,
  eachWeekOfInterval, startOfWeek, endOfWeek,
  eachDayOfInterval, isWithinInterval, startOfDay,
} from "date-fns";
import { he, enUS } from "date-fns/locale";

interface TransactionHeatmapProps {
  data: DailyHeatmapResponse;
  isLoading: boolean;
  error: string | null;
  typeGroup: HeatmapTypeGroup;
  onTypeGroupChange: (g: HeatmapTypeGroup) => void;
  className?: string;
}

// 5 intensity levels: 0 = no data, 1–4 = light to dark
function getIntensity(amount: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (amount <= 0 || max <= 0) return 0;
  const ratio = amount / max;
  if (ratio < 0.15) return 1;
  if (ratio < 0.35) return 2;
  if (ratio < 0.65) return 3;
  return 4;
}

// Color scheme per transaction type group
const TYPE_COLORS: Record<HeatmapTypeGroup, Record<0 | 1 | 2 | 3 | 4, string>> = {
  all: {
    0: "bg-muted/40 dark:bg-muted/20",
    1: "bg-primary/20",
    2: "bg-primary/40",
    3: "bg-primary/65",
    4: "bg-primary",
  },
  income: {
    0: "bg-muted/40 dark:bg-muted/20",
    1: "bg-green-500/20",
    2: "bg-green-500/40",
    3: "bg-green-500/65",
    4: "bg-green-500",
  },
  expense: {
    0: "bg-muted/40 dark:bg-muted/20",
    1: "bg-destructive/20",
    2: "bg-destructive/40",
    3: "bg-destructive/65",
    4: "bg-destructive",
  },
  donation: {
    0: "bg-muted/40 dark:bg-muted/20",
    1: "bg-yellow-500/20",
    2: "bg-yellow-500/40",
    3: "bg-yellow-500/65",
    4: "bg-yellow-500",
  },
};

// Legend colors per type (for the legend bar)
const TYPE_LEGEND_COLOR: Record<HeatmapTypeGroup, string> = {
  all: "from-primary/20 via-primary/50 to-primary",
  income: "from-green-500/20 via-green-500/50 to-green-500",
  expense: "from-destructive/20 via-destructive/50 to-destructive",
  donation: "from-yellow-500/20 via-yellow-500/50 to-yellow-500",
};

function buildWeeksGrid(filteredData: DailyHeatmapResponse) {
  if (filteredData.length === 0) return { weeks: [], maxAmount: 0 };

  const map = new Map(filteredData.map((d) => [d.tx_date, d]));
  const maxAmt = filteredData.reduce((max, d) => Math.max(max, d.total_amount), 0);

  const firstDate = parseISO(filteredData[0].tx_date);
  const lastDate = parseISO(filteredData[filteredData.length - 1].tx_date);

  const weekStarts = eachWeekOfInterval(
    { start: startOfWeek(firstDate, { weekStartsOn: 0 }), end: endOfWeek(lastDate, { weekStartsOn: 0 }) },
    { weekStartsOn: 0 }
  );

  const weeksGrid = weekStarts.map((weekStart) => {
    const days = eachDayOfInterval({ start: weekStart, end: endOfWeek(weekStart, { weekStartsOn: 0 }) });
    return days.map((day) => {
      const dateStr = format(day, "yyyy-MM-dd");
      const inRange = isWithinInterval(startOfDay(day), {
        start: startOfDay(firstDate),
        end: startOfDay(lastDate),
      });
      return { date: day, dateStr, inRange, entry: map.get(dateStr) ?? null };
    });
  });

  return { weeks: weeksGrid, maxAmount: maxAmt };
}

// Compute cell size based on number of visible weeks (larger cells when fewer weeks)
function getCellSize(numWeeks: number): number {
  if (numWeeks <= 6) return 16;
  if (numWeeks <= 13) return 14;
  if (numWeeks <= 26) return 12;
  return 11;
}

export function TransactionHeatmap({
  data,
  isLoading,
  error,
  typeGroup,
  onTypeGroupChange,
  className,
}: TransactionHeatmapProps) {
  const { t, i18n } = useTranslation("dashboard");
  const defaultCurrency = useDonationStore((s) => s.settings.defaultCurrency);
  const dateLocale = i18n.language === "he" ? he : enUS;
  const fmt = (v: number) => formatCurrency(v, defaultCurrency, i18n.language);

  // Available years from data (for year navigation when data spans >1 year)
  const availableYears = useMemo(() => {
    const years = [...new Set(data.map((d) => d.tx_date.substring(0, 4)))].sort();
    return years;
  }, [data]);

  const isMultiYear = availableYears.length > 1;

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  // If selectedYear no longer exists (e.g. typeGroup changed and data refreshed),
  // fall back to the latest available year to avoid showing an empty heatmap.
  const effectiveYear = (selectedYear && availableYears.includes(selectedYear))
    ? selectedYear
    : (availableYears[availableYears.length - 1] ?? null);

  // Filter data to selected year when multi-year; otherwise show all
  const filteredData = useMemo(() => {
    if (!isMultiYear || !effectiveYear) return data;
    return data.filter((d) => d.tx_date.startsWith(effectiveYear));
  }, [data, isMultiYear, effectiveYear]);

  const { weeks, maxAmount } = useMemo(
    () => buildWeeksGrid(filteredData),
    [filteredData]
  );

  const cellSize = getCellSize(weeks.length);
  const intensityColors = TYPE_COLORS[typeGroup];

  const weekdayLabels = i18n.language === "he"
    ? ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"]
    : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className={className}
    >
      <Card dir={i18n.dir()} className={`bg-gradient-to-br from-background to-muted/20 flex flex-col ${className ? "h-full" : ""}`}>
        <CardHeader className="p-4 sm:p-5 pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {t("analytics.heatmap.title")}
            </CardTitle>
            {/* Type tabs in header */}
            <Tabs value={typeGroup} onValueChange={(v) => onTypeGroupChange(v as HeatmapTypeGroup)} dir={i18n.dir()}>
              <TabsList className="h-8 p-0.5">
                <TabsTrigger value="all" className="text-[11px] px-2 h-7">{t("analytics.heatmap.typeAll")}</TabsTrigger>
                <TabsTrigger value="income" className="text-[11px] px-2 h-7">{t("analytics.categories.tabIncome")}</TabsTrigger>
                <TabsTrigger value="expense" className="text-[11px] px-2 h-7">{t("analytics.categories.tabExpenses")}</TabsTrigger>
                <TabsTrigger value="donation" className="text-[11px] px-2 h-7">{t("statsCards.donations.title")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{t("analytics.heatmap.subtitle")}</p>

          {/* Year tabs — directly in header when multi-year */}
          {isMultiYear && weeks.length > 0 && (
            <Tabs
              value={effectiveYear ?? availableYears[availableYears.length - 1]}
              onValueChange={(y) => setSelectedYear(y)}
              dir="ltr"
              className="mt-2"
            >
              <TabsList className="h-7 p-0.5">
                {availableYears.map((year) => (
                  <TabsTrigger key={year} value={year} className="text-[11px] px-2 h-6">
                    {year}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}
        </CardHeader>

        <CardContent className="p-4 sm:p-5 pt-0 flex flex-col flex-1 justify-center">
          {isLoading ? (
            <div className="space-y-2 py-2">
              <div className="flex gap-1 justify-center">
                {Array.from({ length: 16 }).map((_, wi) => (
                  <div key={wi} className="flex flex-col gap-1">
                    {Array.from({ length: 7 }).map((_, di) => (
                      <Skeleton key={di} className="rounded-sm" style={{ width: 12, height: 12 }} />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : error ? (
            <div className="h-28 flex items-center justify-center">
              <p className="text-sm text-destructive">{t("analytics.error")}</p>
            </div>
          ) : weeks.length === 0 ? (
            <div className="h-28 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">{t("analytics.heatmap.noData")}</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${typeGroup}-${effectiveYear ?? "all"}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                {/* Heatmap grid — centered, scrollable horizontally for large datasets */}
                <div className="overflow-x-auto" id="pdf-chart-heatmap">
                  <div
                    className="flex gap-2 items-start justify-center min-w-fit"
                    dir="ltr"
                  >
                    {/* Day-of-week labels */}
                    <div className="flex flex-col gap-0.5 shrink-0" style={{ paddingTop: 20 }}>
                      {weekdayLabels.map((d, i) => (
                        <div
                          key={i}
                          className="text-[9px] text-muted-foreground leading-none flex items-center"
                          style={{ height: cellSize, fontSize: Math.max(8, cellSize - 3) }}
                        >
                          {i % 2 === 0 ? d : ""}
                        </div>
                      ))}
                    </div>
                    {/* Week columns */}
                    <div className="flex gap-0.5">
                      {weeks.map((week, wi) => (
                        <div key={wi} className="flex flex-col gap-0.5">
                          {/* Month label on first week of month */}
                          <div className="h-5 text-[9px] text-muted-foreground leading-none flex items-center">
                            {week[0].date.getDate() <= 7
                              ? format(week[0].date, "MMM", { locale: dateLocale })
                              : ""}
                          </div>
                          {week.map((cell) => {
                            const intensity = cell.entry ? getIntensity(cell.entry.total_amount, maxAmount) : 0;
                            if (!cell.inRange) {
                              return (
                                <div
                                  key={cell.dateStr}
                                  className="rounded-sm opacity-0"
                                  style={{ width: cellSize, height: cellSize }}
                                />
                              );
                            }
                            return (
                              <Tooltip key={cell.dateStr} delayDuration={100}>
                                <TooltipTrigger asChild>
                                  <div
                                    className={`rounded-sm cursor-default transition-colors ${intensityColors[intensity]}`}
                                    style={{ width: cellSize, height: cellSize }}
                                  />
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  <p className="text-xs" dir={i18n.dir()}>
                                    {cell.entry
                                      ? t("analytics.heatmap.tooltip", {
                                          date: format(cell.date, "dd/MM/yyyy"),
                                          count: cell.entry.tx_count,
                                          amount: fmt(cell.entry.total_amount),
                                        })
                                      : format(cell.date, "dd/MM/yyyy")}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex items-center gap-2 mt-3 justify-end" dir="ltr">
                  <span className="text-[10px] text-muted-foreground">{t("analytics.heatmap.legendLow")}</span>
                  <div className={`h-2 w-20 rounded-full bg-gradient-to-r ${TYPE_LEGEND_COLOR[typeGroup]}`} />
                  <span className="text-[10px] text-muted-foreground">{t("analytics.heatmap.legendHigh")}</span>
                </div>
              </motion.div>
            </AnimatePresence>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
