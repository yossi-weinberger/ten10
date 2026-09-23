import { useCallback, useEffect, useState } from "react";
import {
  buildMaaserYearSummary,
  type MaaserYearSummary,
} from "@/lib/analytics/maaser-year-summary";
import {
  clampMaaserYearReportEnd,
  getCurrentMaaserYear,
  getMaaserYearRange,
} from "@/lib/calendar";
import {
  fetchAnalyticsRangeStats,
  fetchServerTitheBalanceAsOf,
} from "@/lib/data-layer";
import { logger } from "@/lib/logger";
import { getCurrentLocalDate } from "@/lib/utils/local-date";

const EMPTY_BALANCE = {
  total_balance: 0,
  maaser_balance: 0,
  chomesh_balance: 0,
};

export function useMaaserYearSummary(userId: string | null) {
  const today = getCurrentLocalDate();
  const currentYear = getCurrentMaaserYear(today);
  const [hebrewYear, setHebrewYear] = useState(currentYear);
  const [summary, setSummary] = useState<MaaserYearSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadYear = useCallback(
    async (year: number) => {
      const range = getMaaserYearRange(year);
      if (today < range.startDate) {
        setSummary(null);
        setIsLoading(false);
        setError(null);
        return;
      }

      setIsLoading(true);
      setError(null);
      const reportEndDate = clampMaaserYearReportEnd(range, today);

      try {
        const [opening, closing, stats] = await Promise.all([
          fetchServerTitheBalanceAsOf(userId, range.openingAsOfDate),
          fetchServerTitheBalanceAsOf(userId, reportEndDate),
          fetchAnalyticsRangeStats(range.startDate, reportEndDate),
        ]);

        if (!opening || !closing || !stats) {
          setError("load-failed");
          setSummary(null);
          return;
        }

        setSummary(
          buildMaaserYearSummary({
            range,
            reportEndDate,
            today,
            opening,
            closing,
            incomeInRange: stats.total_income,
            donationsInRange: stats.total_donations,
          }),
        );
      } catch (err) {
        logger.error("useMaaserYearSummary: failed to load year", err);
        setError("load-failed");
        setSummary(null);
      } finally {
        setIsLoading(false);
      }
    },
    [today, userId],
  );

  useEffect(() => {
    void loadYear(hebrewYear);
  }, [hebrewYear, loadYear]);

  return {
    hebrewYear,
    currentYear,
    summary:
      summary ??
      buildMaaserYearSummary({
        range: getMaaserYearRange(hebrewYear),
        reportEndDate: clampMaaserYearReportEnd(
          getMaaserYearRange(hebrewYear),
          today,
        ),
        today,
        opening: EMPTY_BALANCE,
        closing: EMPTY_BALANCE,
        incomeInRange: 0,
        donationsInRange: 0,
      }),
    isLoading,
    error,
    canGoNext: hebrewYear < currentYear,
    goToPreviousYear: () => setHebrewYear((year) => year - 1),
    goToNextYear: () =>
      setHebrewYear((year) => (year < currentYear ? year + 1 : year)),
  };
}
