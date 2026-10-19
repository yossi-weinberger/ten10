import { parseYearTypeSum } from "./data-question.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const TODAY = "2026-10-19";

Deno.test("a donation year question is a sum, not a draft", () => {
  const donation = parseYearTypeSum("כמה תרמתי ב-2025?", TODAY);
  assert(donation?.type === "donation" && donation.measure === "sum", "donation");
  assert(donation?.year === 2025 && donation.month === null, "year");
  assert(donation?.from === "2025-01-01" && donation.to === "2025-12-31", "span");
  assert(parseYearTypeSum("how much did I spend in 2025", TODAY)?.type === "expense", "spend");
  assert(parseYearTypeSum("כמה קיבלתי ב-2024", TODAY)?.type === "income", "income");
  assert(parseYearTypeSum("קניתי מאפים ב-15 שח", TODAY) === null, "not a question");
  assert(parseYearTypeSum("כמה זה מעשר?", TODAY) === null, "no year");
});

Deno.test("this year and this month follow the supplied date", () => {
  const year = parseYearTypeSum("כמה תרמתי השנה", TODAY);
  assert(year?.from === "2026-01-01" && year.to === "2026-12-31", "this year");
  const month = parseYearTypeSum("how much did I donate this month", TODAY);
  assert(month?.from === "2026-10-01" && month.to === "2026-10-31", "this month");
  assert(month?.month === 10, "october");
});

Deno.test("how many counts transactions and a verb still sums", () => {
  const counted = parseYearTypeSum("כמה תרומות ב-2025", TODAY);
  assert(counted?.measure === "count" && counted.type === "donation", "hebrew count");
  const english = parseYearTypeSum("how many donations this year", TODAY);
  assert(english?.measure === "count" && english.from === "2026-01-01", "english count");
  assert(parseYearTypeSum("כמה תרמתי ב-2025", TODAY)?.measure === "sum", "verb stays a sum");
});
