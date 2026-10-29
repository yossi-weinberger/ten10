import { readSplitResponse } from "./split-response.ts";

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const TODAY = "2026-10-19";

function row(amount: number, amountText: string, extra: Record<string, unknown> = {}) {
  return {
    description: "כולל",
    amount,
    amount_text: amountText,
    currency: "ILS",
    date_phrase: "",
    type_hint: "donation",
    ...extra,
  };
}

Deno.test("a kept item and a dropped one are both counted", () => {
  const result = readSplitResponse("50 לכולל ו־120 לישיבה", [
    row(50, "50"),
    row(120, "120", { description: "ישיבה", date_phrase: "אתמול" }),
    row(80, "80"),
  ], TODAY);
  assert(result.route === "several", "several");
  if (result.route !== "several") return;
  assert(result.found === 2, "two kept");
  assert(result.dropped === 1, "80 is not in the text");
  assert(result.items[1]?.date === "2026-10-18", "yesterday");
});

Deno.test("one written 50 still cannot become two items", () => {
  const result = readSplitResponse("50 לכולל", [row(50, "50"), row(50, "50", { description: "עוד" })], TODAY);
  assert(result.route === "several", "several");
  if (result.route !== "several") return;
  assert(result.found === 1 && result.dropped === 1, "one kept");
});

Deno.test("more than five items is a list and nothing is kept", () => {
  const result = readSplitResponse("50 לכולל", [1, 2, 3, 4, 5, 6], TODAY);
  assert(result.route === "list", "list");
});

Deno.test("a reply that keeps nothing is unreadable", () => {
  assert(readSplitResponse("50 לכולל", "not json", TODAY).route === "unreadable", "bad json");
  assert(readSplitResponse("50 לכולל", [], TODAY).route === "unreadable", "empty");
  assert(readSplitResponse("50 לכולל", [row(60, "50")], TODAY).route === "unreadable", "misread");
  const wrapped = readSplitResponse("50 לכולל", '{"items":[{"description":"כולל","amount":50,"amount_text":"50","currency":"ILS","date_phrase":"","type_hint":"donation"}]}', TODAY);
  assert(wrapped.route === "several", "wrapped json");
});
