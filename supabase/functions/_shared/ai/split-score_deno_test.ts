import { scoreSplit } from "./split-score.ts";
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

Deno.test("more than five items is a list", () => {
  const items = [1, 2, 3, 4, 5, 6].map((amount) => row(amount, String(amount), { type: "expense" }));
  const score = scoreSplit("1 2 3 4 5 6", { items }, today, { route: "list", items: [] });
  assert(score.routeOk && score.exact, "list");
});
