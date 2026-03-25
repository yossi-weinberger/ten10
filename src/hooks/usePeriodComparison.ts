import { useEffect, useState } from "react";
import {
  fetchTotalIncomeInRange,
  fetchTotalExpensesInRange,
  fetchTotalDonationsInRange,
} from "@/lib/data-layer";
import { getPreviousPeriodRange } from "./useInsights";
import { DateRangeObject } from "./useDateControls";
import { Platform } from "@/contexts/PlatformContext";
import { User } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";

export interface PeriodComparisonData {
  prevIncome: number | null;
  prevExpenses: number | null;
  prevDonations: number | null;
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
  const [prevDonations, setPrevDonations] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { startDate, endDate } = activeDateRangeObject;

  useEffect(() => {
    const isReady =
      platform !== undefined &&
      platform !== "loading" &&
      !!startDate &&
      !!endDate;

    if (!isReady) return;
    if (platform === "web" && !user?.id) return;

    const { startDate: prevStart, endDate: prevEnd } = getPreviousPeriodRange(
      startDate,
      endDate
    );

    const userId = platform === "web" ? user?.id ?? null : null;

    setIsLoading(true);

    Promise.all([
      fetchTotalIncomeInRange(userId, prevStart, prevEnd),
      fetchTotalExpensesInRange(userId, prevStart, prevEnd),
      fetchTotalDonationsInRange(userId, prevStart, prevEnd),
    ])
      .then(([income, expenses, donations]) => {
        setPrevIncome(income?.total_income ?? null);
        setPrevExpenses(expenses ?? null);
        setPrevDonations(donations?.total_donations_amount ?? null);
      })
      .catch((err) => {
        logger.error("usePeriodComparison: fetch error:", err);
        setPrevIncome(null);
        setPrevExpenses(null);
        setPrevDonations(null);
      })
      .finally(() => setIsLoading(false));
  }, [startDate, endDate, platform, user?.id]);

  return { prevIncome, prevExpenses, prevDonations, isLoading };
}
