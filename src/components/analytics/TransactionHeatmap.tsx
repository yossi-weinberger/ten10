import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  getYear,
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

const INTENSITY_CLASS: Record<0 | 1 | 2 | 3 | 4, string> = {
  0: "bg-muted/40 dark:bg-muted/20",
  1: "bg-primary/20",
  2: "bg-primary/40",
  3: "bg-primary/65",
  4: "bg-primary",
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

  // Default: latest available year
  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const effectiveYear = selectedYear ?? (availableYears[availableYears.length - 1] ?? null);

  // Filter data to selected year when multi-year; otherwise show all
  const filteredData = useMemo(() => {
    if (!isMultiYear || !effectiveYear) return data;
    return data.filter((d) => d.tx_date.startsWith(effectiveYear));
  }, [data, isMultiYear, effectiveYear]);

  const { weeks, maxAmount } = useMemo(
    () => buildWeeksGrid(filteredData),
    [filteredData]
  );

  const weekdayLabels = i18n.language === "he"
    ? ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "ש'"]
    : ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className={className}>
      <Card dir={i18n.dir()} className={`bg-gradient-to-br from-background to-muted/20 ${className ? "h-full" : ""}`}>
        <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
              {t("analytics.heatmap.title")}
            </CardTitle>
            <Tabs value={typeGroup} onValueChange={(v) => onTypeGroupChange(v as HeatmapTypeGroup)} dir={i18n.dir()}>
              <TabsList className="h-7">
                <TabsTrigger value="all" className="text-[11px] px-2">{t("analytics.heatmap.typeAll")}</TabsTrigger>
                <TabsTrigger value="income" className="text-[11px] px-2">{t("analytics.categories.tabIncome")}</TabsTrigger>
                <TabsTrigger value="expense" className="text-[11px] px-2">{t("analytics.categories.tabExpenses")}</TabsTrigger>
                <TabsTrigger value="donation" className="text-[11px] px-2">{t("statsCards.donations.title")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <p className="text-xs text-muted-foreground">{t("analytics.heatmap.subtitle")}</p>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {isLoading ? (
            <div className="h-28 flex items-center justify-center">
              <p className="text-sm text-muted-foreground">{t("analytics.loading")}</p>
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
            <div className="space-y-3">
              {/* Year tabs — shown when data spans more than one year */}
              {isMultiYear && (
                <Tabs
                  value={effectiveYear ?? availableYears[availableYears.length - 1]}
                  onValueChange={(y) => setSelectedYear(y)}
                  dir="ltr"
                >
                  <TabsList className="h-7 flex-wrap">
                    {availableYears.map((year) => (
                      <TabsTrigger key={year} value={year} className="text-[11px] px-2.5">
                        {year}
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </Tabs>
              )}

              {/* Heatmap grid — justify-center when few weeks, overflow-x-auto for many */}
              <div className="overflow-x-auto" id="pdf-chart-heatmap">
                <div className="flex gap-2 items-start justify-center min-w-fit" dir="ltr">
                  {/* Day-of-week labels */}
                  <div className="flex flex-col gap-0.5 pt-6 shrink-0">
                    {weekdayLabels.map((d, i) => (
                      <div key={i} className="h-[11px] text-[9px] text-muted-foreground leading-none flex items-center">
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
                            return <div key={cell.dateStr} className="h-[11px] w-[11px] rounded-sm opacity-0" />;
                          }
                          return (
                            <Tooltip key={cell.dateStr} delayDuration={100}>
                              <TooltipTrigger asChild>
                                <div className={`h-[11px] w-[11px] rounded-sm cursor-default transition-colors ${INTENSITY_CLASS[intensity]}`} />
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
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
