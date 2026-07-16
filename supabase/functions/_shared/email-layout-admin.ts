import { escapeHtml } from "./escape-html.ts";
import { EMAIL_TOKENS, type EmailShellInput } from "./email-tokens.ts";

const { colors, fontFamily, logoUrl: LOGO_URL, adminHeaderBackgroundImage } =
  EMAIL_TOKENS;

function renderHeaderMeta(headerSlogan: string): string {
  return escapeHtml(headerSlogan)
    .split("\n")
    .filter((line) => line.length > 0)
    .join("<br>");
}

export function renderAdminEmailShell(input: EmailShellInput): string {
  const logoUrl = escapeHtml(LOGO_URL);
  const maxWidth = input.maxWidth ?? EMAIL_TOKENS.adminWidth;
  const headerMeta = renderHeaderMeta(input.headerSlogan);
  // In RTL emails the meta cell lands on the left; left-align Latin ops labels.
  // In LTR emails keep meta on the right.
  const metaAlign = input.dir === "rtl" ? "left" : "right";
  const metaPadding =
    input.dir === "rtl" ? "0 16px 0 0" : "0 0 0 16px";
  const headerMetaCell = headerMeta
    ? `<td align="${metaAlign}" valign="middle" style="color: ${colors.adminMeta}; font-family: ${fontFamily}; font-size: 11px; line-height: 16px; padding: ${metaPadding}; text-align: ${metaAlign}; direction: ltr;">${headerMeta}</td>`
    : `<td style="padding: 0;"></td>`;
  const footerContent = input.footerHtml ??
    `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
                  <tr>
                    <td align="left" style="color: ${colors.adminFooterText}; font-family: ${fontFamily}; font-size: 10px; line-height: 15px; padding: 0;">Ten10 Operations</td>
                    <td align="right" style="color: ${colors.adminFooterText}; font-family: ${fontFamily}; font-size: 10px; line-height: 15px; padding: 0;">Automated internal email</td>
                  </tr>
                </table>`;

  return `<!DOCTYPE html>
<html lang="${input.lang}" dir="${input.dir}">
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    ${input.headHtml ?? ""}
  </head>
  <body style="margin: 0; padding: 0; background-color: ${colors.adminPage}; direction: ${input.dir}; font-family: ${fontFamily};">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${colors.adminPage}" style="width: 100%; margin: 0; padding: 0; background-color: ${colors.adminPage}; border-collapse: collapse;">
      <tr>
        <td align="center" style="padding: 16px 12px;">
          <table role="presentation" width="${maxWidth}" cellspacing="0" cellpadding="0" border="0" bgcolor="${colors.adminPage}" style="width: 100%; max-width: ${maxWidth}px; background-color: ${colors.adminPage}; border-collapse: collapse; border: 1px solid #d8d8cf;">
            <tr>
              <td bgcolor="${colors.surface}" style="padding: 17px 22px; background-color: ${colors.surface}; background-image: ${adminHeaderBackgroundImage}; background-repeat: no-repeat; border-bottom: 3px solid ${colors.gold};">
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
              <td style="padding: 22px; color: ${colors.text}; direction: ${input.dir}; font-family: ${fontFamily}; background-color: ${colors.adminPage};">
                ${input.bodyHtml}
              </td>
            </tr>
            <tr>
              <td bgcolor="${colors.adminFooter}" style="background-color: ${colors.adminFooter}; border-top: 1px solid #d8d8cf; padding: 13px 22px; direction: ltr;">
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
