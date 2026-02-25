import type { MonthlyDataPoint } from "@/lib/data-layer/chart.service";

export interface HealthScoreResult {
  score: number; // 0-100
  factors: {
    savings: number; // 0-40
    tithe: number; // 0-30
    trend: number; // 0-30
  };
}

export type DriverImpact = "positive" | "negative" | "neutral";

export interface Driver {
  id: string;
  numericValue: string;
  impact: DriverImpact;
  tooltipKey: string;
  labelKey: string;
  labelParams?: Record<string, string>;
}

export interface InsightItem {
  id: string;
  labelKey: string;
  labelParams?: Record<string, string>;
  impact: DriverImpact;
  tooltipKey: string;
}

export interface AnalyticsData {
  income: number | null;
  expenses: number | null;
  donations: number | null;
  titheBalance: number | null;
  monthlyData: MonthlyDataPoint[] | null;
  prevIncome: number | null;
  prevExpenses: number | null;
  prevDonations: number | null;
}

export function calculateHealthScore(data: AnalyticsData): HealthScoreResult {
  let savingsScore = 0;
  let titheScore = 0;
  let trendScore = 15; // neutral default

  const income = data.income ?? 0;
  const expenses = data.expenses ?? 0;

  // Savings ratio factor (0-40 points)
  if (income > 0) {
    const savingsRatio = (income - expenses) / income;
    if (savingsRatio >= 0.3) savingsScore = 40;
    else if (savingsRatio >= 0.2) savingsScore = 35;
    else if (savingsRatio >= 0.1) savingsScore = 28;
    else if (savingsRatio >= 0) savingsScore = 20;
    else if (savingsRatio >= -0.1) savingsScore = 10;
    else savingsScore = 0;
  }

  // Tithe balance factor (0-30 points)
  const titheBalance = data.titheBalance ?? 0;
  if (titheBalance <= 0) {
    titheScore = 30; // fully paid or in credit
  } else if (income > 0) {
    const titheRatio = titheBalance / income;
    if (titheRatio <= 0.05) titheScore = 25;
    else if (titheRatio <= 0.1) titheScore = 20;
    else if (titheRatio <= 0.2) titheScore = 12;
    else titheScore = 5;
  }

  // Expense trend factor (0-30 points)
  const monthly = data.monthlyData ?? [];
  if (monthly.length >= 2) {
    const recent = monthly.slice(-2);
    const prevExpense = recent[0].expenses;
    const currExpense = recent[1].expenses;
    if (prevExpense > 0) {
      const changeRatio = (currExpense - prevExpense) / prevExpense;
      if (changeRatio <= -0.1) trendScore = 30;
      else if (changeRatio <= 0) trendScore = 25;
      else if (changeRatio <= 0.05) trendScore = 20;
      else if (changeRatio <= 0.15) trendScore = 12;
      else trendScore = 5;
    }
  }

  return {
    score: Math.round(savingsScore + titheScore + trendScore),
    factors: {
      savings: savingsScore,
      tithe: titheScore,
      trend: trendScore,
    },
  };
}

export function getScoreLabel(score: number): string {
  if (score >= 80) return "excellent";
  if (score >= 60) return "good";
  if (score >= 40) return "fair";
  return "poor";
}

export function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-blue-600 dark:text-blue-400";
  if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export function getScoreRingColor(score: number): string {
  if (score >= 80) return "stroke-green-500";
  if (score >= 60) return "stroke-blue-500";
  if (score >= 40) return "stroke-yellow-500";
  return "stroke-red-500";
}

