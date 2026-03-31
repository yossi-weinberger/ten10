import { useEffect, useState } from "react";
import { useDonationStore } from "@/lib/store";
import { fetchAnalyticsRangeStats } from "@/lib/data-layer";
import { getPreviousPeriodRange } from "@/lib/utils/date-range";
import { DateRangeObject } from "./useDateControls";
import { Platform } from "@/contexts/PlatformContext";
import { User } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

export interface PeriodComparisonData {
  prevIncome: number | null;
  prevExpenses: number | null;
  isLoading: boolean;
}

/**
 * Fetches stats for the "previous period" of the same duration as the active one.
 * Used to compute delta % badges on KPI cards.
 */
export function usePeriodComparison(
  activeDateRangeObject: DateRangeObject,
  user: User | null,
  platform: Platform | undefined
): PeriodComparisonData {
  const [prevIncome, setPrevIncome] = useState<number | null>(null);
  const [prevExpenses, setPrevExpenses] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const lastDbFetchTimestamp = useDonationStore(
    (state) => state.lastDbFetchTimestamp
  );

  const { startDate, endDate } = activeDateRangeObject;
  const isAllTime = startDate === "1970-01-01";

  useEffect(() => {
    const isReady =
      platform !== undefined &&
      platform !== "loading" &&
      !!startDate &&
      !!endDate;

    if (!isReady) return;
    if (platform === "web" && !user?.id) {
      setPrevIncome(null);
      setPrevExpenses(null);
      setIsLoading(false);
      return;
    }
    if (isAllTime) {
      setPrevIncome(null);
      setPrevExpenses(null);
      setIsLoading(false);
      return;
    }

    const { startDate: prevStart, endDate: prevEnd } = getPreviousPeriodRange(
      startDate,
      endDate
    );

    let cancelled = false;
    setIsLoading(true);

    // Single combined call for both prevIncome and prevExpenses.
    // auth.uid() / platform detection handled inside fetchAnalyticsRangeStats.
    fetchAnalyticsRangeStats(prevStart, prevEnd)
      .then((stats) => {
        if (cancelled) return;
        setPrevIncome(stats?.total_income ?? null);
        setPrevExpenses(stats?.total_expenses ?? null);
      })
      .catch((err) => {
        if (cancelled) return;
        logger.error("usePeriodComparison: fetch error:", err);
        setPrevIncome(null);
        setPrevExpenses(null);
      })
      .finally(() => {
        if (cancelled) return;
        setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [startDate, endDate, isAllTime, platform, user?.id, lastDbFetchTimestamp]);

  return { prevIncome, prevExpenses, isLoading };
}
