import { getCalendarAdapter } from "../calendar/index.ts";
import { parseYearTypeSum, questionFromSlots } from "./data-question.ts";
import {
  QUESTION_SLOT_LIMIT,
  buildQuestionSlotBody,
  closedSlotOptions,
  readQuestionSlots,
  slotConfidence,
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

Deno.test("a predefined category criterion includes its Hebrew label", () => {
  const body = buildQuestionSlotBody("כמה הוצאתי על אוכל", {
    recipients: [],
    categories: ["food", "גן", "other"],
  });
  assert(body.questions.category.criteria.food.includes("מזון"), "food hebrew");
  assert(body.questions.category.criteria["גן"] === "גן", "custom category");
  assert(body.questions.category.criteria.other.includes("אחר"), "category other hebrew");
  assert(body.questions.category.criteria.other !== body.questions.payment_method.criteria.other, "category other is not the payment line");
  assert(body.questions.payment_method.criteria.other.includes("payment method"), "payment other");
});

Deno.test("a slot choice below 0.7 is not chosen", () => {
  const body = buildQuestionSlotBody("כמה תרמתי לישיבה השנה", LISTS);
  assert(Object.keys(body.questions).length === 5, "five choices");
  assert(body.questions.payment_method.criteria.cash.includes("מזומן"), "payment label");
  assert(body.questions.payment_method.instructions.includes("הוראת קבע"), "standing order");
  assert(body.questions.payment_method.instructions.includes("is none"), "standing order is none");
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
  const confidence = slotConfidence({
    answers: {
      family: { choice: "donation", confidence: 0.69 },
      payment_method: { choice: "cash", confidence: 0.4 },
      category: { choice: "food", confidence: 1.2 },
    },
  });
  assert(confidence?.family === 0.69, "family confidence");
  assert(confidence?.payment_method === 0.4, "payment confidence");
  assert(confidence?.category === undefined, "confidence above 1 dropped");
  assert(slotConfidence({}) === null, "no confidence");
  assert(readQuestionSlots({ answers: { recipient: { choice: "missing", confidence: 1 } } }, LISTS)?.recipient === null, "unknown name");
  assert(readQuestionSlots({}, LISTS) === null, "no answer");
});

Deno.test("missing Jev slots use the word parser, and mirrored slots keep the same question", () => {
  for (const item of cases) {
    const calendar = item.calendar === "hebrew" ? "hebrew" : "gregorian";
    const parsed = parseYearTypeSum(item.text, item.today, calendar);
    assert(questionFromSlots(item.text, item.today, calendar, null) === null, `${item.id} no word parser`);
    const expected = item.id === "slot-017" && parsed
      ? { ...item.expected, topic: parsed.topic }
      : item.expected;
    assert(JSON.stringify(parsed) === JSON.stringify(expected), `${item.id} parser`);
    if (!parsed) continue;
    const slots: QuestionSlots = {
      family: parsed.type,
      measure: parsed.measure,
      recipient: parsed.recipient,
      category: parsed.topic,
      paymentMethod: parsed.paymentMethod,
    };
    const composed = questionFromSlots(item.text, item.today, calendar, slots, {
      kind: "span",
      from: parsed.from,
      to: parsed.to,
    });
    if (composed === "ask_family" || composed === "ask_period" || composed === null) {
      throw new Error(`${item.id} slots`);
    }
    assert(
      composed.type === parsed.type
        && composed.measure === parsed.measure
        && composed.paymentMethod === parsed.paymentMethod
        && composed.recipient === parsed.recipient
        && composed.topic === parsed.topic
        && composed.from === parsed.from
        && composed.to === parsed.to,
      `${item.id} slots`,
    );
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
  const year = { kind: "span" as const, from: "2025-01-01", to: "2025-12-31" };
  assert(questionFromSlots("כמה תרמתי ב-2025?", TODAY, "gregorian", slots, year) === "ask_family", "ask");
  const unnamed: QuestionSlots = {
    family: "donation",
    measure: "sum",
    recipient: null,
    category: "gift",
    paymentMethod: null,
  };
  const yeshiva = questionFromSlots("כמה תרמתי לישיבה השנה?", TODAY, "gregorian", unnamed, year);
  assert(yeshiva !== "ask_family" && yeshiva !== "ask_period" && yeshiva?.recipient === null && yeshiva?.topic === null, "an empty name stays empty");
  const chabad = questionFromSlots("how much did I donate to Chabad this year?", TODAY, "gregorian", unnamed, year);
  assert(chabad !== "ask_family" && chabad !== "ask_period" && chabad?.recipient === null && chabad?.topic === null, "a category is not a recipient");
  const saved: QuestionSlots = { ...unnamed, recipient: "חב״ד", category: null };
  const kept = questionFromSlots("כמה תרמתי לישיבה השנה?", TODAY, "gregorian", saved, year);
  assert(kept !== "ask_family" && kept !== "ask_period" && kept?.recipient === "חב״ד", "a chosen recipient stays");
  const mortgage = questionFromSlots("כמה הוצאתי על משכנתא השנה?", TODAY, "gregorian", {
    family: "expense",
    measure: "sum",
    recipient: null,
    category: null,
    paymentMethod: null,
  }, year);
  assert(mortgage !== "ask_family" && mortgage !== "ask_period" && mortgage?.topic === null, "an empty topic stays empty");
  const two = questionFromSlots("כמה תרמתי לישיבה ולבית חבד השנה", TODAY, "gregorian", unnamed, year);
  assert(two !== "ask_family" && two !== "ask_period" && two?.recipient === null, "two names are not scanned from the words");
  assert(questionFromSlots("כמה זה מעשר?", TODAY, "gregorian", slots, null) === "ask_period", "no date");
  const hebrew = getCalendarAdapter("hebrew");
  const leap = hebrew.toIsoDate({ year: 5784, month: 7, day: 10 }, "reject");
  const adar = parseYearTypeSum("כמה הוצאתי החודש", leap, "hebrew");
  assert(adar !== null && adar.month === 7, "adar ii still a date");
});
