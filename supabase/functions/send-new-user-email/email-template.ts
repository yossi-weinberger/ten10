import { renderAdminBadge } from "../_shared/email-admin-primitives.ts";
import { renderAdminEmailShell } from "../_shared/email-layout-admin.ts";
import { escapeHtml } from "../_shared/escape-html.ts";
import { EMAIL_TOKENS } from "../_shared/email-tokens.ts";

export interface SummaryRow {
  id: string;
  full_name?: string | null;
  updated_at?: string | null;
  reminder_enabled?: boolean | null;
  reminder_day_of_month?: number | null;
  mailing_list_consent?: boolean | null;
  created_at?: string | null;
  email: string | null;
  auth_created_at: string | null;
  avatar_url?: string | null;
}

export interface ReminderRunLog {
  run_at: string;
  day_of_month: number;
  was_reminder_day: boolean;
  was_shabbat: boolean;
  users_processed: number;
  emails_sent: number;
  emails_failed: number;
  notes: string | null;
}

export interface DownloadRequest {
  id: string;
  created_at: string;
  from_email: string;
  status: string;
  reason: string | null;
}

export interface BuildEmailBodiesInput {
  rows: SummaryRow[];
  hours: number;
  downloadRequests: {
    windowCount: number;
    total: number;
    details: DownloadRequest[];
  };
  totalUsers: number;
  reminderLogs: ReminderRunLog[];
  github: {
    totalDownloads: number | null;
    last24h: number | null;
    latestVersion: string;
    latestDownloads: number | null;
  };
}

export interface EmailBodies {
  htmlBody: string;
  textBody: string;
}

const ISRAEL_TZ = "Asia/Jerusalem";
const { colors } = EMAIL_TOKENS;
const TITLE_COLOR = colors.adminTitle;
const MUTED_COLOR = colors.bodyLight;
const VALUE_COLOR = colors.adminValue;
const ROW_BORDER = colors.adminRowBorder;
const METRIC_BORDER = colors.adminMetricBorder;

function formatBoolean(value: boolean | null | undefined): string {
  return value === true ? "Yes" : value === false ? "No" : "Unknown";
}

function formatDateParts(value: string | null | undefined): {
  date: string;
  time: string;
} {
  if (!value) {
    return { date: "Unknown", time: "Unknown" };
  }

  const dateValue = new Date(value);
  if (Number.isNaN(dateValue.getTime())) {
    return { date: value, time: value };
  }

  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: ISRAEL_TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(dateValue);
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: ISRAEL_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(dateValue);

  return { date, time };
}

function renderStackedCards(cardsHtml: string): string {
  return `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; border-collapse: collapse;">
  ${cardsHtml}
</table>`;
}

