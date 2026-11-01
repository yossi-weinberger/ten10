import { readSplitResponse, parseSplitPayload, type SplitResponse } from "./split-response.ts";

export interface SplitExpectedItem {
  description: string;
  amount: number | null;
  amount_text: string | null;
  currency: string;
  date: string | null;
  type: string | null;
  type_question?: string | null;
  payment_method?: string | null;
}

export interface SplitExpected {
  route: "several" | "list";
  ask?: "amount" | "type" | null;
  items: SplitExpectedItem[];
}

export interface SplitScore {
  routeOk: boolean;
  exact: boolean;
  found: number;
  missed: number;
  extra: number;
}

function key(
  item: {
    amount: number | null;
    currency: string;
    date: string | null;
    type: string | null;
    typeQuestion?: string | null;
    paymentMethod?: string | null;
  },
  care: { question: boolean; payment: boolean },
): string {
  const parts = [item.amount ?? "", item.currency, item.date ?? "", item.type ?? ""];
  if (care.question) parts.push(item.typeQuestion ?? "");
  if (care.payment) parts.push(item.paymentMethod ?? "");
  return parts.join("|");
}

/** Compares one anchored reply with the expected items. A digit-less amount is not anchored. */
export function scoreSplit(source: string, payload: unknown, today: string, expected: SplitExpected): SplitScore {
  const actual: SplitResponse = readSplitResponse(source, payload, today);
  if (expected.route === "list") {
    const routeOk = actual.route === "list";
    return { routeOk, exact: routeOk, found: 0, missed: routeOk ? 0 : expected.items.length, extra: 0 };
  }
  if (actual.route !== "several") {
    return { routeOk: false, exact: false, found: 0, missed: Math.max(expected.items.length, 1), extra: 0 };
  }
  if (expected.ask === "amount" && expected.items.length === 0) {
    const anchored = actual.items.filter((item) => item.amount !== null && !item.checkAmount);
    return { routeOk: true, exact: anchored.length === 0, found: 0, missed: anchored.length === 0 ? 0 : 1, extra: anchored.length };
  }
  const care = {
    question: expected.items.some((item) => item.type_question !== undefined),
    payment: expected.items.some((item) => item.payment_method !== undefined),
  };
  const pending = expected.items.map((item) => key({
    amount: item.amount,
    currency: item.currency,
    date: item.date,
    type: item.type,
    typeQuestion: item.type_question,
    paymentMethod: item.payment_method,
  }, care));
  let extra = 0;
  let found = 0;
  for (const item of actual.items) {
    const id = key({
      amount: item.amount,
      currency: item.currency === "" ? "ILS" : item.currency,
      date: item.date,
      type: item.typeHint === "" ? null : item.typeHint,
      typeQuestion: item.typeQuestion,
      paymentMethod: item.paymentMethod,
    }, care);
    if (item.checkAmount) {
      const at = pending.indexOf(id);
      if (at >= 0) {
        pending.splice(at, 1);
        found += 1;
      }
      continue;
    }
    const at = pending.indexOf(id);
    if (at < 0) extra += 1;
    else {
      pending.splice(at, 1);
      found += 1;
    }
  }
  return {
    routeOk: true,
    exact: extra === 0 && pending.length === 0,
    found,
    missed: pending.length,
    extra,
  };
}

const SPECIAL_TYPES = new Set(["exempt-income", "recognized-expense", "non_tithe_donation"]);

export interface SplitFieldScore {
  route: SplitResponse["route"];
  parsed: boolean;
  clear: boolean;
  amountChecked: number;
  amountCorrect: number;
  wrongAnchoredAmount: boolean;
  typeChecked: number;
  typeCorrect: number;
  specialTypeUnasked: boolean;
  dateChecked: number;
  dateCorrect: number;
  unnecessaryQuestion: boolean;
  specialQuestionWrong: boolean;
  checkAmounts: number;
  specialAsked: number;
}

