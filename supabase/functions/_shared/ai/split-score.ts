import { readSplitResponse, type SplitResponse } from "./split-response.ts";

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
