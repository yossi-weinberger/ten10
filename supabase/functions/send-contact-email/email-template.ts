import { renderAdminEmailShell } from "../_shared/email-layout-admin.ts";
import { EMAIL_TOKENS } from "../_shared/email-tokens.ts";

export interface ContactMessageRecord {
  id: string;
  created_at: string;
  channel: "halacha" | "dev";
  subject: string;
  body: string;
  severity?: "low" | "med" | "high";
  attachments?: { path: string; name: string }[];
  client_platform: string;
  app_version?: string;
  locale?: string;
  ip?: string;
  user_id?: string;
  user_name?: string;
  user_email?: string;
  session_id?: string;
  user_agent?: string;
}

export interface ContactEmailTemplateInput {
  channel: "halacha" | "dev";
  ticketNumber: string;
  record: ContactMessageRecord;
  attachmentLinksHtml: string;
}

const HTML_ESCAPE_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

const HEBREW_SEVERITY_LABELS: Record<
  NonNullable<ContactMessageRecord["severity"]>,
  string
> = {
  high: "גבוהה",
  low: "נמוכה",
  med: "בינונית",
};

const ENGLISH_SEVERITY_LABELS: Record<
  NonNullable<ContactMessageRecord["severity"]>,
  string
> = {
  high: "High",
  low: "Low",
  med: "Medium",
};

const SEVERITY_STYLES: Record<
  NonNullable<ContactMessageRecord["severity"]>,
  { backgroundColor: string; textColor: string }
> = {
  high: { backgroundColor: "#fee2e2", textColor: "#991b1b" },
  low: { backgroundColor: "#e0eee9", textColor: "#11676a" },
  med: { backgroundColor: "#fef3c7", textColor: "#92400e" },
};

const TITLE_COLOR = "#173e3e";
const LABEL_COLOR = "#697470";
const VALUE_COLOR = "#53615e";
const ROW_BORDER = "#e0ddd2";

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => HTML_ESCAPE_MAP[character]);
}

export function renderContactAttachmentListItem(
  label: string,
  signedUrl: string | null,
): string {
  const escapedLabel = escapeHtml(label);

  if (!signedUrl) {
    return `<li style="margin: 0 0 4px; color: ${VALUE_COLOR}; font-size: 12px; line-height: 18px;">${escapedLabel} (Error generating link)</li>`;
  }

  return `<li style="margin: 0 0 4px; font-size: 12px; line-height: 18px;"><a href="${escapeHtml(signedUrl)}" style="font-weight: 700; color: ${EMAIL_TOKENS.colors.teal}; text-decoration: underline;">${escapedLabel}</a></li>`;
}

export function renderContactEmailSubject(
  channel: ContactEmailTemplateInput["channel"],
  ticketNumber: string,
  subject: string,
): string {
  const channelLabel = channel === "halacha" ? "HALACHA" : "DEV";
  return `[TEN10][${channelLabel}] #${ticketNumber} - ${subject}`;
}

