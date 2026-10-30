import { readSplitResponse, type SplitResponse } from "./split-response.ts";

export interface SplitExpectedItem {
  description: string;
  amount: number;
  amount_text: string;
  currency: string;
  date: string | null;
  type: string;
}

export interface SplitExpected {
  route: "several" | "list";
  items: SplitExpectedItem[];
}

export interface SplitScore {
  routeOk: boolean;
  exact: boolean;
  found: number;
  missed: number;
  extra: number;
}

function key(item: { amount: number; currency: string; date: string | null; type: string }): string {
  return `${item.amount}|${item.currency}|${item.date ?? ""}|${item.type}`;
}

/** Compares one anchored reply with the expected items. Extra kept amounts are not in the expected set. */
export function scoreSplit(source: string, payload: unknown, today: string, expected: SplitExpected): SplitScore {
  const actual: SplitResponse = readSplitResponse(source, payload, today);
  if (expected.route === "list") {
    const routeOk = actual.route === "list";
    return { routeOk, exact: routeOk, found: 0, missed: routeOk ? 0 : expected.items.length, extra: 0 };
  }
  if (actual.route !== "several") {
    return { routeOk: false, exact: false, found: 0, missed: expected.items.length, extra: 0 };
  }
  const pending = expected.items.map(key);
  let extra = 0;
  let found = 0;
  for (const item of actual.items) {
    if (item.checkAmount) continue;
    if (item.amount === null || item.typeHint === "") {
      extra += 1;
      continue;
    }
    const id = key({
      amount: item.amount,
      currency: item.currency === "" ? "ILS" : item.currency,
      date: item.date,
      type: item.typeHint,
    });
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
