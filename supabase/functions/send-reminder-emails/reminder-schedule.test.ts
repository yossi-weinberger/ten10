import { describe, expect, it } from "vitest";
import {
  buildReminderRunLog,
  REMINDER_CALENDAR_POLICY,
  resolveReminderSchedule,
} from "./reminder-schedule.ts";

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
