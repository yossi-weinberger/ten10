import { parseYearTypeSum, periodLabel } from "./data-question.ts";

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

Deno.test("last N months is a rolling window from the supplied date", () => {
  const hebrew = parseYearTypeSum("כמה תרמתי ב-3 חודשים אחרונים", TODAY);
  assert(hebrew?.from === "2026-07-20" && hebrew.to === "2026-10-19", "three months");
  assert(periodLabel(hebrew!) === "20.7.2026–19.10.2026", "label");
  const english = parseYearTypeSum("how many expenses in the last 2 months", TODAY);
  assert(english?.measure === "count" && english.type === "expense", "count expenses");
  assert(english?.from === "2026-08-20", "two months");
  assert(parseYearTypeSum("כמה תרמתי ב-0 חודשים אחרונים", TODAY) === null, "zero");
});

Deno.test("a giving verb stays a sum, and החודש is not החודשים", () => {
  assert(parseYearTypeSum("כמה נתתי לצדקה השנה", TODAY)?.measure === "sum", "gave charity");
  assert(parseYearTypeSum("כמה נתתי צדקה ב-2025", TODAY)?.measure === "sum", "gave in 2025");
  assert(parseYearTypeSum("כמה הכנסתי השנה", TODAY)?.measure === "sum", "income verb");
  assert(parseYearTypeSum("כמה יצא לי על הוצאות השנה", TODAY)?.measure === "sum", "spent");
  const definite = parseYearTypeSum("כמה תרמתי ב-3 החודשים האחרונים", TODAY);
  assert(definite?.from === "2026-07-20" && definite.month === null, "definite months");
  const words = parseYearTypeSum("כמה תרמתי בשלושת החודשים האחרונים", TODAY);
  assert(words?.from === "2026-07-20", "three in words");
  assert(parseYearTypeSum("כמה תרמתי החודש", TODAY)?.month === 10, "this month");
});

Deno.test("a payment method narrows the question, and two methods do not", () => {
  const credit = parseYearTypeSum("כמה הוצאתי באשראי השנה", TODAY);
  assert(credit?.paymentMethod === "credit_card" && credit.measure === "sum" && credit.type === "expense", "credit");
  const cash = parseYearTypeSum("how much cash did I donate this year", TODAY);
  assert(cash?.paymentMethod === "cash" && cash.type === "donation", "cash");
  assert(parseYearTypeSum("כמה תרמתי השנה", TODAY)?.paymentMethod === null, "no method");
  assert(parseYearTypeSum("כמה הוצאתי במזומן ובאשראי השנה", TODAY) === null, "two methods");
});

Deno.test("the largest saved transaction is a max, and a plain total stays a sum", () => {
  const hebrew = parseYearTypeSum("מה התרומה הכי גדולה השנה", TODAY);
  assert(hebrew?.measure === "max" && hebrew.type === "donation" && hebrew.year === 2026, "hebrew max");
  const english = parseYearTypeSum("largest expense this year", TODAY);
  assert(english?.measure === "max" && english.type === "expense", "english max");
  assert(parseYearTypeSum("כמה תרמתי השנה", TODAY)?.measure === "sum", "sum stays a sum");
});

Deno.test("a monthly average divides the saved total by the months in the window", () => {
  const year = parseYearTypeSum("ממוצע תרומות השנה", TODAY);
  assert(year?.measure === "average" && year.months === 12, "hebrew average");
  const english = parseYearTypeSum("average donations this year", TODAY);
  assert(english?.measure === "average" && english.months === 12, "english average");
  const end = parseYearTypeSum("כמה תרמתי ב-1 חודשים אחרונים", "2026-03-31");
  assert(end?.from === "2026-03-01" && end.to === "2026-03-31", "month end does not overflow");
});
