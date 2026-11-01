import { resolveDateStruct, todayInZone, weekdayName } from "./split-date.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const TODAY = "2026-10-19";

Deno.test("relative dates are computed from today", () => {
  assert(resolveDateStruct({ kind: "days_ago", n: 1, weekday: null, day: null, month: null, year: null }, TODAY) === "2026-10-18", "yesterday");
  assert(resolveDateStruct({ kind: "days_ago", n: 0, weekday: null, day: null, month: null, year: null }, TODAY) === TODAY, "today");
  assert(weekdayName(TODAY) === "Monday", "19 Oct 2026 is Monday");
  assert(resolveDateStruct({ kind: "last_weekday", n: null, weekday: 0, day: null, month: null, year: null }, TODAY) === "2026-10-18", "last Sunday");
});

Deno.test("a day that has not arrived yet moves back, and an impossible day is null", () => {
  const futureDay = resolveDateStruct({ kind: "day_of_month", n: null, weekday: null, day: 31, month: null, year: null }, TODAY);
  assert(futureDay === "2026-08-31" || futureDay === "2026-09-30" || futureDay === null, "not a future October 31");
  assert(futureDay === null || futureDay < TODAY, "rolled back");
  assert(resolveDateStruct({ kind: "exact", n: null, weekday: null, day: 31, month: 2, year: 2026 }, TODAY) === null, "31 February");
  assert(resolveDateStruct({ kind: "exact", n: null, weekday: null, day: 1, month: 1, year: 2028 }, TODAY) === null, "future year");
});

Deno.test("the message zone decides which calendar day it is", () => {
  const evening = new Date("2026-10-29T22:30:00.000Z");
  assert(todayInZone(evening, "Asia/Jerusalem") === "2026-10-30", "Jerusalem is the next day");
  assert(todayInZone(evening, "UTC") === "2026-10-29", "UTC stays");
  assert(todayInZone(evening, "Not/AZone") === null, "unknown zone");
});
