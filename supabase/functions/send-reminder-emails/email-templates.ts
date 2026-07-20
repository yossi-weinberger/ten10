import {
  getMonthlyEncouragement,
  REMINDER_COPY,
  type ReminderLanguage,
} from "./email-copy.ts";
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
const { buttonShadow, cardShadow, colors, fontFamily } = EMAIL_TOKENS;

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

function getBalanceBadge(
  language: ReminderLanguage,
  state: BalanceState,
): string {
  const badges = REMINDER_COPY[language].balanceBadge;

  switch (state) {
    case "outstanding":
      return badges.outstanding;
    case "credit":
      return badges.credit;
    case "settled":
      return badges.settled;
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
    balanceBadge: getBalanceBadge(data.language, state),
    balanceLabel: getBalanceLabel(data.language, state),
    copy,
    encouragement,
    greeting,
    state,
    subject: getSubject(data, state, amount),
  };
}

function splitEncouragementBody(body: string): {
  storyHtml: string;
  takeawayHtml?: string;
} {
  const parts = body
    .split(/\n\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  if (parts.length <= 1) {
    return {
      storyHtml: escapeHtml(body).replaceAll("\n", "<br>"),
    };
  }

  const takeaway = parts[parts.length - 1];
  const story = parts.slice(0, -1).join("\n\n");
  return {
    storyHtml: escapeHtml(story).replaceAll("\n", "<br>"),
    takeawayHtml: escapeHtml(takeaway).replaceAll("\n", "<br>"),
  };
}

function badgeStyles(state: BalanceState): {
  background: string;
  color: string;
} {
  switch (state) {
    case "outstanding":
      return {
        background: colors.outstandingBadge,
        color: colors.outstandingBadgeText,
      };
    case "credit":
      return {
        background: colors.creditBadge,
        color: colors.teal,
      };
    case "settled":
      return {
        background: colors.border,
        color: colors.bodyMuted,
      };
    default: {
      const exhaustiveState: never = state;
      return exhaustiveState;
    }
  }
}

function renderBalancePanel(
  amount: string,
  balanceBadge: string,
  state: BalanceState,
  verification: string,
): string {
  const isCredit = state === "credit";
  const panelBg = isCredit ? colors.creditSurface : colors.balanceCard;
  const panelBorder = isCredit
    ? `border: 1px solid ${colors.creditBorder};`
    : `border: 1px solid ${colors.border};`;
  const badge = badgeStyles(state);

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${panelBg}" style="background-color: ${panelBg}; border-collapse: separate; border-radius: 12px; box-shadow: ${cardShadow}; ${panelBorder}">
                  <tr>
                    <td align="center" style="padding: 22px 20px 0 20px;">
                      <span style="display: inline-block; background-color: ${badge.background}; color: ${badge.color}; font-family: ${fontFamily}; font-size: 12px; font-weight: 700; line-height: 18px; padding: 5px 14px; border-radius: 999px;">${escapeHtml(balanceBadge)}</span>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 14px 20px 8px 20px; color: ${colors.teal}; font-family: ${fontFamily}; font-size: 34px; font-weight: 700; line-height: 42px;">${escapeHtml(amount)}</td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 0 24px 22px 24px; color: ${colors.bodyLight}; font-family: ${fontFamily}; font-size: 13px; line-height: 20px;">${escapeHtml(verification)}</td>
                  </tr>
                </table>`;
}

function renderImportHint(
  prefix: string,
  emphasis: string,
  textAlign: "left" | "right",
): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${colors.cream}" style="background-color: ${colors.cream}; border-collapse: separate; border-radius: 12px; box-shadow: ${cardShadow};">
            <tr>
              <td style="padding: 16px 18px; color: ${colors.bodyMuted}; font-family: ${fontFamily}; font-size: 15px; line-height: 24px; text-align: ${textAlign};">
                ${escapeHtml(prefix)}
                <strong style="color: ${colors.teal}; font-weight: 700;"> ${escapeHtml(emphasis)}</strong>
              </td>
            </tr>
          </table>`;
}

function renderEncouragementCard(
  label: string,
  body: string,
  source: string | undefined,
  textAlign: "left" | "right",
  sourceAlign: "left" | "right",
): string {
  const { storyHtml, takeawayHtml } = splitEncouragementBody(body);
  const sourceHtml = source
    ? `<div style="color: ${colors.bodyLight}; font-family: ${fontFamily}; font-size: 13px; line-height: 20px; margin-top: 14px; text-align: ${sourceAlign};">${escapeHtml(source)}</div>`
    : "";
  const takeawayBlock = takeawayHtml
    ? `<div style="color: ${colors.teal}; font-family: ${fontFamily}; font-size: 16px; font-weight: 700; line-height: 26px; margin-top: 14px; text-align: ${textAlign};">${takeawayHtml}</div>`
    : "";

  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${colors.encouragementSurface}" style="background-color: ${colors.encouragementSurface}; border-collapse: separate; border-radius: 12px; box-shadow: ${cardShadow};">
            <tr>
              <td style="padding: 22px 22px 20px 22px;">
                <div style="color: ${colors.gold}; font-family: ${fontFamily}; font-size: 42px; font-weight: 700; line-height: 36px; text-align: left; margin: 0 0 4px 0;">&ldquo;</div>
                <div style="color: ${colors.gold}; font-family: ${fontFamily}; font-size: 14px; font-weight: 700; line-height: 20px; margin-bottom: 12px; text-align: ${textAlign};">— ${escapeHtml(label)}</div>
                <div style="color: ${colors.bodyMuted}; font-family: ${fontFamily}; font-size: 15px; line-height: 25px; text-align: ${textAlign};">${storyHtml}</div>
                ${takeawayBlock}
                ${sourceHtml}
              </td>
            </tr>
          </table>`;
}

function renderUnsubscribeFooter(
  data: EmailTemplateData,
  copy: (typeof REMINDER_COPY)[ReminderLanguage],
): string {
  const links = data.unsubscribeUrls
    ? `<div style="margin-top: 12px;">
        <a href="${escapeHtml(data.unsubscribeUrls.reminderUrl)}" style="color: ${colors.teal}; font-family: ${fontFamily}; font-size: 13px; line-height: 20px; text-decoration: underline;">${escapeHtml(copy.unsubscribeReminder)}</a>
        <span style="color: ${colors.bodyLight}; padding: 0 8px;">·</span>
        <a href="${escapeHtml(data.unsubscribeUrls.allUrl)}" style="color: ${colors.teal}; font-family: ${fontFamily}; font-size: 13px; line-height: 20px; text-decoration: underline;">${escapeHtml(copy.unsubscribeAll)}</a>
      </div>`
    : "";

  return `<div style="color: ${colors.bodyLight}; font-family: ${fontFamily}; font-size: 13px; line-height: 20px;">${escapeHtml(copy.footerPreferenceNote)}</div>${links}`;
}

export function generateReminderEmailSubject(data: EmailTemplateData): string {
  return buildViewModel(data).subject;
}

export function generateReminderEmailHTML(data: EmailTemplateData): string {
  const {
    amount,
    balanceBadge,
    copy,
    encouragement,
    greeting,
    state,
  } = buildViewModel(data);
  const direction = copy.direction;
  const textAlign = direction === "rtl" ? "right" : "left";
  const sourceAlign = direction === "rtl" ? "left" : "right";
  const ctaArrow = direction === "rtl" ? " ←" : " →";

  const bodyHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; direction: ${direction}; text-align: ${textAlign};">
      <tr>
        <td style="color: ${colors.teal}; font-family: ${fontFamily}; font-size: 24px; font-weight: 500; line-height: 32px; padding: 0 0 10px 0; text-align: ${textAlign};">${escapeHtml(greeting)}</td>
      </tr>
      <tr>
        <td style="color: ${colors.bodyMuted}; font-family: ${fontFamily}; font-size: 16px; line-height: 26px; padding: 0 0 24px 0; text-align: ${textAlign};">${escapeHtml(copy.reminder)}</td>
      </tr>
      <tr>
        <td style="padding: 0 0 16px 0;">${renderBalancePanel(amount, balanceBadge, state, copy.verification)}</td>
      </tr>
      <tr>
        <td style="padding: 0 0 18px 0;">${renderImportHint(copy.importHintPrefix, copy.importHintEmphasis, textAlign)}</td>
      </tr>
      <tr>
        <td style="padding: 0 0 28px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: separate; border-radius: 10px; box-shadow: ${buttonShadow};">
            <tr>
              <td align="center" bgcolor="${colors.teal}" style="background-color: ${colors.teal}; border-radius: 10px;">
                <a href="${APP_URL}" style="display: block; background-color: ${colors.teal}; color: ${colors.buttonText} !important; border-radius: 10px; font-family: ${fontFamily}; font-size: 16px; font-weight: 700; line-height: 20px; padding: 16px 24px; text-align: center; text-decoration: none;">${escapeHtml(copy.cta)}${ctaArrow}</a>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 0;">
          ${renderEncouragementCard(
            copy.encouragementLabel,
            encouragement.body,
            encouragement.source,
            textAlign,
            sourceAlign,
          )}
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
