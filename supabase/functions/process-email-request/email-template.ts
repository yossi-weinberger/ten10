import { EMAIL_TOKENS } from "../_shared/email-tokens.ts";
import { renderUserEmailShell } from "../_shared/email-layout-user.ts";

export interface DownloadEmailInput {
  jumboMailLink: string;
  directDownloadLink: string | null;
}

export interface RenderedEmail {
  subject: string;
  htmlBody: string;
  textBody: string;
}

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

const { colors, fontFamily } = EMAIL_TOKENS;

const downloadButtonStyle =
  `display: block; background-color: ${colors.teal}; color: #fffdf8 !important; border-radius: 8px; padding: 15px 22px; text-decoration: none; font-family: ${fontFamily}; font-size: 15px; font-weight: 700; line-height: 20px; text-align: center;`;

const tertiaryButtonStyle =
  `display: block; background-color: transparent; color: ${colors.teal}; border: 1px solid #cfc9b8; border-radius: 8px; padding: 12px 20px; text-decoration: none; font-family: ${fontFamily}; font-size: 14px; font-weight: 600; line-height: 20px; text-align: center;`;

export function renderDownloadEmail(input: DownloadEmailInput): RenderedEmail {
  const { directDownloadLink, jumboMailLink } = input;
  const escapedJumboMailLink = escapeHtml(jumboMailLink);
  const escapedDirectDownloadLink = directDownloadLink
    ? escapeHtml(directDownloadLink)
    : null;

  const textBody = `
שלום,

לבקשתך, הנה הקישורים להורדת תוכנת Ten10:

1. להורדה דרך ג'מבו מייל (למי שחסום לו הגלישה ויש לו מייל בלבד):
${jumboMailLink}

${
  directDownloadLink
    ? `2. להורדה ישירה:
${directDownloadLink}`
    : ""
}

אם הקישור לא נפתח, נא לבקש מסינון האינטרנט שלך לאשר אותו.

בברכה,
צוות Ten10
    `.trim();

  const directDownloadBlock = escapedDirectDownloadLink
    ? `
      <tr>
        <td style="padding: 0 0 22px 0;">
          <a href="${escapedDirectDownloadLink}" style="${downloadButtonStyle}">להורדה ישירה</a>
        </td>
      </tr>`
    : "";

  const bodyHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; direction: rtl; text-align: right;">
      <tr>
        <td style="color: ${colors.teal}; font-family: ${fontFamily}; font-size: 17px; font-weight: 500; line-height: 26px; padding: 0 0 7px 0;">שלום,</td>
      </tr>
      <tr>
        <td style="color: #4a5955; font-family: ${fontFamily}; font-size: 14px; line-height: 24px; padding: 0 0 26px 0;">לבקשתך, הנה הקישורים להורדת תוכנת Ten10 לניהול מעשרות:</td>
      </tr>
      <tr>
        <td style="padding: 0 0 10px 0;">
          <a href="${escapedJumboMailLink}" style="${downloadButtonStyle}">להורדה דרך ג'מבו מייל</a>
        </td>
      </tr>
      <tr>
        <td align="center" style="color: #6b7471; font-family: ${fontFamily}; font-size: 13px; line-height: 20px; padding: 0 0 8px 0; text-align: center;">למי שחסום לו הגלישה ויש לו מייל בלבד</td>
      </tr>
      <tr>
        <td align="center" style="color: #4a5955; font-family: ${fontFamily}; font-size: 13px; line-height: 20px; padding: 0 0 26px 0; text-align: center;">
          או לחץ על הקישור: <a href="${escapedJumboMailLink}" style="color: ${colors.teal}; word-break: break-all; text-decoration: underline;">${escapedJumboMailLink}</a>
        </td>
      </tr>${directDownloadBlock}
      <tr>
        <td style="padding: 0 0 22px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${colors.cream}" style="background-color: ${colors.cream}; border-collapse: collapse; border-radius: 8px;">
            <tr>
              <td style="padding: 14px 16px; color: ${colors.text}; font-family: ${fontFamily}; font-size: 13px; line-height: 22px; text-align: right; border-right: 4px solid ${colors.gold};">
                <strong style="color: ${colors.teal};">שים לב:</strong> אם הקישור לא נפתח (למשל בנטפרי/אתרוג), ייתכן שצריך לבקש אישור מיוחד מהסינון שלך עבור הקישור הספציפי הזה.
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 0 28px 0;">
          <a href="https://ten10-app.com/landing" style="${tertiaryButtonStyle}">לפרטים נוספים על התוכנה</a>
        </td>
      </tr>
      <tr>
        <td align="left" style="padding: 0; text-align: left;">
          <table role="presentation" align="left" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; margin: 0; text-align: left;">
            <tr>
              <td dir="rtl" style="color: #4a5955; font-family: ${fontFamily}; font-size: 14px; line-height: 22px; text-align: left; direction: rtl;">בברכה,<br>צוות Ten10</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `.trim();

  const footerHtml = `
    <p style="margin: 0 0 8px 0;">נא לא להשיב למייל זה. לשאלות ותמיכה ניתן לפנות לכתובת: <a href="mailto:support@ten10-app.com" style="color: ${colors.teal}; text-decoration: underline;">support@ten10-app.com</a></p>
    <p style="margin: 0 0 6px 0;">קישור ישיר (JumboMail) להעתקה:<br>${escapedJumboMailLink}</p>
    ${
      escapedDirectDownloadLink
        ? `<p style="margin: 0;">קישור להורדה ישירה:<br>${escapedDirectDownloadLink}</p>`
        : ""
    }
  `.trim();

  const htmlBody = renderUserEmailShell({
    bodyHtml,
    dir: "rtl",
    footerHtml,
    headerSlogan: "ניהול מעשרות ותקציב פיננסי פשוט ומדויק",
    lang: "he",
  });

  return {
    htmlBody,
    subject: "קישור להורדת Ten10",
    textBody,
  };
}