export function generateInsights(
  data: AnalyticsData,
  formatCurrencyFn: (amount: number) => string
): InsightItem[] {
  const items: InsightItem[] = [];
  const income = data.income ?? 0;
  const expenses = data.expenses ?? 0;
  const donations = data.donations ?? 0;

  // Savings ratio insight
  if (income > 0) {
    const savingsRatio = Math.round(((income - expenses) / income) * 100);
    if (savingsRatio > 0) {
      items.push({
        id: "savings",
        labelKey: "insights.savingsUp",
        labelParams: { value: String(savingsRatio) },
        impact: "positive",
        tooltipKey: "insights.savingsDriverTooltip",
      });
    } else if (savingsRatio < 0) {
      items.push({
        id: "savings",
        labelKey: "insights.savingsDown",
        labelParams: { value: String(Math.abs(savingsRatio)) },
        impact: "negative",
        tooltipKey: "insights.savingsDriverTooltip",
      });
    } else {
      items.push({
        id: "savings",
        labelKey: "insights.savingsNeutral",
        labelParams: { value: "0" },
        impact: "neutral",
        tooltipKey: "insights.savingsDriverTooltip",
      });
    }
  }

  // Expense change insight
  if (data.prevExpenses != null && data.prevExpenses > 0 && expenses > 0) {
    const changePercent = Math.round(
      ((expenses - data.prevExpenses) / data.prevExpenses) * 100
    );
    if (changePercent > 0) {
      items.push({
        id: "expenses_change",
        labelKey: "insights.expensesUp",
        labelParams: { value: String(changePercent) },
        impact: "negative",
        tooltipKey: "insights.expensesDriverTooltip",
      });
    } else if (changePercent < 0) {
      items.push({
        id: "expenses_change",
        labelKey: "insights.expensesDown",
        labelParams: { value: String(Math.abs(changePercent)) },
        impact: "positive",
        tooltipKey: "insights.expensesDriverTooltip",
      });
    }
  }

  // Income change insight
  if (data.prevIncome != null && data.prevIncome > 0 && income > 0) {
    const changePercent = Math.round(
      ((income - data.prevIncome) / data.prevIncome) * 100
    );
    if (changePercent > 0) {
      items.push({
        id: "income_change",
        labelKey: "insights.incomeUp",
        labelParams: { value: String(changePercent) },
        impact: "positive",
        tooltipKey: "insights.incomeDriverTooltip",
      });
    } else if (changePercent < 0) {
      items.push({
        id: "income_change",
        labelKey: "insights.incomeDown",
        labelParams: { value: String(Math.abs(changePercent)) },
        impact: "negative",
        tooltipKey: "insights.incomeDriverTooltip",
      });
    }
  }

  // Donation ratio insight
  if (income > 0 && donations > 0) {
    const donationRatio = Math.round((donations / income) * 100);
    items.push({
      id: "donation_ratio",
      labelKey:
        donationRatio >= 10
          ? "insights.donationRatioHigh"
          : "insights.donationRatioLow",
      labelParams: { value: String(donationRatio) },
      impact: donationRatio >= 10 ? "positive" : "neutral",
      tooltipKey: "insights.donationDriverTooltip",
    });
  }

  // Tithe balance insight
  const titheBalance = data.titheBalance;
  if (titheBalance != null) {
    if (titheBalance > 0) {
      items.push({
        id: "tithe_balance",
        labelKey: "insights.titheBalancePositive",
        labelParams: { amount: formatCurrencyFn(titheBalance) },
        impact: "negative",
        tooltipKey: "insights.titheDriverTooltip",
      });
    } else {
      items.push({
        id: "tithe_balance",
        labelKey: "insights.titheBalancePaid",
        impact: "positive",
        tooltipKey: "insights.titheDriverTooltip",
      });
    }
  }

  return items;
}

export function generateTopDrivers(
  data: AnalyticsData,
  formatCurrencyFn: (amount: number) => string
): Driver[] {
  const drivers: Driver[] = [];
  const income = data.income ?? 0;
  const expenses = data.expenses ?? 0;

  // Savings ratio driver
  if (income > 0) {
    const savingsRatio = Math.round(((income - expenses) / income) * 100);
    drivers.push({
      id: "savings_ratio",
      numericValue: `${savingsRatio >= 0 ? "+" : ""}${savingsRatio}%`,
      impact: savingsRatio >= 10 ? "positive" : savingsRatio < 0 ? "negative" : "neutral",
      tooltipKey: "insights.savingsDriverTooltip",
      labelKey: "healthScore.factorSavings",
    });
  }

  // Expense change driver
  if (data.prevExpenses != null && data.prevExpenses > 0) {
    const change = expenses - data.prevExpenses;
    const changePercent = Math.round(
      (change / data.prevExpenses) * 100
    );
    drivers.push({
      id: "expenses_change",
      numericValue: `${changePercent >= 0 ? "+" : ""}${changePercent}%`,
      impact: changePercent <= -5 ? "positive" : changePercent >= 5 ? "negative" : "neutral",
      tooltipKey: "insights.expensesDriverTooltip",
      labelKey: "insights.expensesUp",
      labelParams: { value: String(Math.abs(changePercent)) },
    });
  }

  // Income change driver
  if (data.prevIncome != null && data.prevIncome > 0) {
    const change = income - data.prevIncome;
    const changePercent = Math.round(
      (change / data.prevIncome) * 100
    );
    drivers.push({
      id: "income_change",
      numericValue: `${changePercent >= 0 ? "+" : ""}${changePercent}%`,
      impact: changePercent >= 5 ? "positive" : changePercent <= -5 ? "negative" : "neutral",
      tooltipKey: "insights.incomeDriverTooltip",
      labelKey: "insights.incomeUp",
      labelParams: { value: String(Math.abs(changePercent)) },
    });
  }

  // Donation ratio driver
  if (income > 0) {
    const donationRatio = Math.round(
      ((data.donations ?? 0) / income) * 100
    );
    drivers.push({
      id: "donation_ratio",
      numericValue: `${donationRatio}%`,
      impact: donationRatio >= 10 ? "positive" : "neutral",
      tooltipKey: "insights.donationDriverTooltip",
      labelKey: "insights.donationRatioHigh",
      labelParams: { value: String(donationRatio) },
    });
  }

  // Tithe balance driver
  if (data.titheBalance != null) {
    drivers.push({
      id: "tithe_balance",
      numericValue:
        data.titheBalance <= 0
          ? "✓"
          : formatCurrencyFn(data.titheBalance),
      impact: data.titheBalance <= 0 ? "positive" : "negative",
      tooltipKey: "insights.titheDriverTooltip",
      labelKey: "healthScore.factorTithe",
    });
  }

  // Sort by absolute impact and return top 3
  const impactOrder: Record<DriverImpact, number> = {
    negative: 0,
    positive: 1,
    neutral: 2,
  };
  drivers.sort((a, b) => impactOrder[a.impact] - impactOrder[b.impact]);
  return drivers.slice(0, 3);
}
