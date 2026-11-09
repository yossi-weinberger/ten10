import { anchoredQuestionName, nameSuggestions, questionFromSlots } from "./data-question.ts";
import { periodBounds } from "./split-period.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

Deno.test("an average divides by the months that passed", () => {
  const today = "2026-11-03";
  const slots = { family: "expense", measure: "average", recipient: null, category: null, paymentMethod: null } as const;
  const monthsOf = (from: string, to: string, calendar: "gregorian" | "hebrew") => {
    const question = questionFromSlots("", today, calendar, slots, { kind: "span", from, to });
    return typeof question === "object" && question ? question.months : null;
  };
  for (const calendar of ["gregorian", "hebrew"] as const) {
    const last3 = periodBounds({ kind: "last_n_months", n: 3, calendar }, today);
    assert(monthsOf(last3!.from!, last3!.to!, calendar) === 3, `last 3 months is 3 on the ${calendar} calendar`);
  }
  assert(monthsOf("2026-01-01", "2026-12-31", "gregorian") === 10, "this year asked in November counts to today");
  assert(monthsOf("2026-10-01", "2026-10-31", "gregorian") === 1, "one month");
});

Deno.test("a spoken name is kept only when it appears in the question", () => {
  const question = "תרמתי 50 לבית כנסת וכמה תרמתי השנה?";
  assert(anchoredQuestionName(question, "בית כנסת", []) === "בית כנסת", "the short name appears");
  assert(anchoredQuestionName(question, null, ["בית כנסת"]) === null, "nothing said");
  assert(anchoredQuestionName(question, "ישיבה", ["ישיבה"]) === null, "a name that was not said");
  assert(anchoredQuestionName("כמה תרמתי לישיבה השנה?", "ישיבה", ["ישיבה", "חב״ד"]) === "ישיבה", "one list hit");
  assert(anchoredQuestionName("כמה תרמתי לישיבה השנה?", "לישיבה", ["ישיבה"]) === "ישיבה", "prefix drops onto one saved name");
  assert(anchoredQuestionName("כמה תרמתי ללקט ישראל?", "לקט ישראל", []) === "לקט ישראל", "an empty list does not strip");
  assert(anchoredQuestionName("כמה תרמתי ללקט ישראל?", "לקט ישראל", ["לקט ישראל"]) === "לקט ישראל", "the full saved name stays");
  assert(anchoredQuestionName("כמה תרמתי לבית חב״ד?", "בית חב״ד", ["בית חב״ד רעננה"]) === "בית חב״ד", "a longer saved name is not chosen");
  assert(nameSuggestions("בית חב״ד", ["בית חב״ד רעננה"]).join(",") === "בית חב״ד רעננה", "one longer name is a button");
  assert(anchoredQuestionName("כמה תרמתי לכולל?", "כולל", ["כולל בוקר", "כולל אברכים"]) === "כולל", "two longer names stay spoken");
  assert(nameSuggestions("כולל", ["כולל בוקר", "כולל אברכים"]).join(",") === "כולל בוקר,כולל אברכים", "two buttons");
  assert(nameSuggestions("ישיבה", ["ישיבה קטנה", "ישיבת נחלת"]).join(",") === "ישיבה קטנה", "only the name that contains the word");
  assert(nameSuggestions("בבריכה", ["מנוי לבריכה"]).join(",") === "מנוי לבריכה", "one prefix letter is only a suggestion");
  assert(anchoredQuestionName("כמה הוצאתי בבריכה הקיץ?", "בבריכה", ["מנוי לבריכה"]) === "בבריכה", "a prefix letter is not chosen");
});
