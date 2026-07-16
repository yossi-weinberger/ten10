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

/** Soft teal/gold washes from the approved user-variant demo (cream bgcolor is the solid fallback). */
const USER_HEADER_BACKGROUND_IMAGE =
  "radial-gradient(circle at 105% -10%, rgba(17,103,106,.26), transparent 46%), radial-gradient(circle at -5% 115%, rgba(240,192,0,.31), transparent 42%)";

const USER_CARD_BACKGROUND = "#f7f3e7";
const USER_FOOTER_BACKGROUND = "#efebdf";

export function renderUserEmailShell(input: EmailShellInput): string {
  const logoUrl = escapeHtml(EMAIL_TOKENS.logoUrl);
  const headerSlogan = escapeHtml(input.headerSlogan);
  const maxWidth = input.maxWidth ?? EMAIL_TOKENS.userWidth;
  const footerRow = input.footerHtml
    ? `
            <tr>
              <td bgcolor="${USER_FOOTER_BACKGROUND}" style="background-color: ${USER_FOOTER_BACKGROUND}; border-top: 1px solid ${EMAIL_TOKENS.colors.border}; padding: 19px 24px; color: #6b7471; direction: ${input.dir}; font-family: ${EMAIL_TOKENS.fontFamily}; font-size: 11px; line-height: 18px; text-align: center;">
                ${input.footerHtml}
              </td>
            </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="${input.lang}" dir="${input.dir}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin: 0; padding: 0; background-color: #e9e7df; direction: ${input.dir}; font-family: ${EMAIL_TOKENS.fontFamily};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#e9e7df" style="width: 100%; margin: 0; padding: 0; background-color: #e9e7df; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 24px 12px;">
          <table role="presentation" width="${maxWidth}" cellspacing="0" cellpadding="0" border="0" bgcolor="${USER_CARD_BACKGROUND}" style="width: 100%; max-width: ${maxWidth}px; background-color: ${USER_CARD_BACKGROUND}; border-collapse: collapse; border: 1px solid #d4d0c3;">
            <tr>
              <td align="center" bgcolor="${EMAIL_TOKENS.colors.cream}" style="padding: 29px 28px 22px 28px; background-color: ${EMAIL_TOKENS.colors.cream}; background-image: ${USER_HEADER_BACKGROUND_IMAGE}; background-repeat: no-repeat; border-bottom: 1px solid ${EMAIL_TOKENS.colors.border}; text-align: center;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td align="center" style="padding: 0;">
                      <img src="${logoUrl}" width="142" alt="Ten10" style="display: block; width: 142px; max-width: 142px; height: auto; margin: 0 auto; border: 0; outline: none; text-decoration: none;">
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="padding: 13px 0 9px 0;">
                      <table role="presentation" width="142" cellspacing="0" cellpadding="0" border="0" style="width: 142px; border-collapse: collapse;">
                        <tr>
                          <td bgcolor="${EMAIL_TOKENS.colors.gold}" height="4" style="height: 4px; line-height: 4px; font-size: 0; background-color: ${EMAIL_TOKENS.colors.gold};">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="color: ${EMAIL_TOKENS.colors.teal}; font-family: ${EMAIL_TOKENS.fontFamily}; font-size: 12px; font-weight: 600; line-height: 18px; padding: 0;">${headerSlogan}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding: 31px 32px 28px 32px; color: ${EMAIL_TOKENS.colors.text}; direction: ${input.dir}; font-family: ${EMAIL_TOKENS.fontFamily}; background-color: ${USER_CARD_BACKGROUND};">
                ${input.bodyHtml}
              </td>
            </tr>${footerRow}
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
