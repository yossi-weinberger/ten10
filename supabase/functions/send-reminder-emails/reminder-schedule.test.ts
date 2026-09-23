import { describe, expect, it } from "vitest";
import {
  buildReminderRunLog,
  REMINDER_CALENDAR_POLICY,
  resolveReminderSchedule,
} from "./reminder-schedule.ts";
import type { CalendarType } from "../_shared/calendar/index.ts";

const reminderDays = [1, 5, 10, 15, 20, 25];

describe("resolveReminderSchedule", () => {
  it("skips a reminder due on Yom Tov and makes it up once after Rosh Hashana", () => {
    expect(
      resolveReminderSchedule("2029-09-10", reminderDays),
    ).toMatchObject({
      kind: "skip",
      reason: "yom-tov",
      holidayLabel: "Rosh Hashana",
    });
    expect(
      resolveReminderSchedule("2029-09-11", reminderDays),
    ).toMatchObject({
      kind: "skip",
      reason: "yom-tov",
      holidayLabel: "Rosh Hashana",
    });
    expect(resolveReminderSchedule("2029-09-12", reminderDays)).toEqual({
      kind: "makeup",
      reason: "yom-tov",
      reminderDate: "2029-09-10",
      reminderDay: 10,
    });
    expect(resolveReminderSchedule("2029-09-13", reminderDays)).toEqual({
      kind: "no-op",
    });
  });

  it("combines Yom Tov with Friday and Saturday into one makeup", () => {
    expect(
      resolveReminderSchedule("2034-09-15", reminderDays),
    ).toMatchObject({
      kind: "skip",
      reason: "yom-tov-and-shabbat",
      holidayLabel: "Rosh Hashana",
    });
    expect(resolveReminderSchedule("2034-09-17", reminderDays)).toEqual({
      kind: "makeup",
      reason: "yom-tov-and-shabbat",
      reminderDate: "2034-09-15",
      reminderDay: 15,
    });
    expect(resolveReminderSchedule("2034-09-18", reminderDays)).toEqual({
      kind: "no-op",
    });
  });

  it("makes up a Thursday Yom Tov only after the following Friday and Saturday", () => {
    expect(
      resolveReminderSchedule("2028-10-05", reminderDays),
    ).toMatchObject({
      kind: "skip",
      reason: "yom-tov",
      holidayLabel: "Sukkot",
    });
    expect(resolveReminderSchedule("2028-10-08", reminderDays)).toEqual({
      kind: "makeup",
      reason: "yom-tov-and-shabbat",
      reminderDate: "2028-10-05",
      reminderDay: 5,
    });
    expect(resolveReminderSchedule("2028-10-09", reminderDays)).toEqual({
      kind: "no-op",
    });
  });

  it("preserves Thursday advance for Friday without a Sunday duplicate", () => {
    expect(resolveReminderSchedule("2026-04-30", reminderDays)).toEqual({
      kind: "makeup",
      reason: "friday-advance",
      reminderDate: "2026-05-01",
      reminderDay: 1,
    });
    expect(resolveReminderSchedule("2026-05-01", reminderDays)).toEqual({
      kind: "skip",
      reason: "shabbat",
    });
    expect(resolveReminderSchedule("2026-05-02", reminderDays)).toEqual({
      kind: "skip",
      reason: "shabbat",
    });
    expect(resolveReminderSchedule("2026-05-03", reminderDays)).toEqual({
      kind: "no-op",
    });
  });

  it("does not advance a Friday Yom Tov reminder before the holiday", () => {
    expect(resolveReminderSchedule("2039-04-14", reminderDays)).toEqual({
      kind: "no-op",
    });
    expect(resolveReminderSchedule("2039-04-15", reminderDays)).toMatchObject({
      kind: "skip",
      reason: "yom-tov-and-shabbat",
      holidayLabel: "Pesach",
    });
    expect(resolveReminderSchedule("2039-04-17", reminderDays)).toEqual({
      kind: "makeup",
      reason: "yom-tov-and-shabbat",
      reminderDate: "2039-04-15",
      reminderDay: 15,
    });
  });

  it("preserves Saturday-to-Sunday makeup", () => {
    expect(resolveReminderSchedule("2026-08-15", reminderDays)).toEqual({
      kind: "skip",
      reason: "shabbat",
    });
    expect(resolveReminderSchedule("2026-08-16", reminderDays)).toEqual({
      kind: "makeup",
      reason: "shabbat",
      reminderDate: "2026-08-15",
      reminderDay: 15,
    });
  });

  it("sends an ordinary reminder day and ignores an ordinary non-reminder day", () => {
    expect(resolveReminderSchedule("2028-10-10", reminderDays)).toEqual({
      kind: "send-today",
      reminderDay: 10,
    });
    expect(resolveReminderSchedule("2028-10-11", reminderDays)).toEqual({
      kind: "no-op",
    });
  });
});

