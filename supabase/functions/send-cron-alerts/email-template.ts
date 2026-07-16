import {
  renderAdminTd,
  renderAdminTh,
} from "../_shared/email-admin-primitives.ts";
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

const { colors } = EMAIL_TOKENS;

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
        ${renderAdminTd(failure.jobname, { align: "right", emphasis: true })}
        ${renderAdminTd(failure.status, { align: "right" })}
        ${renderAdminTd(failure.return_message || "N/A", { align: "right" })}
        ${renderAdminTd(startTime, { align: "right" })}
      </tr>`;
    })
    .join("");

  const bodyHtml = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse: collapse;">
  <tr>
    <td style="padding: 0 0 12px 0; color: ${colors.dangerText}; font-size: 20px; font-weight: 700; line-height: 26px;">⚠️ התראות על כשלונות CRON Jobs</td>
  </tr>
  <tr>
    <td style="padding: 0 0 16px 0;">
      <div style="background-color: ${colors.dangerSurface}; border: 1px solid #fecaca; color: ${colors.dangerText}; padding: 10px 12px; font-size: 12px; line-height: 18px;">
        <strong>נמצאו ${failures.length} כשלונות ב-24 השעות האחרונות</strong>
      </div>
    </td>
  </tr>
  <tr>
    <td style="padding: 0 0 14px 0;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${colors.surface}" style="width: 100%; background-color: ${colors.surface}; border-collapse: collapse;">
        <thead>
          <tr>
            ${renderAdminTh("שם ה-Job", "right")}
            ${renderAdminTh("סטטוס", "right")}
            ${renderAdminTh("הודעה", "right")}
            ${renderAdminTh("זמן", "right")}
          </tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding: 0; color: ${colors.mutedText}; font-size: 12px; line-height: 18px;">
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
