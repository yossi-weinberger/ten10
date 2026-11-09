import { assert } from "jsr:@std/assert@1/assert";
import { parseHebrewMonthPeriod } from "./hebrew-month-period.ts";

const TODAY_GREGORIAN = "2026-11-09"; // Monday, Nov 9, 2026

Deno.test("parseHebrewMonthPeriod: תשרי (Tishrei) - most recent occurrence", () => {
  // תשרי תשפ"ז = Tishrei 5787 started September 12, 2026 and ended October 11, 2026
  // Since today is Nov 9, the most recent תשרי that's not in the future is תשרי תשפ"ז
  const result = parseHebrewMonthPeriod("תשרי", TODAY_GREGORIAN);
  assert(result !== null, "should parse תשרי");
  assert(result.from === "2026-09-12", `from should be 2026-09-12, got ${result.from}`);
  assert(result.to === "2026-10-11", `to should be 2026-10-11, got ${result.to}`);
});

Deno.test("parseHebrewMonthPeriod: בתשרי with ב prefix", () => {
  const result = parseHebrewMonthPeriod("בתשרי", TODAY_GREGORIAN);
  assert(result !== null, "should parse בתשרי");
  assert(result.from === "2026-09-12", "from should match");
  assert(result.to === "2026-10-11", "to should match");
});

Deno.test("parseHebrewMonthPeriod: לתשרי with ל prefix", () => {
  const result = parseHebrewMonthPeriod("לתשרי", TODAY_GREGORIAN);
  assert(result !== null, "should parse לתשרי");
  assert(result.from === "2026-09-12", "from should match");
  assert(result.to === "2026-10-11", "to should match");
});

Deno.test("parseHebrewMonthPeriod: אדר in non-leap year (5786) → Adar", () => {
  // 5786 is not a leap year, so אדר maps to month 6 (the single Adar)
  // Testing with a date in Adar 5786: around Feb-Mar 2026
  const testDate = "2026-03-15"; // In the middle of Adar 5786
  const result = parseHebrewMonthPeriod("אדר", testDate);
  assert(result !== null, "should parse אדר in non-leap year");
  // Adar 5786: approximately Feb 19 - Mar 20, 2026
  assert(result.from.startsWith("2026-02"), `from should be in Feb 2026, got ${result.from}`);
  assert(result.to.startsWith("2026-03"), `to should be in Mar 2026, got ${result.to}`);
});

Deno.test("parseHebrewMonthPeriod: אדר א' in leap year (5787)", () => {
  // 5787 is a leap year, so אדר א' is month 6, אדר ב' is month 7
  // Adar I 5787: approximately Feb-Mar 2027
  const testDate = "2027-03-15"; // After Adar I 5787
  const result = parseHebrewMonthPeriod("אדר א'", testDate);
  assert(result !== null, "should parse אדר א'");
  // Should get the most recent Adar I (5787)
  assert(result.from.startsWith("2027-02") || result.from.startsWith("2027-03"), `from should be in Feb/Mar 2027, got ${result.from}`);
});

Deno.test("parseHebrewMonthPeriod: אדר ב' in leap year (5787)", () => {
  const testDate = "2027-04-15"; // After Adar II 5787
  const result = parseHebrewMonthPeriod("אדר ב'", testDate);
  assert(result !== null, "should parse אדר ב'");
  // Adar II 5787 should be after Adar I
  assert(result.from.startsWith("2027-03") || result.from.startsWith("2027-04"), `from should be in Mar/Apr 2027, got ${result.from}`);
});

Deno.test("parseHebrewMonthPeriod: month in future of current Hebrew year → previous year", () => {
  // Today is Nov 9, 2026 = around Heshvan 5787
  // Asking for Elul (month 12) should give Elul 5786 (not 5787 which is in the future)
  const result = parseHebrewMonthPeriod("אלול", TODAY_GREGORIAN);
  assert(result !== null, "should parse אלול");
  // Elul 5786: around Aug-Sep 2026
  assert(result.from.startsWith("2026-08") || result.from.startsWith("2026-09"), `from should be in Aug/Sep 2026, got ${result.from}`);
  assert(result.to.startsWith("2026-09") || result.to.startsWith("2026-10"), `to should be in Sep/Oct 2026, got ${result.to}`);
});

Deno.test("parseHebrewMonthPeriod: explicit year תשרי 5786", () => {
  // Should return Tishrei 5786 regardless of current date
  const result = parseHebrewMonthPeriod("תשרי 5786", TODAY_GREGORIAN);
  assert(result !== null, "should parse תשרי 5786");
  // Tishrei 5786: Sep 23, 2025 - Oct 22, 2025
  assert(result.from === "2025-09-23", `from should be 2025-09-23, got ${result.from}`);
  assert(result.to === "2025-10-22", `to should be 2025-10-22, got ${result.to}`);
});

Deno.test("parseHebrewMonthPeriod: English month name Tishrei", () => {
  const result = parseHebrewMonthPeriod("Tishrei", TODAY_GREGORIAN);
  assert(result !== null, "should parse Tishrei");
  assert(result.from === "2026-09-12", "from should match");
  assert(result.to === "2026-10-11", "to should match");
});

Deno.test("parseHebrewMonthPeriod: null for invalid input", () => {
  assert(parseHebrewMonthPeriod("xyz", TODAY_GREGORIAN) === null, "should return null for invalid");
  assert(parseHebrewMonthPeriod("", TODAY_GREGORIAN) === null, "should return null for empty");
  assert(parseHebrewMonthPeriod("ינואר", TODAY_GREGORIAN) === null, "should return null for Gregorian month");
});
