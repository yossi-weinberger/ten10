import { getCalendarAdapter } from "../calendar/index.ts";
import { clampMaaserYearReportEnd, getCurrentMaaserYear, getMaaserYearRange } from "../calendar/maaser-year.ts";
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

Deno.test("tithe wording and last year do not change the window", () => {
  const tithe = parseYearTypeSum("כמה תרמתי למעשר בשלושת החודשים האחרונים", TODAY);
  assert(tithe?.from === "2026-07-20" && tithe.to === "2026-10-19", "maaser is not ten");
  const twelve = parseYearTypeSum("כמה תרמתי בשנים עשר החודשים האחרונים", TODAY);
  assert(twelve?.from === "2025-10-20", "twelve months");
  const previous = parseYearTypeSum("כמה תרמתי השנה שעברה", TODAY);
  assert(previous?.year === 2025 && previous.from === "2025-01-01", "last year");
  const half = parseYearTypeSum("כמה תרמתי בחצי השנה האחרונה", TODAY);
  assert(half?.from === "2026-04-20" && half.month === null, "half year");
  const lastMonth = parseYearTypeSum("כמה תרמתי בחודש האחרון", TODAY);
  assert(lastMonth?.from === "2026-09-20", "last month");
});

Deno.test("english from and a month span do not swallow the question", () => {
  const food = parseYearTypeSum("how much did I spend on food from 1.1.2025 to 31.3.2025", TODAY);
  assert(food?.topic === "food" && food.from === "2025-01-01" && food.to === "2025-03-31", "food from");
  const months = parseYearTypeSum("כמה הוצאתי מינואר עד מרץ 2025", TODAY);
  assert(months?.from === "2025-01-01" && months.to === "2025-03-31", "month names");
  assert(parseYearTypeSum("כמה תרמתי לישיבה ולבית חבד השנה", TODAY) === null, "two recipients");
  assert(parseYearTypeSum("כמה תרמתי לפינת חי השנה", TODAY)?.recipient === "פינת חי", "starts with pi");
  assert(parseYearTypeSum("כמה תרמתי לכולל השנה", TODAY)?.recipient === "כולל", "kollel");
  assert(parseYearTypeSum("כמה תרמתי לישיבה ב-3 החודשים האחרונים", TODAY)?.recipient === "ישיבה", "months do not stick");
  const march = parseYearTypeSum("כמה הוצאתי במרץ 2025", TODAY);
  assert(march?.from === "2025-03-01" && march.to === "2025-03-31", "one month");
  const foodMonths = parseYearTypeSum("כמה הוצאתי על אוכל מינואר עד מרץ 2025", TODAY);
  assert(foodMonths?.topic === "אוכל" && foodMonths.from === "2025-01-01", "food months");
  assert(parseYearTypeSum("כמה תרמתי בשנת המעשר 5786", TODAY)?.year === 5786, "named hebrew year");
  assert(parseYearTypeSum("how much did I donate to Chabad and to Mir this year", TODAY) === null, "english and");
  const twoYears = parseYearTypeSum("כמה תרמתי מינואר 2024 עד מרץ 2025", TODAY);
  assert(twoYears?.from === "2024-01-01" && twoYears.to === "2025-03-31", "span across years");
  assert(parseYearTypeSum("כמה תרמתי לישיבה בשנת המעשר", TODAY)?.recipient === "ישיבה", "name stops");
  assert(parseYearTypeSum("כמה תרמתי בשנת המעשר 2025", TODAY) === null, "numbered tithe year");
});

Deno.test("a bad date does not fall through to the whole year", () => {
  assert(parseYearTypeSum("כמה הוצאתי ב-31.2.2025", TODAY) === null, "impossible day");
  assert(parseYearTypeSum("כמה הוצאתי מ-31.3.2025 עד 1.1.2025", TODAY) === null, "reversed");
  assert(parseYearTypeSum("how much did I spend from 1/1/2025 to 3/31/2025", TODAY) === null, "american order");
});

Deno.test("previous tithe year, a full recipient, and a date stay out of the name", () => {
  const current = getMaaserYearRange(getCurrentMaaserYear(TODAY));
  const previous = getMaaserYearRange(getCurrentMaaserYear(TODAY) - 1);
  const last = parseYearTypeSum("כמה תרמתי בשנת המעשר הקודמת", TODAY);
  assert(last?.from === previous.startDate, "previous hebrew");
  assert(parseYearTypeSum("how much did I donate last maaser year", TODAY)?.from === previous.startDate, "last maaser");
  assert(parseYearTypeSum("כמה תרמתי ל-ישיבה השנה", TODAY)?.recipient === "ישיבה", "hyphen");
  assert(parseYearTypeSum("how much did I donate to the yeshiva this year", TODAY)?.recipient === "yeshiva", "the");
  assert(parseYearTypeSum("כמה תרמתי לישיבת מיר השנה", TODAY)?.recipient === "ישיבת מיר", "two words");
  assert(parseYearTypeSum("כמה תרמתי לעניים השנה", TODAY)?.recipient === null, "poor is not a name");
  assert(parseYearTypeSum("כמה תרמתי למעשר השנה", TODAY)?.recipient === null, "tithe is not a name");
  assert(parseYearTypeSum("כמה תרמתי לפי שנת המעשר", TODAY)?.from === current.startDate, "according to the year");
  const food = parseYearTypeSum("כמה הוצאתי על אוכל מ-1.1.2025 עד 31.3.2025", TODAY);
  assert(food?.topic === "אוכל" && food.from === "2025-01-01" && food.to === "2025-03-31", "topic stops");
});

