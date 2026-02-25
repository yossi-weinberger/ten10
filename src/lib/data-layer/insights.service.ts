import {
  fetchTotalIncomeInRange,
  fetchTotalExpensesInRange,
  fetchTotalDonationsInRange,
} from "./analytics.service";
import { logger } from "@/lib/logger";

export interface PreviousPeriodData {
  prevIncome: number | null;
  prevExpenses: number | null;
  prevDonations: number | null;
}

function getPreviousPeriodDates(
  startDate: string,
  endDate: string
): { prevStart: string; prevEnd: string } {
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  const durationMs = end.getTime() - start.getTime();
  const prevEnd = new Date(start.getTime() - 1);
  const prevStart = new Date(prevEnd.getTime() - durationMs);

  const fmt = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  return { prevStart: fmt(prevStart), prevEnd: fmt(prevEnd) };
}

export async function fetchPreviousPeriodData(
  userId: string | null,
  startDate: string,
  endDate: string
): Promise<PreviousPeriodData> {
  const { prevStart, prevEnd } = getPreviousPeriodDates(startDate, endDate);

  logger.log(
    `InsightsService: Fetching previous period data: ${prevStart} to ${prevEnd}`
  );

  try {
    const [incomeResult, expensesResult, donationsResult] = await Promise.all([
      fetchTotalIncomeInRange(userId, prevStart, prevEnd),
      fetchTotalExpensesInRange(userId, prevStart, prevEnd),
      fetchTotalDonationsInRange(userId, prevStart, prevEnd),
    ]);

    return {
      prevIncome: incomeResult?.total_income ?? null,
      prevExpenses: expensesResult ?? null,
      prevDonations: donationsResult?.total_donations_amount ?? null,
    };
  } catch (error) {
    logger.error("InsightsService: Error fetching previous period data:", error);
    return { prevIncome: null, prevExpenses: null, prevDonations: null };
  }
}
