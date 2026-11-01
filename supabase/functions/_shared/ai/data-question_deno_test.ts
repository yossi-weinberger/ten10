import { anchoredQuestionName, nameSuggestions } from "./data-question.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

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
