import { renderAdminEmailShell } from "../_shared/email-layout-admin.ts";
import { EMAIL_TOKENS } from "../_shared/email-tokens.ts";

export interface CronJobFailure {
  jobid: number;
  jobname: string;
  runid: number;
  status: string;
  return_message: string;
  start_time: string;
  end_time: string;
  duration_seconds?: number;
}

const LABEL_COLOR = "#43514d";
const VALUE_COLOR = "#53615e";
const ROW_BORDER = "#e0ddd2";
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

function formatFailureTime(value: string): string {
  return new Date(value).toLocaleString();
}

export function generateAlertEmailSubject(
  failures: CronJobFailure[],
): string {
  return `[Ten10 Alert] ${failures.length} Cron Job Failure(s) Detected`;
}

export function generateAlertEmailHTML(failures: CronJobFailure[]): string {
  const rowsHtml = failures
    .map((failure) => {
      const startTime = formatFailureTime(failure.start_time);

      return `<tr>
        <td style="padding: 10px 9px; border-bottom: 1px solid ${ROW_BORDER}; color: #213632; font-size: 11px; font-weight: 700; line-height: 16px;">${escapeHtml(failure.jobname)}</td>
        <td style="padding: 10px 9px; border-bottom: 1px solid ${ROW_BORDER}; color: ${VALUE_COLOR}; font-size: 11px; line-height: 16px;">${escapeHtml(failure.status)}</td>
        <td style="padding: 10px 9px; border-bottom: 1px solid ${ROW_BORDER}; color: ${VALUE_COLOR}; font-size: 11px; line-height: 16px;">${escapeHtml(failure.return_message || "N/A")}</td>
        <td style="padding: 10px 9px; border-bottom: 1px solid ${ROW_BORDER}; color: ${VALUE_COLOR}; font-size: 11px; line-height: 16px;">${escapeHtml(startTime)}</td>
      </tr>`;
    })
    .join("");

  const bodyHtml = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
  <tr>
    <td style="padding: 0 0 12px 0; color: #991b1b; font-size: 20px; font-weight: 700; line-height: 26px;">⚠️ התראות על כשלונות CRON Jobs</td>
  </tr>
  <tr>
    <td style="padding: 0 0 16px 0;">
      <div style="background-color: #fee2e2; border: 1px solid #fecaca; color: #991b1b; padding: 10px 12px; font-size: 12px; line-height: 18px;">
        <strong>נמצאו ${failures.length} כשלונות ב-24 השעות האחרונות</strong>
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding: 0 0 14px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${EMAIL_TOKENS.colors.surface}" style="width: 100%; background-color: ${EMAIL_TOKENS.colors.surface}; border-collapse: collapse;">
        <thead>
          <tr>
            <th style="padding: 10px 9px; text-align: right; border-bottom: 2px solid ${EMAIL_TOKENS.colors.teal}; color: ${LABEL_COLOR}; font-size: 11px; font-weight: 700; line-height: 16px;">שם ה-Job</th>
            <th style="padding: 10px 9px; text-align: right; border-bottom: 2px solid ${EMAIL_TOKENS.colors.teal}; color: ${LABEL_COLOR}; font-size: 11px; font-weight: 700; line-height: 16px;">סטטוס</th>
            <th style="padding: 10px 9px; text-align: right; border-bottom: 2px solid ${EMAIL_TOKENS.colors.teal}; color: ${LABEL_COLOR}; font-size: 11px; font-weight: 700; line-height: 16px;">הודעה</th>
            <th style="padding: 10px 9px; text-align: right; border-bottom: 2px solid ${EMAIL_TOKENS.colors.teal}; color: ${LABEL_COLOR}; font-size: 11px; font-weight: 700; line-height: 16px;">זמן</th>
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 0; color: ${EMAIL_TOKENS.colors.mutedText}; font-size: 12px; line-height: 18px;">
      לבדיקה מפורטת, לך ל-Supabase Dashboard → Database → Cron Jobs
    </td>
  </tr>
</table>`;

  return renderAdminEmailShell({
    bodyHtml,
    dir: "rtl",
    headerSlogan: "CRON ALERTS",
    lang: "he",
    maxWidth: 800,
  });
}

export function generateAlertEmailText(failures: CronJobFailure[]): string {
  return `Cron Job Failures Alert

Found ${failures.length} failure(s) in the last 24 hours:

${failures.map((failure) => `- ${failure.jobname}: ${failure.status} - ${failure.return_message || "N/A"} at ${formatFailureTime(failure.start_time)}`).join("\n")}

Check Supabase Dashboard → Database → Cron Jobs for details.
`;
}
