export interface GregorianMonthSeparator {
  beforeIndex: number;
  monthKey: string;
  monthLabel: string;
}

export function getGregorianMonthKey(dateString: string): string {
  return dateString.substring(0, 7);
}

export function formatGregorianMonthLabel(
  monthKey: string,
  locale: string,
): string {
  const [year, month] = monthKey.split("-");
  const date = new Date(parseInt(year), parseInt(month) - 1, 1);
  return date.toLocaleDateString(locale, {
    year: "numeric",
    month: "long",
  });
}

export function isGregorianMonthTransition(
  previousMonthKey: string | null,
  dateString: string,
): boolean {
  return (
    previousMonthKey !== null &&
    previousMonthKey !== getGregorianMonthKey(dateString)
  );
}

export function getGregorianMonthSeparators(
  dates: readonly string[],
  locale: string,
): GregorianMonthSeparator[] {
  const separators: GregorianMonthSeparator[] = [];
  let previousMonthKey: string | null = null;

  dates.forEach((date, index) => {
    const monthKey = getGregorianMonthKey(date);
    if (isGregorianMonthTransition(previousMonthKey, date)) {
      separators.push({
        beforeIndex: index,
        monthKey,
        monthLabel: formatGregorianMonthLabel(monthKey, locale),
      });
    }
    previousMonthKey = monthKey;
  });

  return separators;
}
