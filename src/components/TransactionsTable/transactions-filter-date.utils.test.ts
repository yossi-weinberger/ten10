import { format } from "date-fns";
import { he } from "date-fns/locale";
import { describe, expect, it } from "vitest";
import {
  formatCompactDateFilterValue,
  serializeTransactionDateRange,
} from "./transactions-filter-date.utils";

const EN_DASH = "\u2013";

function rangeLabel(from: Date, to: Date, language = "en"): string {
  const result = formatCompactDateFilterValue({ from, to }, language);
  if (result.kind !== "range") {
    throw new Error(`expected a range label, got ${result.kind}`);
  }
  return result.label;
}

describe("serializeTransactionDateRange", () => {
  it("serializes local range boundaries shortly after midnight", () => {
    expect(
      serializeTransactionDateRange({
        from: new Date(2026, 8, 23, 0, 30),
        to: new Date(2026, 8, 24, 0, 30),
      }),
    ).toEqual({
      from: "2026-09-23",
      to: "2026-09-24",
    });
  });

  it("serializes local range boundaries shortly before midnight", () => {
    expect(
      serializeTransactionDateRange({
        from: new Date(2026, 8, 23, 23, 30),
        to: new Date(2026, 8, 24, 23, 30),
      }),
    ).toEqual({
      from: "2026-09-23",
      to: "2026-09-24",
    });
  });
});

describe("formatCompactDateFilterValue", () => {
  it("uses the idle label when no date is selected", () => {
    expect(formatCompactDateFilterValue(undefined, "en")).toEqual({ kind: "all" });
    expect(formatCompactDateFilterValue({}, "he")).toEqual({ kind: "all" });
  });

  it("names a whole month in English and Hebrew", () => {
    const november = {
      from: new Date(2026, 10, 1, 0, 30),
      to: new Date(2026, 10, 30, 23, 30),
    };
    expect(formatCompactDateFilterValue(november, "en")).toEqual({
      kind: "month",
      monthLabel: "November",
    });
    expect(formatCompactDateFilterValue(november, "he")).toEqual({
      kind: "month",
      monthLabel: format(new Date(2026, 10, 1), "LLLL", { locale: he }),
    });
    expect(
      formatCompactDateFilterValue(
        { from: new Date(2026, 1, 1), to: new Date(2026, 1, 28) },
        "en",
      ),
    ).toEqual({ kind: "month", monthLabel: "February" });
    expect(
      formatCompactDateFilterValue(
        { from: new Date(2024, 1, 1), to: new Date(2024, 1, 29) },
        "en",
      ),
    ).toEqual({ kind: "month", monthLabel: "February" });
  });

  it("formats a custom range as day–day.month, including the 1–30.11 shape", () => {
    expect(rangeLabel(new Date(2026, 10, 1), new Date(2026, 10, 29))).toBe(
      `1${EN_DASH}29.11`,
    );
    expect(rangeLabel(new Date(2026, 0, 1), new Date(2026, 0, 30))).toBe(
      `1${EN_DASH}30.1`,
    );
    expect(rangeLabel(new Date(2024, 1, 1), new Date(2024, 1, 28))).toBe(
      `1${EN_DASH}28.2`,
    );
  });

  it("formats cross-month and single-day ranges without padding", () => {
    expect(rangeLabel(new Date(2026, 9, 28), new Date(2026, 10, 3))).toBe(
      `28.10${EN_DASH}3.11`,
    );
    expect(rangeLabel(new Date(2025, 11, 28), new Date(2026, 0, 3))).toBe(
      `28.12.2025${EN_DASH}3.1.2026`,
    );
    expect(rangeLabel(new Date(2026, 10, 5), new Date(2026, 10, 5))).toBe("5.11");
    expect(
      formatCompactDateFilterValue({ from: new Date(2026, 10, 5) }, "en"),
    ).toEqual({ kind: "range", label: "5.11" });
  });
});
