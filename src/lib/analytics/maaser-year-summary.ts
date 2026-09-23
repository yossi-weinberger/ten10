import type { MaaserYearRange } from "../../../supabase/functions/_shared/calendar/maaser-year.ts";

export interface TitheBalanceBreakdown {
  total_balance: number;
  maaser_balance: number;
  chomesh_balance: number;
}

export interface MaaserYearSummary {
  range: MaaserYearRange;
  reportEndDate: string;
  isCurrentYear: boolean;
  opening: TitheBalanceBreakdown;
  closing: TitheBalanceBreakdown;
  yearDelta: TitheBalanceBreakdown;
  incomeInRange: number;
  donationsInRange: number;
  estimatedMaaserFromIncome: number;
}

export interface TitheTransaction {
  date: string;
  type: string;
  amount: number;
  is_chomesh?: boolean | null;
}

const EMPTY_BALANCE: TitheBalanceBreakdown = {
  total_balance: 0,
  maaser_balance: 0,
  chomesh_balance: 0,
};

function applyTitheTransaction(
  balance: TitheBalanceBreakdown,
  transaction: TitheTransaction,
): TitheBalanceBreakdown {
  const amount = transaction.amount;
  const isChomesh = transaction.is_chomesh === true;
  let maaser = balance.maaser_balance;
  let chomesh = balance.chomesh_balance;

  switch (transaction.type) {
    case "income":
      maaser += amount * 0.1;
      if (isChomesh) {
        chomesh += amount * 0.1;
      }
      break;
    case "donation":
      if (isChomesh) {
        chomesh -= amount;
      } else {
        maaser -= amount;
      }
      break;
    case "recognized-expense":
      maaser -= amount * 0.1;
      if (isChomesh) {
        chomesh -= amount * 0.1;
      }
      break;
    case "initial_balance":
      if (isChomesh) {
        chomesh += amount;
      } else {
        maaser += amount;
      }
      break;
    default:
      break;
  }

  return {
    maaser_balance: maaser,
    chomesh_balance: chomesh,
    total_balance: maaser + chomesh,
  };
}

export function accumulateTitheBalance(
  transactions: readonly TitheTransaction[],
  asOfDate?: string,
): TitheBalanceBreakdown {
  return transactions.reduce((balance, transaction) => {
    if (asOfDate !== undefined && transaction.date > asOfDate) {
      return balance;
    }

    return applyTitheTransaction(balance, transaction);
  }, EMPTY_BALANCE);
}

export function accumulateTitheActivity(
  transactions: readonly TitheTransaction[],
  startDate: string,
  endDate: string,
): TitheBalanceBreakdown {
  return transactions.reduce((balance, transaction) => {
    if (transaction.date < startDate || transaction.date > endDate) {
      return balance;
    }

    return applyTitheTransaction(balance, transaction);
  }, EMPTY_BALANCE);
}

export function subtractTitheBalance(
  closing: TitheBalanceBreakdown,
  opening: TitheBalanceBreakdown,
): TitheBalanceBreakdown {
  return {
    total_balance: closing.total_balance - opening.total_balance,
    maaser_balance: closing.maaser_balance - opening.maaser_balance,
    chomesh_balance: closing.chomesh_balance - opening.chomesh_balance,
  };
}

export function buildMaaserYearSummary(input: {
  range: MaaserYearRange;
  reportEndDate: string;
  today: string;
  opening: TitheBalanceBreakdown;
  closing: TitheBalanceBreakdown;
  incomeInRange: number;
  donationsInRange: number;
}): MaaserYearSummary {
  return {
    range: input.range,
    reportEndDate: input.reportEndDate,
    isCurrentYear: input.today >= input.range.startDate && input.today <= input.range.endDate,
    opening: input.opening,
    closing: input.closing,
    yearDelta: subtractTitheBalance(input.closing, input.opening),
    incomeInRange: input.incomeInRange,
    donationsInRange: input.donationsInRange,
    estimatedMaaserFromIncome: input.incomeInRange * 0.1,
  };
}