Deno.test("a recipient, a tithe year, and a date span stay closed questions", () => {
  const yeshiva = parseYearTypeSum("כמה תרמתי לישיבה השנה", TODAY);
  assert(yeshiva?.recipient === "ישיבה" && yeshiva.type === "donation", "recipient");
  assert(parseYearTypeSum("כמה תרמתי לצדקה השנה", TODAY)?.recipient === null, "charity is not a recipient");
  const range = getMaaserYearRange(getCurrentMaaserYear(TODAY));
  const tithe = parseYearTypeSum("כמה תרמתי בשנת המעשר", TODAY);
  assert(tithe?.from === range.startDate && tithe.to === clampMaaserYearReportEnd(range, TODAY), "tithe year");
  const span = parseYearTypeSum("כמה הוצאתי מ-1.1.2025 עד 31.3.2025", TODAY);
  assert(span?.from === "2025-01-01" && span.to === "2025-03-31" && span.type === "expense", "custom span");
});

Deno.test("על names a category topic and a plain question does not", () => {
  const food = parseYearTypeSum("כמה הוצאתי על אוכל השנה", TODAY);
  assert(food?.topic === "אוכל" && food.type === "expense", "food");
  assert(parseYearTypeSum("כמה הוצאתי על אוכל השנה?", TODAY)?.topic === "אוכל", "question mark");
  assert(parseYearTypeSum("כמה הוצאתי על אוכל ב-2025", TODAY)?.topic === "אוכל", "year");
  assert(parseYearTypeSum("כמה הוצאתי על אוכל בשנה שעברה", TODAY)?.topic === "אוכל", "last year");
  assert(parseYearTypeSum("כמה הוצאתי על אוכל בחודש האחרון", TODAY)?.topic === "אוכל", "last month");
  const credit = parseYearTypeSum("כמה הוצאתי על אוכל באשראי השנה", TODAY);
  assert(credit?.topic === "אוכל" && credit.paymentMethod === "credit_card", "credit");
  assert(parseYearTypeSum("how much did I spend on food in 2025", TODAY)?.topic === "food", "english in");
  assert(parseYearTypeSum("כמה תרמתי השנה", TODAY)?.topic === null, "no topic");
});

Deno.test("a payment method is a whole word", () => {
  assert(parseYearTypeSum("כמה הוצאתי על ביטוח השנה", TODAY)?.paymentMethod === null, "insurance");
  assert(parseYearTypeSum("כמה הוצאתי על ביטול השנה", TODAY)?.paymentMethod === null, "cancellation");
  const debit = parseYearTypeSum("כמה הוצאתי בכרטיס דביט השנה", TODAY);
  assert(debit?.paymentMethod === "debit_card", "debit");
  assert(parseYearTypeSum("check how much I donated this year", TODAY)?.paymentMethod === null, "verb check");
  assert(parseYearTypeSum("כמה הוצאתי על בצק השנה", TODAY)?.paymentMethod === null, "dough");
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
  assert(year?.measure === "average" && year.months === 10, "hebrew average");
  const english = parseYearTypeSum("average donations this year", TODAY);
  assert(english?.measure === "average" && english.months === 10, "english average");
  assert(parseYearTypeSum("ממוצע תרומות ב-2025", TODAY)?.months === 12, "a past year stays twelve");
  const end = parseYearTypeSum("כמה תרמתי ב-1 חודשים אחרונים", "2026-03-31");
  assert(end?.from === "2026-03-01" && end.to === "2026-03-31", "month end does not overflow");
});

Deno.test("the primary calendar chooses this year and this month", () => {
  const hebrew = getCalendarAdapter("hebrew");
  const today = "2026-09-20";
  const month = parseYearTypeSum("כמה הוצאתי החודש", today, "hebrew");
  assert(month?.from === hebrew.startOfMonth(today), "hebrew month starts on its first day");
  assert(month?.to === hebrew.endOfMonth(today), "hebrew month ends on its last day");
  assert(month?.from !== "2026-09-01", "tishrei is not september");
  assert(periodLabel(month!, "hebrew") === `${month?.month}/${month?.year}`, "hebrew month label");
  const year = parseYearTypeSum("כמה הוצאתי השנה", today, "hebrew");
  assert(year?.from === hebrew.startOfYear(today), "hebrew year starts on 1 tishrei");
  assert(year?.year === hebrew.fromIsoDate(today).year, "hebrew year number");
  assert(periodLabel(year!, "hebrew") === String(year?.year), "hebrew year label");
  const civil = parseYearTypeSum("כמה הוצאתי ב-2025", today, "hebrew");
  assert(civil?.from === "2025-01-01" && civil.to === "2025-12-31", "an explicit year stays gregorian");
  const maaser = parseYearTypeSum("כמה תרמתי בשנת המעשר", today, "hebrew");
  assert(maaser?.from === getMaaserYearRange(getCurrentMaaserYear(today)).startDate, "maaser stays the tithe year");
  const gregorian = parseYearTypeSum("כמה הוצאתי החודש", today);
  assert(gregorian?.from === "2026-09-01" && gregorian.to === "2026-09-30", "gregorian month");
  const leapDay = hebrew.toIsoDate({ year: 5784, month: 7, day: 10 }, "reject");
  const leap = hebrew.fromIsoDate(leapDay);
  assert(leap.inLeapYear && leap.monthCode === "M06", "adar ii fixture");
  const adar = parseYearTypeSum("כמה הוצאתי החודש", leapDay, "hebrew");
  assert(adar?.month === leap.month && adar.from === hebrew.startOfMonth(leapDay), "adar ii");
});
