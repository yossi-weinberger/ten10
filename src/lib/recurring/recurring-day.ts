export function maximumRecurringDay(calendarType: string | undefined): number {
  return calendarType === "hebrew" ? 30 : 31;
}

export function clampRecurringDay(
  calendarType: string | undefined,
  day: number,
): number {
  const maximum = maximumRecurringDay(calendarType);
  return day > maximum ? maximum : day;
}
