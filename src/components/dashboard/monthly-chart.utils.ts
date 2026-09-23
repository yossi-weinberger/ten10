import { format, parse } from "date-fns";
import { enUS, he } from "date-fns/locale";
import type { MonthlyChartDataPoint } from "@/components/charts/area-chart-interactive";
import type { MonthlyDataPoint } from "@/lib/data-layer/chart.service";

export function formatGregorianMonthlyChartData(
  data: readonly MonthlyDataPoint[],
  language: string,
): MonthlyChartDataPoint[] {
  const locale = language === "he" ? he : enUS;

  return data
    .slice()
    .sort((itemA, itemB) => {
      const dateA = parse(
        itemA.month_label,
        "yyyy-MM",
        new Date(),
      ).getTime();
      const dateB = parse(
        itemB.month_label,
        "yyyy-MM",
        new Date(),
      ).getTime();
      return dateA - dateB;
    })
    .map((item) => ({
      month: format(
        parse(item.month_label, "yyyy-MM", new Date()),
        "MMM yyyy",
        { locale },
      ),
      income: item.income,
      donations: item.donations,
      expenses: item.expenses,
    }));
}
