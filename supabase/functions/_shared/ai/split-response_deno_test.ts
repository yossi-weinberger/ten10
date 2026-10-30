import { readSplitResponse } from "./split-response.ts";
import type { SplitItemInput } from "./split-schema.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const TODAY = "2026-10-19";

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

Deno.test("a kept item and a dropped one are both counted", () => {
  const result = readSplitResponse("50 לכולל ו־120 לישיבה אתמול", {
    items: [
      row(50, "50"),
      row(120, "120", {
        description: "ישיבה",
        date_text: "אתמול",
        date: { kind: "days_ago", n: 1, weekday: null, day: null, month: null, year: null },
      }),
      row(80, "80"),
    ],
  }, TODAY);
  assert(result.route === "several", "several");
  if (result.route !== "several") return;
  assert(result.found === 2, "two kept");
  assert(result.dropped === 1, "80 is not in the text");
  assert(result.items[1]?.date === "2026-10-18", "yesterday");
});

Deno.test("one written 50 still cannot become two items", () => {
  const result = readSplitResponse("50 לכולל", { items: [row(50, "50"), row(50, "50", { description: "עוד" })] }, TODAY);
  assert(result.route === "several", "several");
  if (result.route !== "several") return;
  assert(result.found === 1 && result.dropped === 1, "one kept");
});

Deno.test("more than five items is a list and nothing is kept", () => {
  const result = readSplitResponse("50 לכולל", { items: [1, 2, 3, 4, 5, 6].map((amount) => row(amount, String(amount))) }, TODAY);
  assert(result.route === "list", "list");
});

Deno.test("a reply that keeps nothing is unreadable, and one misread amount is asked", () => {
  assert(readSplitResponse("50 לכולל", "not json", TODAY).route === "unreadable", "bad json");
  assert(readSplitResponse("50 לכולל", { items: [] }, TODAY).route === "unreadable", "empty");
  const misread = readSplitResponse("50 לכולל", { items: [row(60, "50")] }, TODAY);
  assert(misread.route === "several", "asked");
  if (misread.route !== "several") return;
  assert(misread.items[0]?.amount === null, "amount cleared");
  const wrapped = readSplitResponse("50 לכולל", JSON.stringify({ items: [row(50, "50")] }), TODAY);
  assert(wrapped.route === "several", "wrapped json");
});
