import type { CalendarType } from "../_shared/calendar/index.ts";
import {
  resolveReminderSchedule,
  type ReminderScheduleResolution,
} from "./reminder-schedule.ts";
import type { ReminderUser } from "./reminder-user.ts";

export interface DueReminderCohort {
  calendarType: CalendarType;
  reminderDay: number;
  resolution: Extract<
    ReminderScheduleResolution,
    { kind: "send-today" | "makeup" }
  >;
}

const REMINDER_CALENDAR_TYPES: readonly CalendarType[] = [
  "gregorian",
  "hebrew",
];

export function resolveDueReminderCohorts(
  currentIsraelDate: string,
  reminderDays: readonly number[],
): DueReminderCohort[] {
  const cohorts: DueReminderCohort[] = [];

  for (const calendarType of REMINDER_CALENDAR_TYPES) {
    const resolution = resolveReminderSchedule(
      currentIsraelDate,
      reminderDays,
      calendarType,
    );
    if (
      resolution.kind === "send-today" ||
      resolution.kind === "makeup"
    ) {
      cohorts.push({
        calendarType,
        reminderDay: resolution.reminderDay,
        resolution,
      });
    }
  }

  return cohorts;
}

export function deduplicateReminderUsers<T extends ReminderUser>(
  users: readonly T[],
): T[] {
  const uniqueUsers = new Map<string, T>();
  for (const user of users) {
    if (!uniqueUsers.has(user.id)) {
      uniqueUsers.set(user.id, user);
    }
  }
  return [...uniqueUsers.values()];
}
