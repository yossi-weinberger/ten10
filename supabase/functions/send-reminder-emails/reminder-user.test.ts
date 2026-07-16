import { describe, expect, it } from "vitest";
import {
  normalizeReminderUserRow,
  normalizeReminderUserRows,
} from "./reminder-user.ts";

const baseRow = {
  id: "user-123",
  email: "recipient@example.com",
  reminder_enabled: true,
  reminder_day_of_month: 10,
};

describe("reminder user RPC normalization", () => {
  it.each([null, { id: "user-123" }, "not-an-array", 42])(
    "rejects a non-array RPC response",
    (response) => {
      expect(() => normalizeReminderUserRows(response)).toThrow(
        "get_reminder_users_with_emails expected an array response",
      );
    },
  );

  it("normalizes every row in a valid RPC array", () => {
    expect(
      normalizeReminderUserRows([
        {
          ...baseRow,
          language: "en",
          full_name: "Yossi Weinberger",
          default_currency: "usd",
        },
        { ...baseRow, id: "user-456", language: null, full_name: 42 },
      ]),
    ).toEqual([
      {
        ...baseRow,
        language: "en",
        full_name: "Yossi Weinberger",
        default_currency: "USD",
      },
      {
        ...baseRow,
        id: "user-456",
        language: "he",
        full_name: null,
        default_currency: "ILS",
      },
    ]);
  });

  it.each([undefined, null, "", "btc"])(
    "falls back to ILS for invalid or missing currency %s",
    (default_currency) => {
      expect(
        normalizeReminderUserRow({ ...baseRow, default_currency })
          .default_currency,
      ).toBe("ILS");
    },
  );

  it("preserves a supported currency code", () => {
    expect(
      normalizeReminderUserRow({ ...baseRow, default_currency: "eur" })
        .default_currency,
    ).toBe("EUR");
  });

  it.each([undefined, null, "", "fr"])(
    "falls back to Hebrew for invalid or missing language %s",
    (language) => {
      expect(normalizeReminderUserRow({ ...baseRow, language }).language).toBe(
        "he",
      );
    },
  );

  it("preserves explicit English", () => {
    expect(
      normalizeReminderUserRow({ ...baseRow, language: "en" }).language,
    ).toBe("en");
  });

  it.each([undefined, null, 42, { name: "Yossi" }])(
    "normalizes a non-string full name to null",
    (full_name) => {
      expect(normalizeReminderUserRow({ ...baseRow, full_name }).full_name).toBe(
        null,
      );
    },
  );

  it("preserves a string full name", () => {
    expect(
      normalizeReminderUserRow({
        ...baseRow,
        full_name: "Yossi Weinberger",
      }).full_name,
    ).toBe("Yossi Weinberger");
  });
});
