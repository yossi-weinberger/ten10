import { getCalendarAdapter } from "../calendar/index.ts";
import { parseYearTypeSum, questionFromSlots } from "./data-question.ts";
import {
  QUESTION_SLOT_LIMIT,
  buildQuestionSlotBody,
  closedSlotOptions,
  readQuestionSlots,
  type QuestionSlots,
} from "./question-slots.ts";
import cases from "./fixtures/question-slot-eval-cases.json" with { type: "json" };

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const TODAY = "2026-10-19";
const LISTS = { recipients: ["ישיבה", "חב״ד"], categories: ["food", "אוכל"] };

Deno.test("a closed slot list keeps none and stops at 255", () => {
  const options = closedSlotOptions(Array.from({ length: 300 }, (_, index) => `name ${index}`));
  assert(options.length === QUESTION_SLOT_LIMIT, "cap");
  assert(options[options.length - 1] === "none", "none last");
  assert(options.filter((option) => option === "none").length === 1, "one none");
  assert(!closedSlotOptions(["", " none ", "ישיבה"]).includes(" none "), "blank dropped");
});

Deno.test("a slot choice below 0.7 is not chosen", () => {
  const body = buildQuestionSlotBody("כמה תרמתי לישיבה השנה", LISTS);
  assert(Object.keys(body.questions).length === 5, "five choices");
  assert(body.questions.payment_method.criteria.cash.includes("מזומן"), "payment label");
  const slots = readQuestionSlots({
    answers: {
      family: { choice: "donation", confidence: 0.69 },
      measure: { choice: "sum", confidence: 0.7 },
      recipient: { choice: "ישיבה", confidence: 0.91 },
      category: { choice: "none", confidence: 1 },
      payment_method: { choice: "cash", confidence: 0.4 },
    },
  }, LISTS);
  assert(slots?.family === null, "family below the floor");
  assert(slots?.measure === "sum", "measure at the floor");
  assert(slots?.recipient === "ישיבה", "recipient");
  assert(slots?.category === null, "none");
  assert(slots?.paymentMethod === null, "payment below the floor");
  assert(readQuestionSlots({ answers: { recipient: { choice: "missing", confidence: 1 } } }, LISTS)?.recipient === null, "unknown name");
  assert(readQuestionSlots({}, LISTS) === null, "no answer");
});

Deno.test("missing Jev slots use the word parser, and mirrored slots keep the same question", () => {
  for (const item of cases) {
    const calendar = item.calendar === "hebrew" ? "hebrew" : "gregorian";
    const parsed = parseYearTypeSum(item.text, item.today, calendar);
    const fallback = questionFromSlots(item.text, item.today, calendar, null);
    assert(JSON.stringify(parsed) === JSON.stringify(item.expected), `${item.id} parser`);
    assert(JSON.stringify(fallback) === JSON.stringify(item.expected), `${item.id} fallback`);
    if (!parsed) continue;
    const slots: QuestionSlots = {
      family: parsed.type,
      measure: parsed.measure,
      recipient: parsed.recipient,
      category: parsed.topic,
      paymentMethod: parsed.paymentMethod,
    };
    const composed = questionFromSlots(item.text, item.today, calendar, slots);
    assert(JSON.stringify(composed) === JSON.stringify(parsed), `${item.id} slots`);
  }
});

Deno.test("a date question without a confident family asks instead of guessing", () => {
  const slots: QuestionSlots = {
    family: null,
    measure: "sum",
    recipient: null,
    category: null,
    paymentMethod: null,
  };
  assert(questionFromSlots("כמה תרמתי ב-2025?", TODAY, "gregorian", slots) === "ask_family", "ask");
  const unnamed: QuestionSlots = {
    family: "donation",
    measure: "sum",
    recipient: null,
    category: "gift",
    paymentMethod: null,
  };
  const yeshiva = questionFromSlots("כמה תרמתי לישיבה השנה?", TODAY, "gregorian", unnamed);
  assert(yeshiva !== "ask_family" && yeshiva?.recipient === "ישיבה" && yeshiva.topic === null, "unsaved recipient");
  const chabad = questionFromSlots("how much did I donate to Chabad this year?", TODAY, "gregorian", unnamed);
  assert(chabad !== "ask_family" && chabad?.recipient === "chabad" && chabad.topic === null, "chabad is not a category");
  const saved: QuestionSlots = { ...unnamed, recipient: "חב״ד", category: null };
  const kept = questionFromSlots("כמה תרמתי לישיבה השנה?", TODAY, "gregorian", saved);
  assert(kept !== "ask_family" && kept?.recipient === "חב״ד", "a chosen recipient stays");
  const mortgage = questionFromSlots("כמה הוצאתי על משכנתא השנה?", TODAY, "gregorian", {
    family: "expense",
    measure: "sum",
    recipient: null,
    category: null,
    paymentMethod: null,
  });
  assert(mortgage !== "ask_family" && mortgage?.topic === "משכנתא", "unsaved category");
  assert(questionFromSlots("כמה תרמתי לישיבה ולבית חבד השנה", TODAY, "gregorian", unnamed) === null, "two names");
  assert(questionFromSlots("כמה זה מעשר?", TODAY, "gregorian", slots) === null, "no date");
  const hebrew = getCalendarAdapter("hebrew");
  const leap = hebrew.toIsoDate({ year: 5784, month: 7, day: 10 }, "reject");
  const adar = questionFromSlots("כמה הוצאתי החודש", leap, "hebrew", null);
  assert(adar !== null && adar !== "ask_family" && adar.month === 7, "adar ii still a date");
});
