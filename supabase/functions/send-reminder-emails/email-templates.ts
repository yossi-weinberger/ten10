import {
  getMonthlyEncouragement,
  REMINDER_COPY,
  type ReminderLanguage,
} from "./email-copy.ts";
import { EMAIL_TOKENS } from "../_shared/email-tokens.ts";
import {
  formatReminderAmount,
  normalizeReminderCurrencyCode,
  type ReminderCurrencyCode,
} from "./currency.ts";

export type BalanceState = "outstanding" | "credit" | "settled";

export interface EmailTemplateData {
  titheBalance: number;
  maaserBalance?: number;
  chomeshBalance?: number;
  language: ReminderLanguage;
  fullName?: string | null;
  currency?: ReminderCurrencyCode | string | null;
  israelMonth: number;
  unsubscribeUrls?: {
    reminderUrl: string;
    allUrl: string;
  };
}

const APP_URL = "https://ten10-app.com";
const LOGO_URL = EMAIL_TOKENS.logoUrl;
const CREAM = EMAIL_TOKENS.colors.cream;
const TEAL = EMAIL_TOKENS.colors.teal;
const GOLD = EMAIL_TOKENS.colors.gold;
const BORDER = EMAIL_TOKENS.colors.border;
const PAGE_BACKGROUND = "#e9e7df";
const CARD_BACKGROUND = "#f7f3e7";
const FOOTER_BACKGROUND = "#efebdf";
const HEADER_BACKGROUND_IMAGE =
  "radial-gradient(circle at 105% -10%, rgba(17,103,106,.26), transparent 46%), radial-gradient(circle at -5% 115%, rgba(240,192,0,.31), transparent 42%)";
const TEXT_MAIN = EMAIL_TOKENS.colors.text;
const TEXT_MUTED = "#4a5955";
const TEXT_LIGHT = "#6b7471";
const CREDIT_SURFACE = "#e8f3ee";
const CREDIT_BORDER = "#b7d4c6";
const CREDIT_BADGE_BG = "#d7ebe2";
const FONT_STACK = EMAIL_TOKENS.fontFamily;

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

