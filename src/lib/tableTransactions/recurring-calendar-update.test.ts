import { describe, expect, it } from "vitest";
import { getCalendarAdapter } from "@/lib/calendar";
import { buildRecurringUpdateRpcParams } from "./recurringTable.service";

describe("recurring calendar edit payload", () => {
  it("preserves stored Hebrew choice and sends the compatibility overload fields", () => {
    const hebrew = getCalendarAdapter("hebrew");
    const existing = {
      id: "recurring-id",
      user_id: "user-id",
      status: "active",
      start_date: hebrew.toIsoDate({ year: 5787, month: 1, day: 1 }),
      next_due_date: hebrew.toIsoDate({ year: 5787, month: 2, day: 30 }),
      frequency: "monthly",
      calendar_type: "hebrew",
      anchor_month_code: null,
      day_of_month: 30,
      execution_count: 0,
      amount: 100,
      currency: "ILS",
      type: "expense",
    } as const;

    const payload = buildRecurringUpdateRpcParams(
      existing.id,
      existing.user_id,
      { ...existing, day_of_month: 12 },
      existing,
    );

    expect(payload).toMatchObject({
      p_id: existing.id,
      p_user_id: existing.user_id,
      p_calendar_type: "hebrew",
      p_anchor_month_code: null,
      p_day_of_month: 12,
      p_next_due_date: hebrew.toIsoDate({
        year: 5787,
        month: 2,
        day: 12,
      }),
    });
  });

  it("re-anchors yearly intent when its calendar override changes", () => {
    const payload = buildRecurringUpdateRpcParams(
      "yearly-id",
      "user-id",
      {
        frequency: "yearly",
        calendar_type: "hebrew",
        day_of_month: 1,
      },
      {
        id: "yearly-id",
        user_id: "user-id",
        status: "active",
        start_date: "2026-09-12",
        next_due_date: "2026-09-12",
        frequency: "yearly",
        calendar_type: "gregorian",
        anchor_month_code: "M09",
        day_of_month: 1,
        execution_count: 0,
        amount: 100,
        currency: "ILS",
        type: "expense",
      },
    );

    expect(payload.p_anchor_month_code).toBe("M01");
  });
});
