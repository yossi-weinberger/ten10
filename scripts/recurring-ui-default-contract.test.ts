import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const transactionForm = readFileSync(
  new URL("../src/components/forms/TransactionForm.tsx", import.meta.url),
  "utf8",
);

describe("new recurring calendar default", () => {
  it("takes the default from global calendar settings and resets to it", () => {
    expect(transactionForm).toMatch(
      /defaultRecurringCalendar[\s\S]*state\.settings\.calendarType/,
    );
    expect(
      transactionForm.match(
        /recurring_calendar_type:\s*defaultRecurringCalendar/g,
      ),
    ).toHaveLength(2);
  });

  it("does not read or write reminder-day settings", () => {
    expect(transactionForm).not.toMatch(
      /reminderDay|reminder_day|hebrewReminder/i,
    );
  });
});
