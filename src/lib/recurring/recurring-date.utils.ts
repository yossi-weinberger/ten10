export function parseLocalDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** First calendar occurrence of dayOfMonth on or after startDate. */
export function firstDueDate(startDate: string, dayOfMonth: number): string {
  const start = parseLocalDate(startDate);
  const year = start.getFullYear();
  const month = start.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const candidate = new Date(year, month, Math.min(dayOfMonth, daysInMonth));

  if (candidate >= start) {
    return formatLocalDate(candidate);
  }

  return advanceMonthly(formatLocalDate(start), dayOfMonth);
}

/** Next monthly occurrence; avoids setMonth overflow (e.g. Jan 31 → Feb, not Mar). */
export function advanceMonthly(currentDate: string, dayOfMonth: number): string {
  const current = parseLocalDate(currentDate);
  let targetMonth = current.getMonth() + 1;
  let targetYear = current.getFullYear();
  if (targetMonth > 11) {
    targetMonth = 0;
    targetYear += 1;
  }
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  return formatLocalDate(
    new Date(targetYear, targetMonth, Math.min(dayOfMonth, daysInMonth))
  );
}
