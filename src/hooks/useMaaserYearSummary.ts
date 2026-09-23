import { useEffect, useState } from "react";
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

function emptySummary(hebrewYear: number, today: string): MaaserYearSummary {
  const range = getMaaserYearRange(hebrewYear);
  return buildMaaserYearSummary({
    range,
    reportEndDate: clampMaaserYearReportEnd(range, today),
    today,
    opening: EMPTY_BALANCE,
    closing: EMPTY_BALANCE,
    incomeInRange: 0,
    donationsInRange: 0,
  });
}

export function useMaaserYearSummary(userId: string | null) {
  const today = getCurrentLocalDate();
  const currentYear = getCurrentMaaserYear(today);
  const [hebrewYear, setHebrewYear] = useState(currentYear);
  const [summary, setSummary] = useState<MaaserYearSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const range = getMaaserYearRange(hebrewYear);
      const reportEndDate = clampMaaserYearReportEnd(range, today);

      if (today < range.startDate) {
        const nextSummary = null;
        const nextError = null;
        await Promise.resolve();
        if (cancelled) return;
        setSummary(nextSummary);
        setError(nextError);
        setIsLoading(false);
        return;
      }

      try {
        const [opening, closing, stats] = await Promise.all([
          fetchServerTitheBalanceAsOf(userId, range.openingAsOfDate),
          fetchServerTitheBalanceAsOf(userId, reportEndDate),
          fetchAnalyticsRangeStats(range.startDate, reportEndDate),
        ]);

        if (cancelled) return;

        if (!opening || !closing || !stats) {
          setError("load-failed");
          setSummary(null);
          setIsLoading(false);
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
        setError(null);
        setIsLoading(false);
      } catch (err) {
        logger.error("useMaaserYearSummary: failed to load year", err);
        if (cancelled) return;
        setError("load-failed");
        setSummary(null);
        setIsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hebrewYear, today, userId]);

  return {
    hebrewYear,
    currentYear,
    summary: summary ?? emptySummary(hebrewYear, today),
    isLoading,
    error,
    canGoNext: hebrewYear < currentYear,
    goToPreviousYear: () => setHebrewYear((year) => year - 1),
    goToNextYear: () =>
      setHebrewYear((year) => (year < currentYear ? year + 1 : year)),
  };
}
