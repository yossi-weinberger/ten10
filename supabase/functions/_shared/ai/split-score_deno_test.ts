import { scoreSplit, scoreSplitFields } from "./split-score.ts";
import type { SplitItemInput } from "./split-schema.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const today = "2026-10-29";
const source = "50 לכולל ו־120 לישיבה";

function row(amount: number, amountText: string, extra: Partial<SplitItemInput> = {}): SplitItemInput {
  return {
    description: "כולל",
    amount,
    amount_text: amountText,
    currency: "ILS",
    requested_rate: null,
    date: null,
    date_text: null,
    type: "donation",
    type_question: null,
    recurrence: null,
    payment_method: null,
    category: null,
    rule_id: null,
    ...extra,
  };
}

Deno.test("an anchored pair matches and an invented amount does not", () => {
  const good = scoreSplit(source, {
    items: [row(50, "50"), row(120, "120", { description: "ישיבה" })],
  }, today, {
    route: "several",
    items: [
      { description: "כולל", amount: 50, amount_text: "50", currency: "ILS", date: today, type: "donation" },
      { description: "ישיבה", amount: 120, amount_text: "120", currency: "ILS", date: today, type: "donation" },
    ],
  });
  assert(good.exact, "exact");
  assert(good.extra === 0, "no extra");

  const invented = scoreSplit(source, {
    items: [row(50, "50"), row(80, "80", { description: "אחר", type: "expense" })],
  }, today, {
    route: "several",
    items: [
      { description: "כולל", amount: 50, amount_text: "50", currency: "ILS", date: today, type: "donation" },
    ],
  });
  assert(invented.extra === 0, "80 is dropped by the anchor");
  assert(invented.found === 1, "50 kept");
});

Deno.test("an asked amount matches a null amount and ignores a word amount", () => {
  const asked = scoreSplit("קניתי לחם", {
    items: [row(0, "", { amount: null, amount_text: null, type: "expense" })],
  }, today, {
    route: "several",
    ask: "amount",
    items: [{
      description: "לחם",
      amount: null,
      amount_text: null,
      currency: "ILS",
      date: today,
      type: "expense",
    }],
  });
  assert(asked.exact, "null amount is the question");
  const words = scoreSplit("שילמתי בסופר באשראי", {
    items: [row(250, "בסופר", { type: "expense" })],
  }, today, {
    route: "several",
    ask: "amount",
    items: [],
  });
  assert(words.exact, "a digit-less amount is not an anchored hit");
});
Deno.test("a clear sentence is scored per field, and an asked sentence is not", () => {
  const clear = scoreSplitFields("קניתי 2 מחברות ב־40 שקל", {
    items: [row(2, "2", { description: "מחברות", type: "expense" })],
  }, today, {
    route: "several",
    ask: null,
    items: [{
      description: "מחברות",
      amount: 40,
      amount_text: "40",
      currency: "ILS",
      date: today,
      type: "expense",
    }],
  });
  assert(clear.clear, "clear");
  assert(clear.amountChecked === 1 && clear.amountCorrect === 0, "amount missed");
  assert(clear.wrongAnchoredAmount, "2 is a wrong anchored amount");
  assert(clear.specialTypeUnasked === false, "expense is not special");

  const special = scoreSplitFields("קניתי לחם ב־10", {
    items: [row(10, "10", { description: "לחם", type: "exempt-income", type_question: "exempt-income" })],
  }, today, {
    route: "several",
    items: [{
      description: "לחם",
      amount: 10,
      amount_text: "10",
      currency: "ILS",
      date: today,
      type: "expense",
    }],
  });
  assert(special.specialTypeUnasked === false, "the special type is not filled in");
  assert(special.specialQuestionWrong, "a filled special type is asked, not saved");

  const gift = scoreSplitFields("קיבלתי 400 מתנה", {
    items: [row(400, "400", { description: "מתנה", type: "income", type_question: "exempt-income" })],
  }, today, {
    route: "several",
    ask: null,
    items: [{
      description: "מתנה",
      amount: 400,
      amount_text: "400",
      currency: "ILS",
      date: today,
      type: "income",
      type_question: "exempt-income",
    }],
  });
  assert(gift.amountCorrect === 1 && gift.typeCorrect === 1 && gift.dateCorrect === 1, "gift fields");
  assert(gift.specialQuestionWrong === false && gift.specialTypeUnasked === false, "the gift question is allowed");

  const unread = scoreSplitFields("קניתי לחם ב־10", "not json", today, {
    route: "several",
    items: [{
      description: "לחם",
      amount: 10,
      amount_text: "10",
      currency: "ILS",
      date: today,
      type: "expense",
    }],
  });
  assert(unread.route === "unreadable" && unread.parsed === false, "unparsed");
  assert(unread.amountChecked === 1 && unread.amountCorrect === 0, "unparsed amount counts");
  assert(unread.unnecessaryQuestion === false, "unparsed is not a question");

  const asked = scoreSplitFields("קניתי לחם", {
    items: [row(0, "", { amount: null, amount_text: null, type: "expense" })],
  }, today, {
    route: "several",
    ask: "amount",
    items: [{
      description: "לחם",
      amount: null,
      amount_text: null,
      currency: "ILS",
      date: today,
      type: "expense",
    }],
  });
  assert(asked.clear === false && asked.amountChecked === 0, "an asked sentence is outside the field rate");

  const words = scoreSplitFields("קניתי תפוחים בשלושים שקל", {
    items: [row(30, "שלושים", { description: "תפוחים", type: "expense" })],
  }, today, {
    route: "several",
    ask: null,
    items: [{
      description: "תפוחים",
      amount: 30,
      amount_text: "שלושים",
      currency: "ILS",
      date: today,
      type: "expense",
    }],
  });
  assert(words.amountCorrect === 1 && words.checkAmounts === 1, "a correct word amount counts, and is reported");
});

Deno.test("more than five items is a list", () => {
  const items = [1, 2, 3, 4, 5, 6].map((amount) => row(amount, String(amount), { type: "expense" }));
  const score = scoreSplit("1 2 3 4 5 6", { items }, today, { route: "list", items: [] });
  assert(score.routeOk && score.exact, "list");
});
