import { parseYearTypeSum } from "./data-question.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("a donation year question is a sum, not a draft", () => {
  assert(parseYearTypeSum("כמה תרמתי ב-2025?")?.type === "donation", "donation");
  assert(parseYearTypeSum("כמה תרמתי ב-2025?")?.year === 2025, "year");
  assert(parseYearTypeSum("how much did I spend in 2025")?.type === "expense", "spend");
  assert(parseYearTypeSum("כמה קיבלתי ב-2024")?.type === "income", "income");
  assert(parseYearTypeSum("קניתי מאפים ב-15 שח") === null, "not a question");
  assert(parseYearTypeSum("כמה זה מעשר?") === null, "no year");
});
