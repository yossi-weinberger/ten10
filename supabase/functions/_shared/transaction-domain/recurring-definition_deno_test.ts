import { buildRecurringDefinition } from "./recurring-definition.ts";

function assertEquals(actual: unknown, expected: unknown, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${message}: ${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

const BASE = {
  start_date: "2026-10-28",
  amount: 200,
  currency: "ILS",
  type: "donation",
} as const;

Deno.test("defaults to monthly gregorian on the start day", () => {
  const definition = buildRecurringDefinition(BASE);
  assertEquals(
    [definition.frequency, definition.calendar_type, definition.day_of_month, definition.next_due_date],
    ["monthly", "gregorian", 28, "2026-10-28"],
    "defaults",
  );
  assertEquals(definition.anchor_month_code, null, "no anchor when not yearly");
});

Deno.test("hebrew without a day keeps the Gregorian day number, like the form", () => {
  const definition = buildRecurringDefinition({ ...BASE, calendar_type: "hebrew" });
  assertEquals([definition.day_of_month, definition.next_due_date], [28, "2026-11-08"], "28 Cheshvan");
});

Deno.test("yearly anchors the month of the start date in the chosen calendar", () => {
  assertEquals(
    buildRecurringDefinition({ ...BASE, frequency: "yearly", calendar_type: "hebrew", day_of_month: 20 })
      .anchor_month_code,
    "M02",
    "Cheshvan",
  );
  assertEquals(
    buildRecurringDefinition({ ...BASE, frequency: "yearly" }).anchor_month_code,
    "M10",
    "October",
  );
});

Deno.test("nulls become absent values", () => {
  const definition = buildRecurringDefinition({
    ...BASE,
    description: null,
    category: null,
    recipient: null,
    payment_method: null,
    original_currency: null,
  });
  for (const key of ["description", "category", "recipient", "payment_method", "original_currency"] as const) {
    if (definition[key] !== undefined) throw new Error(`${key} should be undefined`);
  }
});
