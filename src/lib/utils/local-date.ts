export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getCurrentLocalDate(now: Date = new Date()): string {
  return formatLocalDate(now);
}

/** Inclusive month bounds for calendar dropdowns, five years past today. */
export function getCalendarNavigationBounds(now: Date = new Date()): {
  startMonth: Date;
  endMonth: Date;
} {
  return {
    startMonth: parseLocalDate("1960-01-01"),
    endMonth: parseLocalDate(`${now.getFullYear() + 5}-12-31`),
  };
}
