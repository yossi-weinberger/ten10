import {
  getMonthlyEncouragement,
  REMINDER_COPY,
  type ReminderLanguage,
} from "./email-copy.ts";

export type BalanceState = "outstanding" | "credit" | "settled";

export interface EmailTemplateData {
  titheBalance: number;
  maaserBalance?: number;
  chomeshBalance?: number;
  language: ReminderLanguage;
  fullName?: string | null;
  israelMonth: number;
  unsubscribeUrls?: {
    reminderUrl: string;
    allUrl: string;
  };
}

const HEADER_ASSET_URL =
  "https://ten10-app.com/email/reminder-header-blur.png";
const APP_URL = "https://ten10-app.com";
const LOGO_URL = "https://ten10-app.com/logo/logo-wide.png";
const CREAM = "#f9f6eb";
const TEAL = "#11676a";
const GOLD = "#f0c000";
const TEXT_MAIN = "#1f2937";
const TEXT_MUTED = "#4b5563";
const TEXT_LIGHT = "#6b7280";
const FONT_STACK = "Assistant, 'Arial Hebrew', 'Segoe UI', Arial, sans-serif";

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function getBalanceState(balance: number): BalanceState {
  if (balance > 0) return "outstanding";
  if (balance < 0) return "credit";
  return "settled";
}

export function extractFirstName(
  fullName: string | null | undefined,
): string | undefined {
  const firstName = fullName?.trim().split(/\s+/)[0];
  return firstName || undefined;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPE_MAP[character]);
}

