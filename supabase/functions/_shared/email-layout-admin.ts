import { EMAIL_TOKENS, type EmailShellInput } from "./email-tokens.ts";

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPE_MAP[character]);
}

/** Compact ops chrome from the approved admin-variant demo. */
const ADMIN_PAGE_BACKGROUND = "#f4f3ed";
const ADMIN_CARD_BACKGROUND = "#f4f3ed";
const ADMIN_HEADER_BACKGROUND = "#fffdf8";
const ADMIN_HEADER_BACKGROUND_IMAGE =
  "radial-gradient(circle at 100% 0%, rgba(17,103,106,.20), transparent 50%)";
const ADMIN_FOOTER_BACKGROUND = "#e9eae4";
const ADMIN_META_COLOR = "#68736f";
const ADMIN_FOOTER_COLOR = "#727b78";

function renderHeaderMeta(headerSlogan: string): string {
  return escapeHtml(headerSlogan)
    .split("\n")
    .filter((line) => line.length > 0)
    .join("<br>");
}

export function renderAdminEmailShell(input: EmailShellInput): string {
  const logoUrl = escapeHtml(EMAIL_TOKENS.logoUrl);
  const maxWidth = input.maxWidth ?? EMAIL_TOKENS.adminWidth;
  const headerMeta = renderHeaderMeta(input.headerSlogan);
  // In RTL emails the meta cell lands on the left; left-align Latin ops labels.
  // In LTR emails keep meta on the right.
  const metaAlign = input.dir === "rtl" ? "left" : "right";
  const metaPadding =
    input.dir === "rtl" ? "0 16px 0 0" : "0 0 0 16px";
  const headerMetaCell = headerMeta
    ? `<td align="${metaAlign}" valign="middle" style="color: ${ADMIN_META_COLOR}; font-family: ${EMAIL_TOKENS.fontFamily}; font-size: 11px; line-height: 16px; padding: ${metaPadding}; text-align: ${metaAlign}; direction: ltr;">${headerMeta}</td>`
    : `<td style="padding: 0;"></td>`;
  const footerContent = input.footerHtml ??
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td align="left" style="color: ${ADMIN_FOOTER_COLOR}; font-family: ${EMAIL_TOKENS.fontFamily}; font-size: 10px; line-height: 15px; padding: 0;">Ten10 Operations</td>
                    <td align="right" style="color: ${ADMIN_FOOTER_COLOR}; font-family: ${EMAIL_TOKENS.fontFamily}; font-size: 10px; line-height: 15px; padding: 0;">Automated internal email</td>
                  </tr>
                </table>`;

  return `<!DOCTYPE html>
<html lang="${input.lang}" dir="${input.dir}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${input.headHtml ?? ""}
  </head>
  <body style="margin: 0; padding: 0; background-color: ${ADMIN_PAGE_BACKGROUND}; direction: ${input.dir}; font-family: ${EMAIL_TOKENS.fontFamily};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${ADMIN_PAGE_BACKGROUND}" style="width: 100%; margin: 0; padding: 0; background-color: ${ADMIN_PAGE_BACKGROUND}; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 16px 12px;">
          <table role="presentation" width="${maxWidth}" cellspacing="0" cellpadding="0" border="0" bgcolor="${ADMIN_CARD_BACKGROUND}" style="width: 100%; max-width: ${maxWidth}px; background-color: ${ADMIN_CARD_BACKGROUND}; border-collapse: collapse; border: 1px solid #d8d8cf;">
            <tr>
              <td bgcolor="${ADMIN_HEADER_BACKGROUND}" style="padding: 17px 22px; background-color: ${ADMIN_HEADER_BACKGROUND}; background-image: ${ADMIN_HEADER_BACKGROUND_IMAGE}; background-repeat: no-repeat; border-bottom: 3px solid ${EMAIL_TOKENS.colors.gold};">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td align="left" valign="middle" style="padding: 0; width: 140px;">
                      <img src="${logoUrl}" width="112" alt="Ten10" style="display: block; width: 112px; max-width: 112px; height: auto; border: 0; outline: none; text-decoration: none;">
                    </td>
                    ${headerMetaCell}
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 22px; color: ${EMAIL_TOKENS.colors.text}; direction: ${input.dir}; font-family: ${EMAIL_TOKENS.fontFamily}; background-color: ${ADMIN_CARD_BACKGROUND};">
                ${input.bodyHtml}
              </td>
            </tr>
            <tr>
              <td bgcolor="${ADMIN_FOOTER_BACKGROUND}" style="background-color: ${ADMIN_FOOTER_BACKGROUND}; border-top: 1px solid #d8d8cf; padding: 13px 22px; direction: ltr;">
                ${footerContent}
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
