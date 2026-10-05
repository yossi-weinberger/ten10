import { describe, expect, it } from "vitest";
import {
  ImportFileSchema,
  ImportRecurringItemSchema,
} from "./importSchemas";
import {
  RECURRING_CAMEL_TO_SNAKE,
  RECURRING_KEYS_TO_DROP_ON_INSERT,
  normalizeKeysToSnake,
} from "./fieldMapping";

describe("recurring calendar backup compatibility", () => {
  it("defaults recurring rows from old backups to Gregorian", () => {
    const parsed = ImportFileSchema.parse({
      version: 2,
      transactions: [],
      recurring_transactions: [{ amount: 10, custom: "preserved" }],
    });

    expect(parsed.recurring_transactions[0]).toMatchObject({
      calendar_type: "gregorian",
      anchor_month_code: null,
      custom: "preserved",
    });
  });

  it("validates supported calendars and preserves yearly anchors", () => {
    expect(
      ImportRecurringItemSchema.parse({
        calendar_type: "hebrew",
        anchor_month_code: "M05L",
      }),
    ).toMatchObject({
      calendar_type: "hebrew",
      anchor_month_code: "M05L",
    });
    expect(() =>
      ImportRecurringItemSchema.parse({ calendar_type: "julian" }),
    ).toThrow();
    expect(() =>
      ImportRecurringItemSchema.parse({
        calendar_type: "gregorian",
        anchor_month_code: "M05L",
      }),
    ).toThrow();
  });

  it("maps legacy camelCase calendar fields for round-trip imports", () => {
    expect(
      normalizeKeysToSnake(
        { calendarType: "hebrew", anchorMonthCode: "M06" },
        RECURRING_CAMEL_TO_SNAKE,
        RECURRING_KEYS_TO_DROP_ON_INSERT,
      ),
    ).toEqual({
      calendar_type: "hebrew",
      anchor_month_code: "M06",
    });
  });
});
