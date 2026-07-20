import enLocaleJson from "./locales/email-en.json" with { type: "json" };
import heLocaleJson from "./locales/email-he.json" with { type: "json" };

export type ReminderLanguage = "he" | "en";
export type TextDirection = "rtl" | "ltr";

export interface MonthlyEncouragement {
  body: string;
  source?: string;
  /** Optional link back to content/library (TN10-XXXX). */
  contentId?: string;
}

interface BalanceCopy {
  outstanding: string;
  credit: string;
  settled: string;
}

interface BalanceBadgeCopy {
  outstanding: string;
  credit: string;
  settled: string;
}

interface SubjectCopy {
  outstanding: (amount: string) => string;
  credit: (amount: string) => string;
  settled: string;
}

/** Shape of reminder locale JSON files (string subjects with {{amount}}). */
interface ReminderLocaleJson {
  htmlLang: ReminderLanguage;
  direction: TextDirection;
  locale: "he-IL" | "en-US";
  slogan: string;
  greeting: string;
  reminder: string;
  balance: BalanceCopy;
  balanceBadge: BalanceBadgeCopy;
  verification: string;
  importHintPrefix: string;
  importHintEmphasis: string;
  cta: string;
  encouragementLabel: string;
  footerPreferenceNote: string;
  unsubscribeReminder: string;
  unsubscribeAll: string;
  subject: {
    outstanding: string;
    credit: string;
    settled: string;
  };
  monthlyEncouragements: readonly MonthlyEncouragement[];
}

export interface ReminderLocaleCopy {
  htmlLang: ReminderLanguage;
  direction: TextDirection;
  locale: "he-IL" | "en-US";
  slogan: string;
  greeting: string;
  reminder: string;
  balance: BalanceCopy;
  balanceBadge: BalanceBadgeCopy;
  verification: string;
  importHintPrefix: string;
  importHintEmphasis: string;
  cta: string;
  encouragementLabel: string;
  footerPreferenceNote: string;
  unsubscribeReminder: string;
  unsubscribeAll: string;
  subject: SubjectCopy;
  monthlyEncouragements: readonly MonthlyEncouragement[];
}

function fillAmountTemplate(template: string, amount: string): string {
  return template.replaceAll("{{amount}}", amount);
}

function hydrateLocale(raw: ReminderLocaleJson): ReminderLocaleCopy {
  if (raw.monthlyEncouragements.length !== 12) {
    throw new Error(
      `Reminder locale ${raw.htmlLang} must define exactly 12 monthlyEncouragements`,
    );
  }

  return {
    htmlLang: raw.htmlLang,
    direction: raw.direction,
    locale: raw.locale,
    slogan: raw.slogan,
    greeting: raw.greeting,
    reminder: raw.reminder,
    balance: raw.balance,
    balanceBadge: raw.balanceBadge,
    verification: raw.verification,
    importHintPrefix: raw.importHintPrefix,
    importHintEmphasis: raw.importHintEmphasis,
    cta: raw.cta,
    encouragementLabel: raw.encouragementLabel,
    footerPreferenceNote: raw.footerPreferenceNote,
    unsubscribeReminder: raw.unsubscribeReminder,
    unsubscribeAll: raw.unsubscribeAll,
    subject: {
      outstanding: (amount) =>
        fillAmountTemplate(raw.subject.outstanding, amount),
      credit: (amount) => fillAmountTemplate(raw.subject.credit, amount),
      settled: raw.subject.settled,
    },
    monthlyEncouragements: raw.monthlyEncouragements,
  };
}

export const REMINDER_COPY = {
  he: hydrateLocale(heLocaleJson as ReminderLocaleJson),
  en: hydrateLocale(enLocaleJson as ReminderLocaleJson),
} satisfies Record<ReminderLanguage, ReminderLocaleCopy>;

export function normalizeReminderLanguage(
  value: unknown,
): ReminderLanguage {
  return value === "en" ? "en" : "he";
}

export function getMonthlyEncouragement(
  language: ReminderLanguage,
  month: number,
): MonthlyEncouragement {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError("Month must be between 1 and 12");
  }

  return REMINDER_COPY[language].monthlyEncouragements[month - 1];
}

export function getIsraelMonth(date = new Date()): number {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Jerusalem",
      month: "numeric",
    }).format(date),
  );
}
