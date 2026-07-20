import { escapeHtml } from "./escape-html.ts";
import { EMAIL_TOKENS, type EmailShellInput } from "./email-tokens.ts";

const { colors, fontFamily, logoUrl: LOGO_URL, userHeaderBackgroundImage } =
  EMAIL_TOKENS;

export function renderUserEmailShell(input: EmailShellInput): string {
  const logoUrl = escapeHtml(LOGO_URL);
  const headerSlogan = escapeHtml(input.headerSlogan);
  const maxWidth = input.maxWidth ?? EMAIL_TOKENS.userWidth;
  const titleTag = input.title
    ? `\n    <title>${escapeHtml(input.title)}</title>`
    : "";
  const footerRow = input.footerHtml
    ? `
            <tr>
              <td bgcolor="${colors.userFooter}" style="background-color: ${colors.userFooter}; border-top: 1px solid ${colors.border}; padding: 19px 24px; color: ${colors.bodyLight}; direction: ${input.dir}; font-family: ${fontFamily}; font-size: 11px; line-height: 18px; text-align: center;">
                ${input.footerHtml}
              </td>
            </tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="${input.lang}" dir="${input.dir}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">${titleTag}
    ${input.headHtml ?? ""}
  </head>
  <body style="margin: 0; padding: 0; background-color: ${colors.userPage}; direction: ${input.dir}; font-family: ${fontFamily};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${colors.userPage}" style="width: 100%; margin: 0; padding: 0; background-color: ${colors.userPage}; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 24px 12px;">
          <table role="presentation" width="${maxWidth}" cellspacing="0" cellpadding="0" border="0" bgcolor="${colors.userCard}" style="width: 100%; max-width: ${maxWidth}px; background-color: ${colors.userCard}; border-collapse: collapse; border: 1px solid ${colors.userCardBorder};">
            <tr>
              <td align="center" bgcolor="${colors.cream}" style="padding: 29px 28px 22px 28px; background-color: ${colors.cream}; background-image: ${userHeaderBackgroundImage}; background-repeat: no-repeat; border-bottom: 1px solid ${colors.border}; text-align: center;">
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
                          <td bgcolor="${colors.gold}" height="4" style="height: 4px; line-height: 4px; font-size: 0; background-color: ${colors.gold};">&nbsp;</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td align="center" style="color: ${colors.teal}; font-family: ${fontFamily}; font-size: 12px; font-weight: 600; line-height: 18px; padding: 0;">${headerSlogan}</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td bgcolor="${colors.userBody}" style="padding: 31px 32px 28px 32px; color: ${colors.text}; direction: ${input.dir}; font-family: ${fontFamily}; background-color: ${colors.userBody};">
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
