import {
  isProductionEmailEnv,
  type EmailGuardEnv,
} from "../_shared/email-guard.ts";
import {
  resolveMaaserYearCloseReminder,
  resolveReminderSchedule,
  type ReminderScheduleResolution,
} from "./reminder-schedule.ts";
import {
  resolveDueReminderCohorts,
  type DueReminderCohort,
} from "./reminder-cohorts.ts";

export const DEFAULT_REMINDER_DAYS = [1, 5, 10, 15, 20, 25] as const;

const FORCE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export type ReminderCivilDateResolution = {
  date: string;
  forceDateApplied: boolean;
  forceDateIgnored: boolean;
  requestedForceDate?: string;
};

export type ReminderRunPlan = {
  israelDate: string;
  dueCohorts: DueReminderCohort[];
  fallback: ReminderScheduleResolution;
  hebrew: ReminderScheduleResolution;
  yearly: ReminderScheduleResolution;
};

export function parseForceDate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  if (!FORCE_DATE_PATTERN.test(trimmed)) {
    return null;
  }
  const parsed = new Date(`${trimmed}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== trimmed
  ) {
    return null;
  }
  return trimmed;
}

export function resolveReminderCivilDate(input: {
  forceDate?: unknown;
  fallbackDate: string;
  env?: EmailGuardEnv;
}): ReminderCivilDateResolution {
  const requested = parseForceDate(input.forceDate);
  if (!requested) {
    if (input.forceDate !== undefined && input.forceDate !== null) {
      console.warn("[REMINDER] Invalid forceDate ignored", {
        forceDate: typeof input.forceDate === "string" ? input.forceDate : typeof input.forceDate,
      });
    }
    return {
      date: input.fallbackDate,
      forceDateApplied: false,
      forceDateIgnored: false,
    };
  }

  if (isProductionEmailEnv(input.env)) {
    console.warn("[REMINDER] forceDate ignored in production", {
      requestedForceDate: requested,
    });
    return {
      date: input.fallbackDate,
      forceDateApplied: false,
      forceDateIgnored: true,
      requestedForceDate: requested,
    };
  }

  return {
    date: requested,
    forceDateApplied: true,
    forceDateIgnored: false,
    requestedForceDate: requested,
  };
}

export function planReminderRun(
  israelDate: string,
  reminderDays: readonly number[] = DEFAULT_REMINDER_DAYS,
): ReminderRunPlan {
  return {
    israelDate,
    dueCohorts: resolveDueReminderCohorts(israelDate, reminderDays),
    fallback: resolveReminderSchedule(israelDate, reminderDays, "gregorian"),
    hebrew: resolveReminderSchedule(israelDate, reminderDays, "hebrew"),
    yearly: resolveMaaserYearCloseReminder(israelDate),
  };
}