function formatAmount(amount: number, language: ReminderLanguage): string {
  const formatted = new Intl.NumberFormat(REMINDER_COPY[language].locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  return language === "he" ? `${formatted} ₪` : `₪${formatted}`;
}

function getBalanceLabel(language: ReminderLanguage, state: BalanceState): string {
  const copy = REMINDER_COPY[language].balance;

  switch (state) {
    case "outstanding":
      return copy.outstanding;
    case "credit":
      return copy.credit;
    case "settled":
      return copy.settled;
    default: {
      const exhaustiveState: never = state;
      return exhaustiveState;
    }
  }
}

function getSubject(data: EmailTemplateData, state: BalanceState): string {
  const copy = REMINDER_COPY[data.language].subject;
  const amount = formatAmount(data.titheBalance, data.language);

  switch (state) {
    case "outstanding":
      return copy.outstanding(amount);
    case "credit":
      return copy.credit(amount);
    case "settled":
      return copy.settled;
    default: {
      const exhaustiveState: never = state;
      return exhaustiveState;
    }
  }
}

function buildViewModel(data: EmailTemplateData) {
  const copy = REMINDER_COPY[data.language];
  const firstName = extractFirstName(data.fullName);
  const greeting = firstName ? `${copy.greeting}, ${firstName}` : copy.greeting;
  const state = getBalanceState(data.titheBalance);
  const amount = formatAmount(data.titheBalance, data.language);
  const encouragement = getMonthlyEncouragement(
    data.language,
    data.israelMonth,
  );

  return {
    amount,
    balanceLabel: getBalanceLabel(data.language, state),
    copy,
    encouragement,
    greeting,
    state,
    subject: getSubject(data, state),
  };
}

function renderUnsubscribeLinks(
  data: EmailTemplateData,
  copy: (typeof REMINDER_COPY)[ReminderLanguage],
): string {
  if (!data.unsubscribeUrls) return "";

  return `
                    <tr>
                      <td align="center" style="padding: 0 0 12px 0;">
                        <a href="${escapeHtml(data.unsubscribeUrls.reminderUrl)}" style="color: ${TEAL}; font-family: ${FONT_STACK}; font-size: 14px; line-height: 20px; text-decoration: underline;">${copy.unsubscribeReminder}</a>
                      </td>
                    </tr>
                    <tr>
                      <td align="center" style="padding: 0;">
                        <a href="${escapeHtml(data.unsubscribeUrls.allUrl)}" style="color: ${TEXT_LIGHT}; font-family: ${FONT_STACK}; font-size: 12px; line-height: 18px; text-decoration: underline;">${copy.unsubscribeAll}</a>
                      </td>
                    </tr>`;
}

export function generateReminderEmailSubject(data: EmailTemplateData): string {
  return buildViewModel(data).subject;
}

export function generateReminderEmailHTML(data: EmailTemplateData): string {
  const { amount, balanceLabel, copy, encouragement, greeting } =
    buildViewModel(data);
  const direction = copy.direction;
  const textAlign = direction === "rtl" ? "right" : "left";
  const encouragementSource = encouragement.source
    ? `<div style="color: ${TEXT_LIGHT}; font-family: ${FONT_STACK}; font-size: 13px; line-height: 20px; margin-top: 8px;">${escapeHtml(encouragement.source)}</div>`
    : "";

  return `<!DOCTYPE html>
<html lang="${copy.htmlLang}" dir="${direction}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(generateReminderEmailSubject(data))}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: ${CREAM}; direction: ${direction}; font-family: ${FONT_STACK};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${CREAM}" style="width: 100%; margin: 0; padding: 0; background-color: ${CREAM}; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="#ffffff" style="width: 100%; max-width: 600px; background-color: #ffffff; border-collapse: collapse;">
            <tr>
              <td align="center" background="${HEADER_ASSET_URL}" bgcolor="${CREAM}" style="padding: 38px 28px 34px 28px; background-color: ${CREAM}; border-bottom: 1px solid #e5dcc8; background-image: url(${HEADER_ASSET_URL}); background-repeat: no-repeat; background-position: center top; background-size: cover;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td align="center" style="padding: 0 0 18px 0;">
                      <img src="${LOGO_URL}" width="162" alt="Ten10" style="display: block; width: 162px; max-width: 162px; height: auto; border: 0; outline: none; text-decoration: none;">
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 0 0 14px 0;">
                      <table role="presentation" width="142" cellspacing="0" cellpadding="0" border="0" style="width: 142px; border-collapse: collapse;">
                        <tr>
                          <td bgcolor="${GOLD}" height="3" style="height: 3px; line-height: 3px; font-size: 0;">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="color: ${TEAL}; font-family: ${FONT_STACK}; font-size: 14px; font-weight: 700; line-height: 22px; padding: 0;">${escapeHtml(copy.slogan)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 38px 34px 16px 34px; direction: ${direction}; text-align: ${textAlign};">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td style="color: ${TEAL}; font-family: ${FONT_STACK}; font-size: 24px; font-weight: 500; line-height: 32px; padding: 0 0 14px 0; text-align: ${textAlign};">${escapeHtml(greeting)}</td>
                  </tr>
                  <tr>
                    <td style="color: ${TEXT_MUTED}; font-family: ${FONT_STACK}; font-size: 16px; line-height: 26px; padding: 0 0 28px 0; text-align: ${textAlign};">${escapeHtml(copy.reminder)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 34px 28px 34px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${CREAM}" style="background-color: ${CREAM}; border-collapse: collapse;">
                  <tr>
                    <td align="center" style="padding: 28px 20px 10px 20px; color: ${TEXT_MUTED}; font-family: ${FONT_STACK}; font-size: 16px; line-height: 24px;">${escapeHtml(balanceLabel)}</td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 0 20px 28px 20px; color: ${TEAL}; font-family: ${FONT_STACK}; font-size: 34px; font-weight: 700; line-height: 42px;">${escapeHtml(amount)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 34px 18px 34px; color: ${TEXT_MUTED}; font-family: ${FONT_STACK}; font-size: 16px; line-height: 26px; text-align: center;">${escapeHtml(copy.verification)}</td>
            </tr>
            <tr>
              <td style="padding: 0 34px 30px 34px; color: ${TEXT_MUTED}; font-family: ${FONT_STACK}; font-size: 15px; line-height: 24px; text-align: center;">
                ${escapeHtml(copy.importHintPrefix)} <strong style="color: ${TEXT_MAIN};">${escapeHtml(copy.importHintEmphasis)}</strong>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 34px 34px 34px;">
                <a href="${APP_URL}" style="background-color: ${TEAL}; color: #ffffff; display: inline-block; font-family: ${FONT_STACK}; font-size: 16px; font-weight: 700; line-height: 20px; padding: 15px 28px; text-align: center; text-decoration: none;">${escapeHtml(copy.cta)}</a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 34px 28px 34px;">
                <table role="presentation" width="142" cellspacing="0" cellpadding="0" border="0" style="width: 142px; border-collapse: collapse;">
                  <tr>
                    <td bgcolor="${GOLD}" height="2" style="height: 2px; line-height: 2px; font-size: 0;">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 34px 38px 34px; text-align: center;">
                <div style="color: ${GOLD}; font-family: ${FONT_STACK}; font-size: 14px; font-weight: 700; line-height: 20px; margin-bottom: 10px;">${escapeHtml(copy.encouragementLabel)}</div>
                <div style="color: ${TEXT_MAIN}; font-family: ${FONT_STACK}; font-size: 16px; line-height: 26px;">${escapeHtml(encouragement.body)}</div>
                ${encouragementSource}
              </td>
            </tr>
            <tr>
              <td bgcolor="${CREAM}" style="background-color: ${CREAM}; padding: 26px 30px 30px 30px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td align="center" style="color: ${TEXT_LIGHT}; font-family: ${FONT_STACK}; font-size: 13px; line-height: 20px; padding: 0 0 18px 0;">${escapeHtml(copy.footerPreferenceNote)}</td>
                  </tr>${renderUnsubscribeLinks(data, copy)}
                </table>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

export function generateReminderEmailText(data: EmailTemplateData): string {
  const { amount, balanceLabel, copy, encouragement, greeting } =
    buildViewModel(data);
  const unsubscribeText = data.unsubscribeUrls
    ? [
        "",
        `${copy.unsubscribeReminder}: ${data.unsubscribeUrls.reminderUrl}`,
        `${copy.unsubscribeAll}: ${data.unsubscribeUrls.allUrl}`,
      ].join("\n")
    : "";
  const encouragementSource = encouragement.source
    ? `\n${encouragement.source}`
    : "";

  return [
    greeting,
    "",
    copy.reminder,
    "",
    `${balanceLabel} ${amount}`,
    copy.verification,
    `${copy.importHintPrefix} ${copy.importHintEmphasis}`,
    "",
    `${copy.cta}: ${APP_URL}`,
    "",
    copy.encouragementLabel,
    encouragement.body,
    `${encouragementSource}`,
    "",
    copy.footerPreferenceNote,
    unsubscribeText,
  ]
    .filter((line) => line !== "")
    .join("\n");
}
