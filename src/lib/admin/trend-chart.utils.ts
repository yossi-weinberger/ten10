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
