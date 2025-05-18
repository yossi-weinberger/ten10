import { useMemo } from "react";
import { Transaction } from "@/types/transaction";
import { DateRangeObject } from "./useDateControls"; // Assuming DateRangeObject is exported from useDateControls

const calculateClientSideTotalIncome = (
  transactions: Transaction[],
  dateRange: DateRangeObject
): number => {
  // console.log(
  //   "Calculating client-side income for range:",
  //   dateRange,
  //   "from transactions:",
  //   transactions.length
  // );
  if (!dateRange.startDate || !dateRange.endDate) return 0;
  return transactions
    .filter(
      (t) =>
        t.type === "income" &&
        t.date >= dateRange.startDate &&
        t.date <= dateRange.endDate
    )
    .reduce((sum, t) => sum + t.amount, 0);
};

const calculateClientSideTotalExpenses = (
  transactions: Transaction[],
  dateRange: DateRangeObject
): number => {
  // console.log(
  //   "Calculating client-side expenses for range:",
  //   dateRange,
  //   "from transactions:",
  //   transactions.length
  // );
  if (!dateRange.startDate || !dateRange.endDate) return 0;
  return transactions
    .filter(
      (t) =>
        (t.type === "expense" || t.type === "recognized-expense") &&
        t.date >= dateRange.startDate &&
        t.date <= dateRange.endDate
    )
    .reduce((sum, t) => sum + t.amount, 0);
};

const calculateClientSideTotalDonations = (
  transactions: Transaction[],
  dateRange: DateRangeObject
): number => {
  // console.log(
  //   "Calculating client-side donations for range:",
  //   dateRange,
  //   "from transactions:",
  //   transactions.length
  // );
  if (!dateRange.startDate || !dateRange.endDate) return 0;
  return transactions
    .filter(
      (t) =>
        t.type === "donation" &&
        t.date >= dateRange.startDate &&
        t.date <= dateRange.endDate
    )
    .reduce((sum, t) => sum + t.amount, 0);
};

export function useClientStats(
  transactions: Transaction[],
  activeDateRangeObject: DateRangeObject
) {
  const clientTotalIncome = useMemo(() => {
    return calculateClientSideTotalIncome(transactions, activeDateRangeObject);
  }, [transactions, activeDateRangeObject]);

  const clientTotalExpenses = useMemo(() => {
    return calculateClientSideTotalExpenses(
      transactions,
      activeDateRangeObject
    );
  }, [transactions, activeDateRangeObject]);

  const clientTotalDonations = useMemo(() => {
    return calculateClientSideTotalDonations(
      transactions,
      activeDateRangeObject
    );
  }, [transactions, activeDateRangeObject]);

  const clientChomeshAmountInRange = useMemo(() => {
    if (!activeDateRangeObject.startDate || !activeDateRangeObject.endDate)
      return 0;
    return transactions
      .filter(
        (t) =>
          t.type === "income" &&
          t.is_chomesh &&
          t.date >= activeDateRangeObject.startDate &&
          t.date <= activeDateRangeObject.endDate
      )
      .reduce((sum, t) => sum + t.amount, 0);
  }, [transactions, activeDateRangeObject]);

  return {
    clientTotalIncome,
    clientTotalExpenses,
    clientTotalDonations,
    clientChomeshAmountInRange,
  };
}
