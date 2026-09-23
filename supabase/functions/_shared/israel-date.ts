const ISRAEL_TIME_ZONE = "Asia/Jerusalem";
const israelDateFormatter = new Intl.DateTimeFormat("en", {
  day: "2-digit",
  month: "2-digit",
  timeZone: ISRAEL_TIME_ZONE,
  year: "numeric",
});

export function getIsraelDate(date: Date = new Date()): string {
  const parts = israelDateFormatter.formatToParts(date);
  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  return `${year}-${month}-${day}`;
}