describe("Hebrew reminder calendar scheduling", () => {
  it.each([
    [1, "2027-02-08"],
    [5, "2027-01-13"],
    [10, "2027-01-18"],
    [15, "2027-02-22"],
    [20, "2027-01-28"],
    [25, "2027-01-04"],
  ] as const)("recognizes Hebrew day %i on %s", (day, isoDate) => {
    expect(resolveReminderSchedule(isoDate, [day], "hebrew")).toEqual({
      kind: "send-today",
      reminderDay: day,
    });
  });

  it("distinguishes Hebrew and Gregorian cohorts on the same civil date", () => {
    expect(resolveReminderSchedule("2027-02-08", [1], "hebrew")).toEqual({
      kind: "send-today",
      reminderDay: 1,
    });
    expect(resolveReminderSchedule("2027-02-08", [1], "gregorian")).toEqual({
      kind: "no-op",
    });

    expect(resolveReminderSchedule("2027-02-01", [1], "gregorian")).toEqual({
      kind: "send-today",
      reminderDay: 1,
    });
    expect(resolveReminderSchedule("2027-02-01", [1], "hebrew")).toEqual({
      kind: "no-op",
    });
  });

  it("handles Tishrei rollover and makes up Hebrew day 1 after Rosh Hashana", () => {
    expect(resolveReminderSchedule("2026-09-11", [1], "hebrew")).toEqual({
      kind: "skip",
      reason: "shabbat",
    });
    expect(
      resolveReminderSchedule("2026-09-12", [1], "hebrew"),
    ).toMatchObject({
      kind: "skip",
      reason: "yom-tov-and-shabbat",
    });
    expect(resolveReminderSchedule("2026-09-14", [1], "hebrew")).toEqual({
      kind: "makeup",
      reason: "yom-tov-and-shabbat",
      reminderDate: "2026-09-12",
      reminderDay: 1,
    });
  });

  it("recognizes both Adar I and Adar II in a leap year", () => {
    expect(resolveReminderSchedule("2027-02-08", [1], "hebrew")).toEqual({
      kind: "send-today",
      reminderDay: 1,
    });
    expect(resolveReminderSchedule("2027-03-10", [1], "hebrew")).toEqual({
      kind: "send-today",
      reminderDay: 1,
    });
  });

  it("recognizes the same reminder day in a simple Hebrew year", () => {
    expect(resolveReminderSchedule("2028-03-13", [15], "hebrew")).toEqual({
      kind: "send-today",
      reminderDay: 15,
    });
  });

  it("keeps the default calendar byte-for-byte Gregorian", () => {
    const dates = [
      "2029-09-10",
      "2029-09-12",
      "2034-09-17",
      "2026-04-30",
      "2026-08-16",
      "2028-10-11",
    ];

    for (const date of dates) {
      expect(resolveReminderSchedule(date, reminderDays)).toEqual(
        resolveReminderSchedule(
          date,
          reminderDays,
          "gregorian" satisfies CalendarType,
        ),
      );
    }
  });
});

describe("reminder run logging", () => {
  it("logs a Yom Tov skip with no processed users or emails", () => {
    const resolution = resolveReminderSchedule("2028-10-05", reminderDays);

    expect(
      buildReminderRunLog("2028-10-05", resolution, {
        emailsFailed: 9,
        emailsSent: 9,
        usersProcessed: 9,
      }),
    ).toMatchObject({
      day_of_month: 5,
      emails_failed: 0,
      emails_sent: 0,
      users_processed: 0,
      was_reminder_day: false,
      was_shabbat: false,
      was_yom_tov: true,
    });
  });

  it("documents the civil-midnight Israel-only stage boundary", () => {
    expect(REMINDER_CALENDAR_POLICY).toEqual({
      dayBoundary: "civil-midnight",
      diasporaSecondDays: false,
      holidayRegion: "IL",
      makeupLookbackDays: 4,
    });
  });
});