function getSubject(
  data: EmailTemplateData,
  state: BalanceState,
  amount: string,
): string {
  const copy = REMINDER_COPY[data.language].subject;

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
  const currency = normalizeReminderCurrencyCode(data.currency);
  const amount = formatReminderAmount(
    data.titheBalance,
    data.language,
    currency,
  );
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
    subject: getSubject(data, state, amount),
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

function renderBalancePanel(
  amount: string,
  balanceLabel: string,
  state: BalanceState,
  copy: (typeof REMINDER_COPY)[ReminderLanguage],
): string {
  const isCredit = state === "credit";
  const panelBg = isCredit ? CREDIT_SURFACE : CREAM;
  const panelBorder = isCredit
    ? `border: 1px solid ${CREDIT_BORDER};`
    : "";
  const badgeHtml = isCredit
    ? `<tr>
                    <td align="center" style="padding: 18px 20px 0 20px;">
                      <span style="display: inline-block; background-color: ${CREDIT_BADGE_BG}; color: ${TEAL}; font-family: ${FONT_STACK}; font-size: 12px; font-weight: 700; line-height: 18px; padding: 4px 12px; border-radius: 8px;">${escapeHtml(copy.creditBadge)}</span>
                    </td>
                  </tr>`
    : "";
  const labelPadding = isCredit ? "12px 20px 10px 20px" : "28px 20px 10px 20px";

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${panelBg}" style="background-color: ${panelBg}; border-collapse: collapse; border-radius: 8px; ${panelBorder}">
                  ${badgeHtml}
                  <tr>
                    <td align="center" style="padding: ${labelPadding}; color: ${TEXT_MUTED}; font-family: ${FONT_STACK}; font-size: 16px; line-height: 24px;">${escapeHtml(balanceLabel)}</td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 0 20px 28px 20px; color: ${TEAL}; font-family: ${FONT_STACK}; font-size: 34px; font-weight: 700; line-height: 42px;">${escapeHtml(amount)}</td>
                  </tr>
                </table>`;
}

function renderImportHintBlock(
  copy: (typeof REMINDER_COPY)[ReminderLanguage],
): string {
  const accentSide =
    copy.direction === "rtl" ? "border-right" : "border-left";

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${CREAM}" style="background-color: ${CREAM}; border-collapse: collapse; border-radius: 8px;">
                  <tr>
                    <td style="padding: 14px 16px; color: ${TEXT_MUTED}; font-family: ${FONT_STACK}; font-size: 15px; line-height: 24px; text-align: center; ${accentSide}: 4px solid ${GOLD};">
                      ${escapeHtml(copy.importHintPrefix)} <strong style="color: ${TEXT_MAIN};">${escapeHtml(copy.importHintEmphasis)}</strong>
                    </td>
                  </tr>
                </table>`;
}

export function generateReminderEmailHTML(data: EmailTemplateData): string {
  const { amount, balanceLabel, copy, encouragement, greeting, state } =
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
  <body style="margin: 0; padding: 0; background-color: ${PAGE_BACKGROUND}; direction: ${direction}; font-family: ${FONT_STACK};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${PAGE_BACKGROUND}" style="width: 100%; margin: 0; padding: 0; background-color: ${PAGE_BACKGROUND}; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 24px 12px;">
          <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" bgcolor="${CARD_BACKGROUND}" style="width: 100%; max-width: 600px; background-color: ${CARD_BACKGROUND}; border-collapse: collapse; border: 1px solid #d4d0c3;">
            <tr>
              <td align="center" bgcolor="${CREAM}" style="padding: 29px 28px 22px 28px; background-color: ${CREAM}; background-image: ${HEADER_BACKGROUND_IMAGE}; background-repeat: no-repeat; border-bottom: 1px solid ${BORDER}; text-align: center;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td align="center" style="padding: 0;">
                      <img src="${LOGO_URL}" width="142" alt="Ten10" style="display: block; width: 142px; max-width: 142px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;">
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 13px 0 9px 0;">
                      <table role="presentation" width="142" cellspacing="0" cellpadding="0" border="0" style="width: 142px; border-collapse: collapse;">
                        <tr>
                          <td bgcolor="${GOLD}" height="4" style="height: 4px; line-height: 4px; font-size: 0; background-color: ${GOLD};">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="color: ${TEAL}; font-family: ${FONT_STACK}; font-size: 12px; font-weight: 600; line-height: 18px; padding: 0;">${escapeHtml(copy.slogan)}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 31px 32px 16px 32px; direction: ${direction}; text-align: ${textAlign}; background-color: ${CARD_BACKGROUND};">
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
              <td align="center" style="padding: 0 32px 28px 32px; background-color: ${CARD_BACKGROUND};">
                ${renderBalancePanel(amount, balanceLabel, state, copy)}
              </td>
            </tr>
            <tr>
              <td style="padding: 0 32px 18px 32px; color: ${TEXT_MUTED}; font-family: ${FONT_STACK}; font-size: 16px; line-height: 26px; text-align: center; background-color: ${CARD_BACKGROUND};">${escapeHtml(copy.verification)}</td>
            </tr>
            <tr>
              <td style="padding: 0 32px 30px 32px; background-color: ${CARD_BACKGROUND};">
                ${renderImportHintBlock(copy)}
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 32px 34px 32px; background-color: ${CARD_BACKGROUND};">
                <a href="${APP_URL}" style="display: inline-block; background-color: ${TEAL}; color: #fffdf8 !important; border-radius: 8px; font-family: ${FONT_STACK}; font-size: 16px; font-weight: 700; line-height: 20px; padding: 15px 28px; text-align: center; text-decoration: none;">${escapeHtml(copy.cta)}</a>
              </td>
            </tr>
            <tr>
              <td align="center" style="padding: 0 32px 28px 32px; background-color: ${CARD_BACKGROUND};">
                <table role="presentation" width="142" cellspacing="0" cellpadding="0" border="0" style="width: 142px; border-collapse: collapse;">
                  <tr>
                    <td bgcolor="${GOLD}" height="2" style="height: 2px; line-height: 2px; font-size: 0; background-color: ${GOLD};">&nbsp;</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 0 32px 38px 32px; text-align: center; background-color: ${CARD_BACKGROUND};">
                <div style="color: ${GOLD}; font-family: ${FONT_STACK}; font-size: 14px; font-weight: 700; line-height: 20px; margin-bottom: 10px;">${escapeHtml(copy.encouragementLabel)}</div>
                <div style="color: ${TEXT_MAIN}; font-family: ${FONT_STACK}; font-size: 16px; line-height: 26px;">${escapeHtml(encouragement.body)}</div>
                ${encouragementSource}
              </td>
            </tr>
            <tr>
              <td bgcolor="${FOOTER_BACKGROUND}" style="background-color: ${FOOTER_BACKGROUND}; border-top: 1px solid ${BORDER}; padding: 22px 28px 26px 28px;">
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
