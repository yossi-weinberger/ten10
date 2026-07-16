import {
  normalizeReminderLanguage,
  type ReminderLanguage,
} from "./email-copy.ts";

export interface ReminderUser {
  id: string;
  email: string;
  reminder_enabled: boolean;
  reminder_day_of_month: number;
  full_name: string | null;
  language: ReminderLanguage;
}

export interface ReminderUserRpcRow {
  id: string;
  email: string;
  reminder_enabled: boolean;
  reminder_day_of_month: number;
  full_name?: unknown;
  language?: unknown;
}

export function normalizeReminderUserRow(
  row: ReminderUserRpcRow,
): ReminderUser {
  return {
    id: row.id,
    email: row.email,
    reminder_enabled: row.reminder_enabled,
    reminder_day_of_month: row.reminder_day_of_month,
    full_name: typeof row.full_name === "string" ? row.full_name : null,
    language: normalizeReminderLanguage(row.language),
  };
}

export function normalizeReminderUserRows(response: unknown): ReminderUser[] {
  if (!Array.isArray(response)) {
    throw new TypeError(
      "get_reminder_users_with_emails expected an array response",
    );
  }

  return (response as ReminderUserRpcRow[]).map(normalizeReminderUserRow);
}
