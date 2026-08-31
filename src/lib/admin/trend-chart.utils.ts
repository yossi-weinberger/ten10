export function isPresentChartValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") {
    return false;
  }
  return true;
}

export function formatTrendBucketLabel(
  value: string,
  locale: string,
  isDaily: boolean
): string {
  if (isDaily) {
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return value;
    return parsed.toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });
  }

  const monthlyMatch = /^(\d{4})-(\d{2})$/.exec(value);
  if (!monthlyMatch) return value;

  const year = Number(monthlyMatch[1]);
  const month = Number(monthlyMatch[2]);
  if (month < 1 || month > 12) return value;

  const parsed = new Date(year, month - 1, 1);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(locale, {
    month: "short",
    year: "numeric",
  });
}

export function formatCompactAmount(value: number, locale: string): string {
  if (!Number.isFinite(value)) return "";
  return new Intl.NumberFormat(locale, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export interface AdminCurrencyAmounts {
  income?: number;
  expenses?: number;
  donations?: number;
  exempt_income?: number;
  recognized_expenses?: number;
  non_tithe_donation?: number;
  total_managed?: number;
}

export interface AdminCurrencyTotals {
  income: number;
  expenses: number;
  donations: number;
  exempt_income: number;
  recognized_expenses: number;
  non_tithe_donation: number;
  total_managed: number;
}

function finiteAmount(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function sortAdminCurrencies(codes: string[]): string[] {
  return [...codes].sort((a, b) => {
    if (a === "ILS") return -1;
    if (b === "ILS") return 1;
    if (a === "USD") return -1;
    if (b === "USD") return 1;
    return a.localeCompare(b);
  });
}

export function sumSelectedCurrencyTotals(
  byCurrency: Record<string, AdminCurrencyAmounts | undefined> | null | undefined,
  selected: string[]
): AdminCurrencyTotals {
  const totals: AdminCurrencyTotals = {
    income: 0,
    expenses: 0,
    donations: 0,
    exempt_income: 0,
    recognized_expenses: 0,
    non_tithe_donation: 0,
    total_managed: 0,
  };

  if (!byCurrency) return totals;

  for (const code of selected) {
    const row = byCurrency[code];
    if (!row) continue;
    totals.income += finiteAmount(row.income);
    totals.expenses += finiteAmount(row.expenses);
    totals.donations += finiteAmount(row.donations);
    totals.exempt_income += finiteAmount(row.exempt_income);
    totals.recognized_expenses += finiteAmount(row.recognized_expenses);
    totals.non_tithe_donation += finiteAmount(row.non_tithe_donation);
  }

  totals.total_managed = totals.income + totals.expenses + totals.donations;
  return totals;
}

export function formatAdminMixedAmount(
  amount: number,
  selectedCurrencies: string[],
  locale: string
): string {
  if (selectedCurrencies.length !== 1) {
    return formatCompactAmount(amount, locale);
  }

  const currency = selectedCurrencies[0];
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return formatCompactAmount(amount, locale);
  }
}
