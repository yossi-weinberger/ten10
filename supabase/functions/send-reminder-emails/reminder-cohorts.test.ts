import { describe, expect, it } from "vitest";
import {
  deduplicateReminderUsers,
  resolveDueReminderCohorts,
} from "./reminder-cohorts.ts";
import type { ReminderUser } from "./reminder-user.ts";

const reminderDays = [1, 5, 10, 15, 20, 25] as const;

function reminderUser(id: string): ReminderUser {
  return {
    id,
    email: `${id}@example.com`,
    reminder_enabled: true,
    reminder_day_of_month: 1,
    full_name: null,
    language: "he",
    default_currency: "ILS",
  };
}

describe("mixed reminder calendar cohorts", () => {
  it("selects only the Hebrew cohort when only its day is due", () => {
    expect(resolveDueReminderCohorts("2027-02-08", reminderDays)).toEqual([
      {
        calendarType: "hebrew",
        reminderDay: 1,
        resolution: { kind: "send-today", reminderDay: 1 },
      },
    ]);
  });

  it("selects only the Gregorian cohort when only its day is due", () => {
    expect(resolveDueReminderCohorts("2027-02-01", reminderDays)).toEqual([
      {
        calendarType: "gregorian",
        reminderDay: 1,
        resolution: { kind: "send-today", reminderDay: 1 },
      },
    ]);
  });

  it("keeps a multi-day Hebrew Yom Tov/Shabbat makeup in its cohort", () => {
    expect(resolveDueReminderCohorts("2026-09-14", reminderDays)).toEqual([
      {
        calendarType: "hebrew",
        reminderDay: 1,
        resolution: {
          kind: "makeup",
          reason: "yom-tov-and-shabbat",
          reminderDate: "2026-09-12",
          reminderDay: 1,
        },
      },
    ]);
  });

  it("deduplicates recipients returned across cohort calls", () => {
    const gregorianUser = reminderUser("same-user");
    const hebrewUser = {
      ...reminderUser("same-user"),
      email: "updated@example.com",
    };

    expect(
      deduplicateReminderUsers([
        gregorianUser,
        reminderUser("gregorian-only"),
        hebrewUser,
      ]),
    ).toEqual([gregorianUser, reminderUser("gregorian-only")]);
  });
});