export function renderContactEmail(
  input: ContactEmailTemplateInput,
): { htmlBody: string; textBody: string } {
  const { attachmentLinksHtml, channel, record, ticketNumber } = input;
  const escapedTicketNumber = escapeHtml(ticketNumber);
  const escapedSubject = escapeHtml(record.subject);
  const escapedBody = escapeHtml(record.body);
  const isHebrew = channel === "halacha";
  const labelColumnAlign = isHebrew ? "right" : "left";
  const messageBorderSide = isHebrew ? "right" : "left";
  const metadataLabelTag = isHebrew ? "span" : "strong";
  const metadataValueTag = isHebrew ? "strong" : "span";
  const userName = escapeHtml(
    record.user_name || (isHebrew ? "אנונימי" : "Anonymous"),
  );
  const userEmail = escapeHtml(
    record.user_email || (isHebrew ? "לא צוין" : "No email"),
  );
  const severityValue = record.severity
    ? isHebrew
      ? `חומרה: ${HEBREW_SEVERITY_LABELS[record.severity]}`
      : `<span style="display: inline-block; padding: 2px 7px; background-color: ${SEVERITY_STYLES[record.severity].backgroundColor}; color: ${SEVERITY_STYLES[record.severity].textColor}; font-size: 10px; font-weight: 700; border-radius: 8px; text-transform: uppercase;">${ENGLISH_SEVERITY_LABELS[record.severity]}</span>`
    : null;
  const metadataRows = isHebrew
    ? [
        ["פלטפורמה", record.client_platform],
        ["גרסת אפליקציה", record.app_version || "לא זמין"],
        ["שפה", record.locale || "לא זמין"],
        ["מזהה משתמש", record.user_id || "אנונימי"],
        ["IP", record.ip || "לא זמין"],
        ["User Agent", record.user_agent || "לא זמין"],
      ]
    : [
        ["Platform", record.client_platform],
        ["App Version", record.app_version || "N/A"],
        ["Locale", record.locale || "N/A"],
        ["User ID", record.user_id || "Anonymous"],
        ["IP", record.ip || "N/A"],
        ["User Agent", record.user_agent || "N/A"],
      ];
  const infoRows = [
    [isHebrew ? "מאת:" : "From:", `${userName} (${userEmail})`],
    [isHebrew ? "מספר כרטיס:" : "Ticket ID:", escapedTicketNumber],
    [isHebrew ? "נושא:" : "Subject:", escapedSubject],
    ...(severityValue
      ? [[isHebrew ? "חומרה:" : "Severity:", severityValue]]
      : []),
  ];
  const infoRowsHtml = infoRows
    .map(
      ([label, value], index) => `
        <tr>
          <td style="padding: 4px 0; width: 110px; color: ${LABEL_COLOR}; font-size: 11px; font-weight: 700; line-height: 16px; text-align: ${labelColumnAlign}; vertical-align: top;">${label}</td>
          <td style="padding: 4px 10px; color: ${VALUE_COLOR}; font-size: 12px; line-height: 18px;">${
            index === 2 ? `<strong style="color: ${TITLE_COLOR};">${value}</strong>` : value
          }</td>
        </tr>`,
    )
    .join("");
  const metadataRowsHtml = metadataRows
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 7px 9px; border-bottom: 1px solid ${ROW_BORDER}; color: ${LABEL_COLOR}; font-size: 11px; line-height: 16px;"><${metadataLabelTag}>${label}</${metadataLabelTag}></td>
          <td style="padding: 7px 9px; border-bottom: 1px solid ${ROW_BORDER}; color: ${VALUE_COLOR}; font-size: 11px; line-height: 16px;"><${metadataValueTag}>${escapeHtml(value)}</${metadataValueTag}></td>
        </tr>`,
    )
    .join("");
  const bodyHtml = `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse; direction: ${isHebrew ? "rtl" : "ltr"}; text-align: ${labelColumnAlign};">
      <tr>
        <td style="padding: 0 0 14px 0; color: ${TITLE_COLOR}; font-size: 20px; font-weight: 700; line-height: 26px;">${isHebrew ? "פנייה חדשה לרב" : "New Contact Message"}</td>
      </tr>
      <tr>
        <td style="padding: 0 0 14px 0;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
            ${infoRowsHtml}
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding: 0 0 14px 0;">
          <div style="background-color: ${EMAIL_TOKENS.colors.surface}; padding: 12px 14px; border-${messageBorderSide}: 3px solid ${EMAIL_TOKENS.colors.teal}; white-space: pre-wrap; font-size: 13px; line-height: 20px; color: ${EMAIL_TOKENS.colors.text};">${escapedBody}</div>
        </td>
      </tr>
      ${
        attachmentLinksHtml
          ? `<tr>
        <td style="padding: 0 0 14px 0;">
          <div style="background-color: ${EMAIL_TOKENS.colors.surface}; border: 1px solid ${ROW_BORDER}; padding: 12px 14px;">
            <div style="margin: 0 0 8px; color: ${TITLE_COLOR}; font-size: 12px; font-weight: 700; line-height: 18px;">${isHebrew ? "קבצים מצורפים:" : "Attachments:"}</div>
            <div>${attachmentLinksHtml}</div>
          </div>
        </td>
      </tr>`
          : ""
      }
      <tr>
        <td style="padding: 0;">
          <div style="color: ${TITLE_COLOR}; font-size: 12px; font-weight: 700; line-height: 18px; margin: 0 0 8px;">${isHebrew ? "מידע טכני:" : "Technical Metadata:"}</div>
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_TOKENS.colors.surface}" style="width: 100%; background-color: ${EMAIL_TOKENS.colors.surface}; border-collapse: collapse;">
            <tbody>${metadataRowsHtml}</tbody>
          </table>
        </td>
      </tr>
    </table>
  `;
  const htmlBody = renderAdminEmailShell({
    bodyHtml,
    dir: isHebrew ? "rtl" : "ltr",
    headerSlogan: channel === "halacha" ? "CONTACT · HALACHA" : "CONTACT · DEV",
    lang: isHebrew ? "he" : "en",
  });
  const textBody = isHebrew
    ? `פנייה חדשה לרב. כרטיס: ${ticketNumber}. נושא: ${record.subject}. הודעה: ${record.body}`
    : `New contact message. Ticket: ${ticketNumber}. Subject: ${record.subject}.${
        record.severity
          ? ` Severity: ${ENGLISH_SEVERITY_LABELS[record.severity]}.`
          : ""
      } Message: ${record.body}`;

  return { htmlBody, textBody };
}
