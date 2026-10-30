import { scoreSplit } from "./split-score.ts";

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

const today = "2026-10-29";
const source = "50 לכולל ו־120 לישיבה";

Deno.test("an anchored pair matches and an invented amount does not", () => {
  const good = scoreSplit(source, {
    items: [
      { description: "כולל", amount: 50, amount_text: "50", currency: "ILS", date_phrase: "", type_hint: "donation" },
      { description: "ישיבה", amount: 120, amount_text: "120", currency: "ILS", date_phrase: "", type_hint: "donation" },
    ],
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
    items: [
      { description: "כולל", amount: 50, amount_text: "50", currency: "ILS", date_phrase: "", type_hint: "donation" },
      { description: "אחר", amount: 80, amount_text: "80", currency: "ILS", date_phrase: "", type_hint: "expense" },
    ],
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
  const items = [1, 2, 3, 4, 5, 6].map((amount) => ({
    description: "x",
    amount,
    amount_text: String(amount),
    currency: "ILS",
    date_phrase: "",
    type_hint: "expense",
  }));
  const score = scoreSplit("1 2 3 4 5 6", { items }, today, { route: "list", items: [] });
  assert(score.routeOk && score.exact, "list");
});
