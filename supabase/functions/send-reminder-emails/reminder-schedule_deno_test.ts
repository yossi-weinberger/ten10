import { getIsraelYomTov } from "../_shared/calendar/israel-yom-tov.ts";
import { resolveReminderSchedule } from "./reminder-schedule.ts";

function assertEquals(actual: unknown, expected: unknown): void {
  const actualJson = JSON.stringify(actual);
  const expectedJson = JSON.stringify(expected);
  if (actualJson !== expectedJson) {
    throw new Error(`Expected ${expectedJson}, received ${actualJson}`);
  }
}

Deno.test("Israel Yom Tov helper matches shared Temporal behavior", () => {
  assertEquals(getIsraelYomTov("2026-09-12"), {
    label: "Rosh Hashana",
  });
  assertEquals(getIsraelYomTov("2027-04-23"), null);
});

Deno.test("reminder resolver has Deno parity for Yom Tov makeup", () => {
  assertEquals(
    resolveReminderSchedule("2029-09-12", [1, 5, 10, 15, 20, 25]),
    {
      kind: "makeup",
      reason: "yom-tov",
      reminderDate: "2029-09-10",
      reminderDay: 10,
    },
  );
});

Deno.test("reminder resolver has Deno parity for Hebrew calendar days", () => {
  assertEquals(resolveReminderSchedule("2027-02-08", [1], "hebrew"), {
    kind: "send-today",
    reminderDay: 1,
  });
  assertEquals(resolveReminderSchedule("2026-09-14", [1], "hebrew"), {
    kind: "makeup",
    reason: "yom-tov-and-shabbat",
    reminderDate: "2026-09-12",
    reminderDay: 1,
  });
});
