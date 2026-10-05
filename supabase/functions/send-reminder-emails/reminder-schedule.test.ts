import { describe, expect, it } from "vitest";
import {
  buildReminderRunLog,
  REMINDER_CALENDAR_POLICY,
  resolveMaaserYearCloseReminder,
  resolveReminderSchedule,
} from "./reminder-schedule.ts";
import {
  getCalendarAdapter,
  type CalendarType,
} from "../_shared/calendar/index.ts";
import { getIsraelYomTov } from "../_shared/calendar/israel-yom-tov.ts";

const reminderDays = [1, 5, 10, 15, 20, 25];

function addDays(isoDate: string, amount: number): string {
  const date = new Date(`${isoDate}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

// The cron runs after sunset in Israel, so a run is blocked when the evening
// is Shabbat or Yom Tov, or when the civil date is Saturday or Yom Tov.
function isBlockedEvening(isoDate: string): boolean {
  const dayOfWeek = new Date(`${isoDate}T00:00:00Z`).getUTCDay();
  return (
    dayOfWeek === 5 ||
    dayOfWeek === 6 ||
    getIsraelYomTov(isoDate) !== null ||
    getIsraelYomTov(addDays(isoDate, 1)) !== null
  );
}

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

  it("does not advance a Friday Yom Tov reminder to erev Yom Tov", () => {
    expect(resolveReminderSchedule("2039-04-14", reminderDays)).toEqual({
      kind: "skip",
      reason: "yom-tov",
      holidayLabel: "Erev Pesach",
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
    expect(resolveReminderSchedule("2028-10-16", reminderDays)).toEqual({
      kind: "no-op",
    });
  });

  it.each([
    ["2027-04-27", [20], "hebrew", "Erev Pesach", "2027-04-29"],
    ["2027-06-10", [10], "gregorian", "Erev Shavuot", "2027-06-13"],
    ["2027-06-10", [5], "hebrew", "Erev Shavuot", "2027-06-13"],
    ["2027-10-10", [10], "gregorian", "Erev Yom Kippur", "2027-10-12"],
    ["2028-09-20", [20], "gregorian", "Erev Rosh Hashana", "2028-09-24"],
  ] as const)(
    "skips erev Yom Tov on %s and makes up after the holiday",
    (erevDate, days, calendarType, holidayLabel, makeupDate) => {
      expect(
        resolveReminderSchedule(erevDate, days, calendarType),
      ).toMatchObject({ kind: "skip", holidayLabel });
      expect(
        resolveReminderSchedule(makeupDate, days, calendarType),
      ).toMatchObject({ kind: "makeup", reminderDate: erevDate });
    },
  );

  it.each(["gregorian", "hebrew"] as const)(
    "sends each %s reminder day exactly once and never on a blocked evening",
    (calendarType) => {
      for (const day of reminderDays) {
        const sends = new Map<string, string[]>();
        for (
          let date = "2026-09-01";
          date <= "2040-12-31";
          date = addDays(date, 1)
        ) {
          const resolution = resolveReminderSchedule(date, [day], calendarType);
          if (resolution.kind === "send-today") {
            sends.set(date, [...(sends.get(date) ?? []), date]);
          } else if (resolution.kind === "makeup") {
            const due = resolution.reminderDate;
            sends.set(due, [...(sends.get(due) ?? []), date]);
          }
        }

        for (
          let date = "2026-09-10";
          date <= "2040-12-20";
          date = addDays(date, 1)
        ) {
          const isDue =
            getCalendarAdapter(calendarType).fromIsoDate(date).day === day;
          expect(sends.get(date)?.length ?? 0, date).toBe(isDue ? 1 : 0);
        }
        for (const sentOn of [...sends.values()].flat()) {
          expect(isBlockedEvening(sentOn), sentOn).toBe(false);
        }
      }
    },
  );
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
      reason: "yom-tov-and-shabbat",
      holidayLabel: "Erev Rosh Hashana",
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

  it("sends the maaser-year close reminder on Erev Rosh Hashanah with Friday advance", () => {
    expect(resolveMaaserYearCloseReminder("2026-09-10")).toEqual({
      kind: "makeup",
      reason: "friday-advance",
      reminderDate: "2026-09-11",
      reminderDay: 29,
    });
    expect(resolveMaaserYearCloseReminder("2026-09-11")).toMatchObject({
      kind: "skip",
      reason: "yom-tov-and-shabbat",
    });
    expect(resolveMaaserYearCloseReminder("2026-09-23")).toEqual({
      kind: "no-op",
    });
  });

  it.each([
    ["2028-09-19", "2028-09-20", "2028-09-24"],
    ["2029-09-06", "2029-09-09", "2029-09-12"],
  ] as const)(
    "sends the maaser-year close reminder on %s, before Erev Rosh Hashanah %s",
    (sendDate, erevDate, afterHolidayDate) => {
      expect(resolveMaaserYearCloseReminder(sendDate)).toEqual({
        kind: "makeup",
        reason: "erev-yom-tov-advance",
        reminderDate: erevDate,
        reminderDay: 29,
      });
      expect(resolveMaaserYearCloseReminder(erevDate)).toMatchObject({
        kind: "skip",
        holidayLabel: "Erev Rosh Hashana",
      });
      expect(resolveMaaserYearCloseReminder(afterHolidayDate)).toEqual({
        kind: "no-op",
      });
    },
  );

  it("sends the maaser-year close reminder once a year, never on a blocked evening", () => {
    const sendsByTarget = new Map<string, string[]>();
    for (
      let date = "2026-09-01";
      date <= "2040-12-31";
      date = addDays(date, 1)
    ) {
      const resolution = resolveMaaserYearCloseReminder(date);
      if (resolution.kind === "send-today") {
        sendsByTarget.set(date, [...(sendsByTarget.get(date) ?? []), date]);
      } else if (resolution.kind === "makeup") {
        const target = resolution.reminderDate;
        sendsByTarget.set(target, [
          ...(sendsByTarget.get(target) ?? []),
          date,
        ]);
      }
    }

    expect(sendsByTarget.size).toBe(15);
    for (const [target, sentOn] of sendsByTarget) {
      expect(sentOn, target).toHaveLength(1);
      expect(sentOn[0] <= target, target).toBe(true);
      expect(isBlockedEvening(sentOn[0]), target).toBe(false);
    }
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
