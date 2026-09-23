import { getIsraelYomTov } from "../_shared/calendar/israel-yom-tov.ts";

export const REMINDER_CALENDAR_POLICY = {
  dayBoundary: "civil-midnight",
  diasporaSecondDays: false,
  holidayRegion: "IL",
  makeupLookbackDays: 4,
} as const;

type SkipReason = "shabbat" | "yom-tov" | "yom-tov-and-shabbat";
type MakeupReason = SkipReason | "friday-advance";

export type ReminderScheduleResolution =
  | { kind: "send-today"; reminderDay: number }
  | {
      kind: "makeup";
      reason: MakeupReason;
      reminderDate: string;
      reminderDay: number;
    }
  | { kind: "skip"; reason: SkipReason; holidayLabel?: string }
  | { kind: "no-op" };

export interface ReminderRunCounts {
  usersProcessed: number;
  emailsSent: number;
  emailsFailed: number;
}

export interface ReminderRunLogEntry {
  day_of_month: number;
  was_reminder_day: boolean;
  was_shabbat: boolean;
  was_yom_tov: boolean;
  users_processed: number;
  emails_sent: number;
  emails_failed: number;
  notes?: string;
}

interface BlockedDate {
  isShabbat: boolean;
  holidayLabel: string | null;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported reminder schedule result: ${String(value)}`);
}

function toUtcDate(isoDate: string): Date {
  const date = new Date(`${isoDate}T00:00:00Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== isoDate) {
    throw new RangeError(`Invalid ISO date: ${isoDate}`);
  }
  return date;
}

function addDays(isoDate: string, amount: number): string {
  const date = toUtcDate(isoDate);
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

function dayOfMonth(isoDate: string): number {
  return toUtcDate(isoDate).getUTCDate();
}

function getBlockedDate(isoDate: string): BlockedDate {
  const dayOfWeek = toUtcDate(isoDate).getUTCDay();
  return {
    isShabbat: dayOfWeek === 5 || dayOfWeek === 6,
    holidayLabel: getIsraelYomTov(isoDate)?.label ?? null,
  };
}

function isEligibleDate(isoDate: string): boolean {
  const blocked = getBlockedDate(isoDate);
  return !blocked.isShabbat && blocked.holidayLabel === null;
}

function getSkipReason(blocked: BlockedDate): SkipReason {
  if (blocked.isShabbat && blocked.holidayLabel !== null) {
    return "yom-tov-and-shabbat";
  }
  if (blocked.holidayLabel !== null) {
    return "yom-tov";
  }
  return "shabbat";
}

function getMakeupReason(
  reminderDate: string,
  currentDate: string,
): Exclude<MakeupReason, "friday-advance"> {
  let sawShabbat = false;
  let sawYomTov = false;

  for (
    let date = reminderDate;
    date !== currentDate;
    date = addDays(date, 1)
  ) {
    const blocked = getBlockedDate(date);
    sawShabbat ||= blocked.isShabbat;
    sawYomTov ||= blocked.holidayLabel !== null;
  }

  if (sawShabbat && sawYomTov) {
    return "yom-tov-and-shabbat";
  }
  return sawYomTov ? "yom-tov" : "shabbat";
}

function fridayWasSentInAdvance(fridayDate: string): boolean {
  const thursdayDate = addDays(fridayDate, -1);
  return (
    getIsraelYomTov(fridayDate) === null &&
    isEligibleDate(thursdayDate)
  );
}

export function resolveReminderSchedule(
  currentIsraelDate: string,
  reminderDays: readonly number[],
): ReminderScheduleResolution {
  const currentBlocked = getBlockedDate(currentIsraelDate);
  if (
    currentBlocked.isShabbat ||
    currentBlocked.holidayLabel !== null
  ) {
    const holidayLabel = currentBlocked.holidayLabel;
    return {
      kind: "skip",
      reason: getSkipReason(currentBlocked),
      ...(holidayLabel === null ? {} : { holidayLabel }),
    };
  }

  const currentDate = toUtcDate(currentIsraelDate);
  const currentDay = currentDate.getUTCDate();
  const currentDayOfWeek = currentDate.getUTCDay();

  if (currentDayOfWeek === 4) {
    const fridayDate = addDays(currentIsraelDate, 1);
    const fridayDay = dayOfMonth(fridayDate);
    if (
      reminderDays.includes(fridayDay) &&
      getIsraelYomTov(fridayDate) === null
    ) {
      return {
        kind: "makeup",
        reason: "friday-advance",
        reminderDate: fridayDate,
        reminderDay: fridayDay,
      };
    }
  }

  if (reminderDays.includes(currentDay)) {
    return { kind: "send-today", reminderDay: currentDay };
  }

  for (
    let offset = 1;
    offset <= REMINDER_CALENDAR_POLICY.makeupLookbackDays;
    offset += 1
  ) {
    const reminderDate = addDays(currentIsraelDate, -offset);
    const reminderDay = dayOfMonth(reminderDate);
    if (!reminderDays.includes(reminderDay)) {
      continue;
    }

    const reminderDayOfWeek = toUtcDate(reminderDate).getUTCDay();
    if (reminderDayOfWeek === 5 && fridayWasSentInAdvance(reminderDate)) {
      continue;
    }

    let firstEligibleDate = reminderDate;
    while (!isEligibleDate(firstEligibleDate)) {
      firstEligibleDate = addDays(firstEligibleDate, 1);
    }

    if (firstEligibleDate === currentIsraelDate) {
      return {
        kind: "makeup",
        reason: getMakeupReason(reminderDate, currentIsraelDate),
        reminderDate,
        reminderDay,
      };
    }
  }

  return { kind: "no-op" };
}

function getResolutionNote(
  resolution: ReminderScheduleResolution,
): string | undefined {
  switch (resolution.kind) {
    case "send-today":
      return undefined;
    case "makeup":
      return `${resolution.reason} makeup for ${resolution.reminderDate}`;
    case "skip":
      return resolution.holidayLabel === undefined
        ? "Shabbat - skipped"
        : `Israel Yom Tov (${resolution.holidayLabel}) - skipped`;
    case "no-op":
      return "Not a reminder day";
    default:
      return assertNever(resolution);
  }
}

export function buildReminderRunLog(
  currentIsraelDate: string,
  resolution: ReminderScheduleResolution,
  counts: ReminderRunCounts = {
    usersProcessed: 0,
    emailsSent: 0,
    emailsFailed: 0,
  },
): ReminderRunLogEntry {
  const currentBlocked = getBlockedDate(currentIsraelDate);
  const shouldSend =
    resolution.kind === "send-today" || resolution.kind === "makeup";
  const reminderDay =
    resolution.kind === "send-today" || resolution.kind === "makeup"
      ? resolution.reminderDay
      : dayOfMonth(currentIsraelDate);

  return {
    day_of_month: reminderDay,
    was_reminder_day: shouldSend,
    was_shabbat: currentBlocked.isShabbat,
    was_yom_tov: currentBlocked.holidayLabel !== null,
    users_processed: shouldSend ? counts.usersProcessed : 0,
    emails_sent: shouldSend ? counts.emailsSent : 0,
    emails_failed: shouldSend ? counts.emailsFailed : 0,
    notes: getResolutionNote(resolution),
  };
}
