export type AiBucketGrain = "day" | "week" | "month";

/** Inclusive span is `to - from` in UTC days, matching the trends RPC. */
export function bucketGrain(from: string, to: string): AiBucketGrain {
  const span = Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000,
  );
  if (!Number.isFinite(span) || span <= 62) return "day";
  if (span <= 366) return "week";
  return "month";
}

/** Week buckets start on Monday UTC, matching `date_trunc('week', ... AT TIME ZONE 'UTC')`. */
export function bucketKey(day: string, grain: AiBucketGrain): string {
  if (grain === "month") return day.slice(0, 7);
  if (grain === "day") return day;
  const date = new Date(`${day}T00:00:00Z`);
  const weekday = date.getUTCDay();
  const offset = weekday === 0 ? -6 : 1 - weekday;
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}
