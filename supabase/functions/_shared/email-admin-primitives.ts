import { escapeHtml } from "./escape-html.ts";
import { EMAIL_TOKENS } from "./email-tokens.ts";

const { colors, fontFamily } = EMAIL_TOKENS;

export type AdminBadgeTone = "ok" | "warn" | "error" | "neutral";

const BADGE_TONES: Record<
  AdminBadgeTone,
  { background: string; color: string }
> = {
  ok: { background: colors.successSurface, color: colors.teal },
  warn: { background: colors.warnSurface, color: colors.warnText },
  error: { background: colors.dangerSurface, color: colors.dangerText },
  neutral: { background: colors.cream, color: colors.bodyLight },
};

/** Compact pill used in admin tables (consent, status, etc.). */
export function renderAdminBadge(
  label: string,
  tone: AdminBadgeTone = "neutral",
): string {
  const { background, color } = BADGE_TONES[tone];
  return `<span style="display: inline-block; padding: 2px 7px; border-radius: 8px; font-size: 9px; font-weight: 700; background-color: ${background}; color: ${color};">${escapeHtml(label)}</span>`;
}

export function renderAdminTh(
  label: string,
  align: "left" | "right" = "left",
): string {
  return `<th style="padding: 10px 9px; text-align: ${align}; border-bottom: 2px solid ${colors.teal}; color: ${colors.adminLabel}; font-family: ${fontFamily}; font-size: 11px; font-weight: 700; line-height: 16px;">${escapeHtml(label)}</th>`;
}

export function renderAdminTd(
  content: string,
  options: {
    align?: "left" | "right" | "center";
    emphasis?: boolean;
    muted?: boolean;
    raw?: boolean;
  } = {},
): string {
  const align = options.align ?? "left";
  const color = options.emphasis
    ? "#213632"
    : options.muted
      ? colors.bodyLight
      : colors.adminValue;
  const weight = options.emphasis ? "700" : "400";
  const inner = options.raw ? content : escapeHtml(content);
  return `<td style="padding: 10px 9px; border-bottom: 1px solid ${colors.adminRowBorder}; color: ${color}; font-family: ${fontFamily}; font-size: 11px; font-weight: ${weight}; line-height: 16px; text-align: ${align}; vertical-align: middle;">${inner}</td>`;
}

/** Cream note block with a gold accent bar (download "שים לב" / reminder import hint). */
export function renderGoldAccentCallout(
  html: string,
  options: {
    accentSide: "left" | "right";
    textAlign?: "left" | "right" | "center";
    fontSize?: number;
    lineHeight?: number;
  },
): string {
  const textAlign = options.textAlign ?? options.accentSide;
  const fontSize = options.fontSize ?? 13;
  const lineHeight = options.lineHeight ?? 22;
  const borderSide =
    options.accentSide === "right" ? "border-right" : "border-left";
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${colors.cream}" style="background-color: ${colors.cream}; border-collapse: collapse; border-radius: 8px;">
            <tr>
              <td style="padding: 14px 16px; color: ${colors.bodyMuted}; font-family: ${fontFamily}; font-size: ${fontSize}px; line-height: ${lineHeight}px; text-align: ${textAlign}; ${borderSide}: 4px solid ${colors.gold};">
                ${html}
              </td>
            </tr>
          </table>`;
}
