import {
  getMonthlyEncouragement,
  REMINDER_COPY,
  type ReminderLanguage,
} from "./email-copy.ts";
import { renderGoldAccentCallout } from "../_shared/email-admin-primitives.ts";
import { escapeHtml } from "../_shared/escape-html.ts";
import { renderUserEmailShell } from "../_shared/email-layout-user.ts";
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
const { colors, fontFamily } = EMAIL_TOKENS;

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

function renderBalancePanel(
  amount: string,
  balanceLabel: string,
  state: BalanceState,
  copy: (typeof REMINDER_COPY)[ReminderLanguage],
): string {
  const isCredit = state === "credit";
  const panelBg = isCredit ? colors.creditSurface : colors.cream;
  const panelBorder = isCredit
    ? `border: 1px solid ${colors.creditBorder};`
    : "";
  const badgeHtml = isCredit
    ? `<tr>
                    <td align="center" style="padding: 18px 20px 0 20px;">
                      <span style="display: inline-block; background-color: ${colors.creditBadge}; color: ${colors.teal}; font-family: ${fontFamily}; font-size: 12px; font-weight: 700; line-height: 18px; padding: 4px 12px; border-radius: 8px;">${escapeHtml(copy.creditBadge)}</span>
                    </td>
                  </tr>`
    : "";
  const labelPadding = isCredit ? "12px 20px 10px 20px" : "28px 20px 10px 20px";

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${panelBg}" style="background-color: ${panelBg}; border-collapse: collapse; border-radius: 8px; ${panelBorder}">
                  ${badgeHtml}
                  <tr>
                    <td align="center" style="padding: ${labelPadding}; color: ${colors.bodyMuted}; font-family: ${fontFamily}; font-size: 16px; line-height: 24px;">${escapeHtml(balanceLabel)}</td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 0 20px 28px 20px; color: ${colors.teal}; font-family: ${fontFamily}; font-size: 34px; font-weight: 700; line-height: 42px;">${escapeHtml(amount)}</td>
                  </tr>
                </table>`;
}

function renderUnsubscribeFooter(
  data: EmailTemplateData,
  copy: (typeof REMINDER_COPY)[ReminderLanguage],
): string {
  const links = data.unsubscribeUrls
    ? `<div style="margin-top: 14px;">
        <a href="${escapeHtml(data.unsubscribeUrls.reminderUrl)}" style="color: ${colors.teal}; font-family: ${fontFamily}; font-size: 14px; line-height: 20px; text-decoration: underline;">${copy.unsubscribeReminder}</a>
      </div>
      <div style="margin-top: 8px;">
        <a href="${escapeHtml(data.unsubscribeUrls.allUrl)}" style="color: ${colors.bodyLight}; font-family: ${fontFamily}; font-size: 12px; line-height: 18px; text-decoration: underline;">${copy.unsubscribeAll}</a>
      </div>`
    : "";

  return `<div style="color: ${colors.bodyLight}; font-family: ${fontFamily}; font-size: 13px; line-height: 20px;">${escapeHtml(copy.footerPreferenceNote)}</div>${links}`;
}

export function generateReminderEmailSubject(data: EmailTemplateData): string {
  return buildViewModel(data).subject;
}

export function generateReminderEmailHTML(data: EmailTemplateData): string {
  const { amount, balanceLabel, copy, encouragement, greeting, state } =
    buildViewModel(data);
  const direction = copy.direction;
  const textAlign = direction === "rtl" ? "right" : "left";
  const accentSide = direction === "rtl" ? "right" : "left";
  const encouragementSource = encouragement.source
    ? `<div style="color: ${colors.bodyLight}; font-family: ${fontFamily}; font-size: 13px; line-height: 20px; margin-top: 8px;">${escapeHtml(encouragement.source)}</div>`
    : "";
  const importHintHtml = renderGoldAccentCallout(
    `${escapeHtml(copy.importHintPrefix)} <strong style="color: ${colors.text};">${escapeHtml(copy.importHintEmphasis)}</strong>`,
    {
      accentSide,
      textAlign: "center",
      fontSize: 15,
      lineHeight: 24,
    },
  );

  const bodyHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; direction: ${direction}; text-align: ${textAlign};">
      <tr>
        <td style="color: ${colors.teal}; font-family: ${fontFamily}; font-size: 24px; font-weight: 500; line-height: 32px; padding: 0 0 14px 0; text-align: ${textAlign};">${escapeHtml(greeting)}</td>
      </tr>
      <tr>
        <td style="color: ${colors.bodyMuted}; font-family: ${fontFamily}; font-size: 16px; line-height: 26px; padding: 0 0 28px 0; text-align: ${textAlign};">${escapeHtml(copy.reminder)}</td>
      </tr>
      <tr>
        <td align="center" style="padding: 0 0 28px 0;">${renderBalancePanel(amount, balanceLabel, state, copy)}</td>
      </tr>
      <tr>
        <td style="color: ${colors.bodyMuted}; font-family: ${fontFamily}; font-size: 16px; line-height: 26px; padding: 0 0 18px 0; text-align: center;">${escapeHtml(copy.verification)}</td>
      </tr>
      <tr>
        <td style="padding: 0 0 30px 0;">${importHintHtml}</td>
      </tr>
      <tr>
        <td align="center" style="padding: 0 0 34px 0;">
          <a href="${APP_URL}" style="display: inline-block; background-color: ${colors.teal}; color: ${colors.buttonText} !important; border-radius: 8px; font-family: ${fontFamily}; font-size: 16px; font-weight: 700; line-height: 20px; padding: 15px 28px; text-align: center; text-decoration: none;">${escapeHtml(copy.cta)}</a>
        </td>
      </tr>
      <tr>
        <td align="center" style="padding: 0 0 28px 0;">
          <table role="presentation" width="142" cellspacing="0" cellpadding="0" border="0" style="width: 142px; border-collapse: collapse;">
            <tr>
              <td bgcolor="${colors.gold}" height="2" style="height: 2px; line-height: 2px; font-size: 0; background-color: ${colors.gold};">&nbsp;</td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 0; text-align: center;">
          <div style="color: ${colors.gold}; font-family: ${fontFamily}; font-size: 14px; font-weight: 700; line-height: 20px; margin-bottom: 10px;">${escapeHtml(copy.encouragementLabel)}</div>
          <div style="color: ${colors.text}; font-family: ${fontFamily}; font-size: 16px; line-height: 26px;">${escapeHtml(encouragement.body)}</div>
          ${encouragementSource}
        </td>
      </tr>
    </table>
  `.trim();

  return renderUserEmailShell({
    bodyHtml,
    dir: direction,
    footerHtml: renderUnsubscribeFooter(data, copy),
    headerSlogan: copy.slogan,
    lang: copy.htmlLang,
    title: generateReminderEmailSubject(data),
  });
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
