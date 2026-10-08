export function parseLocalDate(dateString: string): Date {
  const [year, month, day] = dateString.split("-").map(Number);
  // Years 0-99 are reserved by the JS Date constructor as 1900-1999.
  // Reject them so a value like 0026 never becomes 1926-01-01.
  if (!Number.isInteger(year) || year < 100) {
    return new Date(Number.NaN);
  }
  return new Date(year, month - 1, day);
}

export function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  if (!Number.isFinite(year) || year < 100) {
    return "";
  }
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${String(year).padStart(4, "0")}-${month}-${day}`;
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