function renderDownloadCard(request: DownloadRequest): string {
  const parts = formatDateParts(request.created_at);
  const statusBadge =
    request.status === "sent"
      ? renderAdminBadge("✓ sent", "ok")
      : request.status === "blocked"
        ? renderAdminBadge("blocked", "warn")
        : renderAdminBadge("error", "error");
  const reasonRow = request.reason
    ? `<tr>
              <td style="padding: 0; color: ${MUTED_COLOR}; font-size: 12px; line-height: 18px;">${escapeHtml(request.reason)}</td>
            </tr>`
    : "";

  return `<tr>
    <td style="padding: 0 0 10px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_TOKENS.colors.surface}" style="width: 100%; background-color: ${EMAIL_TOKENS.colors.surface}; border-collapse: collapse; border: 1px solid ${ROW_BORDER}; border-radius: 8px;">
        <tr>
          <td style="padding: 12px 14px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
              <tr>
                <td style="padding: 0 0 6px 0; color: #213632; font-size: 13px; font-weight: 700; line-height: 18px; word-break: break-word;">${escapeHtml(request.from_email)}</td>
                <td align="right" valign="top" style="padding: 0 0 6px 10px; white-space: nowrap;">${statusBadge}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 0 0 ${request.reason ? "6px" : "0"} 0; color: ${VALUE_COLOR}; font-size: 12px; line-height: 18px;">${escapeHtml(parts.date)} · ${escapeHtml(parts.time)}</td>
              </tr>
              ${reasonRow}
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function buildDownloadRequestsSection(
  requests: DownloadRequest[],
  hours: number,
): EmailBodies {
  if (requests.length === 0) {
    return {
      htmlBody: `<p style="margin: 0; color: ${MUTED_COLOR}; font-size: 12px; line-height: 18px;">No download requests in the last ${hours}h.</p>`,
      textBody: `No download requests in the last ${hours}h.`,
    };
  }

  return {
    htmlBody: renderStackedCards(requests.map(renderDownloadCard).join("")),
    textBody: requests
      .map((request) => {
        const parts = formatDateParts(request.created_at);
        return `  ${parts.date} ${parts.time} | ${request.from_email} | ${request.status}${request.reason ? ` (${request.reason})` : ""}`;
      })
      .join("\n"),
  };
}

function renderUserCard(row: SummaryRow): string {
  const avatarCell = row.avatar_url
    ? `<img src="${escapeHtml(row.avatar_url)}" alt="avatar" width="36" height="36" style="display: block; width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid ${ROW_BORDER};">`
    : `<div style="width: 36px; height: 36px; border-radius: 50%; background-color: ${ROW_BORDER}; color: ${MUTED_COLOR}; font-size: 10px; line-height: 36px; text-align: center;">N/A</div>`;
  const consentBadge =
    row.mailing_list_consent === true
      ? renderAdminBadge("Yes", "ok")
      : row.mailing_list_consent === false
        ? renderAdminBadge("No", "error")
        : renderAdminBadge("Unknown", "neutral");
  const parts = formatDateParts(row.auth_created_at ?? row.updated_at ?? null);
  const shortId = `${row.id.substring(0, 8)}...`;

  return `<tr>
    <td style="padding: 0 0 10px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_TOKENS.colors.surface}" style="width: 100%; background-color: ${EMAIL_TOKENS.colors.surface}; border-collapse: collapse; border: 1px solid ${ROW_BORDER}; border-radius: 8px;">
        <tr>
          <td width="52" valign="top" style="width: 52px; padding: 12px 0 12px 12px;">${avatarCell}</td>
          <td style="padding: 12px 14px 12px 10px;">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
              <tr>
                <td style="padding: 0 0 4px 0; color: #213632; font-size: 14px; font-weight: 700; line-height: 20px; word-break: break-word;">${escapeHtml(row.full_name ?? "Not provided")}</td>
                <td align="right" valign="top" style="padding: 0 0 4px 10px; white-space: nowrap;">${consentBadge}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 0 0 4px 0; color: ${VALUE_COLOR}; font-size: 12px; line-height: 18px; word-break: break-word;">${escapeHtml(row.email ?? "unknown")}</td>
              </tr>
              <tr>
                <td colspan="2" style="padding: 0; color: ${MUTED_COLOR}; font-size: 11px; line-height: 16px;">${escapeHtml(parts.date)} · ${escapeHtml(parts.time)} · ${escapeHtml(shortId)}</td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function renderMetric(
  label: string,
  value: string | number,
  footer: string,
  isLast = false,
): string {
  const borderRight = isLast ? "0" : `1px solid ${METRIC_BORDER}`;
  return `<td class="ten10-metric" width="33%" valign="top" align="center" style="width: 33.33%; padding: 14px 12px; border-right: ${borderRight}; text-align: center;">
    <div style="color: ${MUTED_COLOR}; font-size: 10px; font-weight: 600; line-height: 14px; letter-spacing: 0.04em; text-transform: uppercase; text-align: center;">${label}</div>
    <div style="color: ${TITLE_COLOR}; font-size: 23px; font-weight: 700; line-height: 28px; margin-top: 4px; text-align: center;">${value}</div>
    <div style="color: ${MUTED_COLOR}; font-size: 11px; line-height: 16px; margin-top: 4px; text-align: center;">${footer}</div>
  </td>`;
}

const METRICS_RESPONSIVE_STYLE = `<style type="text/css">
@media only screen and (max-width: 620px) {
  .ten10-metrics-row td.ten10-metric {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
    box-sizing: border-box !important;
    border-right: 0 !important;
    border-bottom: 1px solid ${METRIC_BORDER} !important;
  }
  .ten10-metrics-row td.ten10-metric:last-child {
    border-bottom: 0 !important;
  }
}
</style>`;

export function generateDailySummarySubject(
  input: BuildEmailBodiesInput,
): string {
  return `[Ten10] Daily Summary: +${input.rows.length} users (${input.totalUsers} total), ${input.downloadRequests.windowCount} downloads`;
}

export function buildEmailBodies(
  input: BuildEmailBodiesInput,
): EmailBodies {
  const { rows, hours, downloadRequests, totalUsers, reminderLogs, github } =
    input;
  const {
    windowCount,
    total,
    details: downloadDetails,
  } = downloadRequests;
  const windowLabel = `Last ${hours} hours`;
  const downloadSection = buildDownloadRequestsSection(downloadDetails, hours);
  const headerSlogan = "DAILY OPERATIONS";

  if (rows.length === 0 && windowCount === 0) {
    const textBody = `${windowLabel}: No new profiles and no new download requests.\nTotal users (all-time): ${totalUsers}`;
    const bodyHtml = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
  <tr>
    <td style="padding: 0 0 12px 0; color: ${TITLE_COLOR}; font-size: 20px; font-weight: 700; line-height: 26px;">Daily Summary</td>
  </tr>
  <tr>
    <td style="padding: 0 0 6px 0; color: ${EMAIL_TOKENS.colors.text}; font-size: 13px; line-height: 20px;">${windowLabel}: No new profiles and no new download requests.</td>
  </tr>
  <tr>
    <td style="padding: 0; color: ${MUTED_COLOR}; font-size: 12px; line-height: 18px;">Total registered users (all-time): <strong style="color: ${TITLE_COLOR};">${totalUsers}</strong></td>
  </tr>
</table>`;

    return {
      htmlBody: renderAdminEmailShell({
        bodyHtml,
        dir: "ltr",
        headerSlogan,
        lang: "en",
        maxWidth: 800,
      }),
      textBody,
    };
  }

  const reminderSent = reminderLogs
    .filter((log) => log.was_reminder_day)
    .reduce((sum, log) => sum + log.emails_sent, 0);
  const reminderFailed = reminderLogs.reduce(
    (sum, log) => sum + log.emails_failed,
    0,
  );
  const wasReminderDay = reminderLogs.some((log) => log.was_reminder_day);
  const wasShabbatSkip =
    !wasReminderDay && reminderLogs.some((log) => log.was_shabbat);
  const reminderStatusLine = wasReminderDay
    ? reminderFailed > 0 && reminderSent === 0
      ? `📧 Reminder emails: <strong style="color: #dc2626;">⚠️ ${reminderFailed} failed, 0 sent</strong>`
      : reminderSent > 0
        ? `📧 Reminder emails: <strong style="color: #166534;">${reminderSent} sent</strong>${reminderFailed > 0 ? ` &nbsp;·&nbsp; <strong style="color: #dc2626;">${reminderFailed} failed</strong>` : ""}`
        : `📧 Reminder emails: reminder day — <strong style="color: ${MUTED_COLOR};">no users configured</strong>`
    : wasShabbatSkip
      ? "📧 Reminder emails: skipped (Shabbat)"
      : reminderFailed > 0
        ? `📧 Reminder emails: <strong style="color: #dc2626;">${reminderFailed} failed</strong>`
        : "📧 Reminder emails: not a reminder day";

  const githubFooter =
    github.totalDownloads !== null
      ? `All-time: <strong style="color: ${TITLE_COLOR};">${github.totalDownloads}</strong><br><span style="font-size: 10px;">${escapeHtml(github.latestVersion)}: ${github.latestDownloads ?? "—"}</span>`
      : "GitHub unavailable";

  const statsSectionHtml = `<div style="margin: 0 0 8px; color: ${MUTED_COLOR}; font-size: 11px; font-weight: 700; line-height: 16px; letter-spacing: 0.04em; text-transform: uppercase;">${windowLabel}</div>
<table role="presentation" class="ten10-metrics" width="100%" cellspacing="0" cellpadding="0" border="0" style="width: 100%; margin: 0 0 14px; border-collapse: collapse; border-top: 1px solid #cfd3ca; border-bottom: 1px solid #cfd3ca;">
  <tr class="ten10-metrics-row">
    ${renderMetric("💻 Email downloads", windowCount, `All-time: <strong style="color: ${TITLE_COLOR};">${total}</strong>`)}
    ${renderMetric("🌐 New web users", rows.length, `All-time: <strong style="color: ${TITLE_COLOR};">${totalUsers}</strong>`)}
    ${renderMetric("📦 GitHub installs", github.last24h !== null ? `+${github.last24h}` : "—", githubFooter, true)}
  </tr>
</table>
<div style="margin: 0 0 18px; padding: 10px 12px; border-top: 1px solid ${METRIC_BORDER}; border-bottom: 1px solid ${METRIC_BORDER}; color: ${VALUE_COLOR}; font-size: 12px; line-height: 18px;">${reminderStatusLine}</div>`;

  const usersSectionHtml =
    rows.length === 0
      ? `<p style="margin: 0; color: ${MUTED_COLOR}; font-size: 12px; line-height: 18px;">No new web users in the last ${hours}h.</p>`
      : renderStackedCards(rows.map(renderUserCard).join(""));

  const bodyHtml = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
  <tr>
    <td style="padding: 0 0 14px 0; color: ${TITLE_COLOR}; font-size: 20px; font-weight: 700; line-height: 26px;">Daily Summary</td>
  </tr>
  <tr>
    <td style="padding: 0;">${statsSectionHtml}</td>
  </tr>
  <tr>
    <td style="padding: 0 0 8px 0; color: ${TITLE_COLOR}; font-size: 13px; font-weight: 700; line-height: 18px;">🌐 Web Platform — New Users</td>
  </tr>
  <tr>
    <td style="padding: 0 0 18px 0;">${usersSectionHtml}</td>
  </tr>
  <tr>
    <td style="padding: 0 0 8px 0; border-top: 1px solid ${ROW_BORDER}; color: ${TITLE_COLOR}; font-size: 13px; font-weight: 700; line-height: 18px; padding-top: 16px;">💻 Desktop Platform — Download Requests</td>
  </tr>
  <tr>
    <td style="padding: 0;">${downloadSection.htmlBody}</td>
  </tr>
</table>`;

  const textBodyLines: string[] = [
    "Daily Summary",
    `${windowLabel}.`,
    "",
    `🌐 Web users last ${hours}h: ${rows.length} (all-time: ${totalUsers})`,
    `💻 Email downloads last ${hours}h: ${windowCount} (all-time: ${total})`,
    `📧 Reminder emails: ${reminderSent} sent | ${reminderFailed} failed`,
    `📦 GitHub installs — last ${hours}h: ${github.last24h !== null ? `+${github.last24h}` : "—"} | all-time: ${github.totalDownloads ?? "—"} | ${github.latestVersion}: ${github.latestDownloads ?? "—"}`,
    "",
  ];

  for (const row of rows) {
    const parts = formatDateParts(
      row.auth_created_at ?? row.updated_at ?? null,
    );
    textBodyLines.push(
      `  - ${row.full_name ?? "Not provided"} | ${row.email ?? "unknown"} | date=${parts.date} ${parts.time} | consent: ${formatBoolean(row.mailing_list_consent)}`,
    );
  }

  textBodyLines.push("");
  textBodyLines.push(
    `💻 Desktop Platform — Download requests last ${hours}h: ${windowCount} (all-time: ${total})`,
  );
  textBodyLines.push(downloadSection.textBody);

  return {
    htmlBody: renderAdminEmailShell({
      bodyHtml,
      dir: "ltr",
      headerSlogan,
      headHtml: METRICS_RESPONSIVE_STYLE,
      lang: "en",
      maxWidth: 800,
    }),
    textBody: textBodyLines.join("\n"),
  };
}