function emptyFields(route: SplitResponse["route"], parsed: boolean, clear: boolean): SplitFieldScore {
  return {
    route,
    parsed,
    clear,
    amountChecked: 0,
    amountCorrect: 0,
    wrongAnchoredAmount: false,
    typeChecked: 0,
    typeCorrect: 0,
    specialTypeUnasked: false,
    dateChecked: 0,
    dateCorrect: 0,
    unnecessaryQuestion: false,
    specialQuestionWrong: false,
    checkAmounts: 0,
    specialAsked: 0,
  };
}

/**
 * Field rates are only for a clear sentence (`ask` null, route several).
 * An exact sentence is a separate report, not this score.
 * A special type counts only when that item's expected type is the same special type.
 * A special-type question counts only when the expected item asks it.
 */
export function scoreSplitFields(
  source: string,
  payload: unknown,
  today: string,
  expected: SplitExpected,
): SplitFieldScore {
  const parsed = parseSplitPayload(payload) !== null;
  const actual = readSplitResponse(source, payload, today);
  const clear = expected.route === "several" && expected.ask == null;
  const score = emptyFields(actual.route, parsed, clear);
  if (!clear) return score;
  if (actual.route !== "several") {
    for (const wanted of expected.items) {
      if (wanted.amount !== null) score.amountChecked += 1;
      if (wanted.type !== null) score.typeChecked += 1;
      if (wanted.date !== null) score.dateChecked += 1;
    }
    return score;
  }
  const expectedAmounts = new Set(
    expected.items.flatMap((item) => item.amount === null ? [] : [item.amount]),
  );
  for (const item of actual.items) {
    if (!item.checkAmount && item.amount !== null && !expectedAmounts.has(item.amount)) {
      score.wrongAnchoredAmount = true;
    }
  }
  score.checkAmounts = actual.items.filter((item) => item.checkAmount).length;
  const used = new Set<number>();
  let asked = false;
  for (const wanted of expected.items) {
    let match = wanted.amount === null
      ? -1
      : actual.items.findIndex((item, index) => !used.has(index) && item.amount === wanted.amount);
    if (match < 0) match = actual.items.findIndex((_, index) => !used.has(index));
    const got = match >= 0 ? actual.items[match] : null;
    if (match >= 0) used.add(match);
    if (wanted.amount !== null) {
      score.amountChecked += 1;
      if (got && got.amount === wanted.amount) score.amountCorrect += 1;
      else if (!got || got.amount === null) asked = true;
    }
    const type = got && got.typeHint !== "" ? got.typeHint : null;
    const expectedSpecial = wanted.type !== null && SPECIAL_TYPES.has(wanted.type)
      ? wanted.type
      : wanted.type_question !== undefined && wanted.type_question !== null && SPECIAL_TYPES.has(wanted.type_question)
        ? wanted.type_question
        : null;
    const baseOf = expectedSpecial === "exempt-income"
      ? "income"
      : expectedSpecial === "recognized-expense"
        ? "expense"
        : expectedSpecial === "non_tithe_donation"
          ? "donation"
          : null;
    const specialAsked = expectedSpecial !== null && baseOf !== null
      && got?.typeQuestion === expectedSpecial
      && type === baseOf;
    if (specialAsked) score.specialAsked += 1;
    if (wanted.type !== null) {
      score.typeChecked += 1;
      if (type === wanted.type || specialAsked) score.typeCorrect += 1;
      else if (type === null) asked = true;
    }
    if (type && SPECIAL_TYPES.has(type) && type !== wanted.type) score.specialTypeUnasked = true;
    if (wanted.date !== null) {
      score.dateChecked += 1;
      if (got && got.date === wanted.date && !got.checkDate) score.dateCorrect += 1;
    }
    const expectedQuestion = wanted.type_question ?? null;
    if (!specialAsked && got?.typeQuestion && got.typeQuestion !== expectedQuestion) {
      score.specialQuestionWrong = true;
      asked = true;
    }
  }
  score.unnecessaryQuestion = asked;
  return score;
}
