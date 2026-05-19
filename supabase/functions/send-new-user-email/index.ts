// @ts-nocheck
// Edge Function: send-new-user-email (daily summary)
// Usage: scheduled (pg_cron) HTTP POST with optional body { hours?: number, to?: string }
// Secrets required: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (optional), SES_FROM (optional override, default contact-form@ten10-app.com)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { SimpleEmailService } from "../_shared/simple-email-service.ts";
import { EMAIL_THEME, getEmailHeader } from "../_shared/email-design.ts";

type ProfileRecord = {
  id: string;
  full_name?: string | null;
  updated_at?: string | null;
  reminder_enabled?: boolean | null;
  reminder_day_of_month?: number | null;
  mailing_list_consent?: boolean | null;
  created_at?: string | null;
};

type SummaryRow = ProfileRecord & {
  email: string | null;
  auth_created_at: string | null;
  avatar_url?: string | null;
};

const DEFAULT_TO = "dev@ten10-app.com";
const DEFAULT_WINDOW_HOURS = 24;

type ReminderRunLog = {
  run_at: string;
  day_of_month: number;
  was_reminder_day: boolean;
  was_shabbat: boolean;
  users_processed: number;
  emails_sent: number;
  emails_failed: number;
  notes: string | null;
};

type DownloadRequest = {
  id: string;
  created_at: string;
  from_email: string;
  status: string;
  reason: string | null;
};

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    // Scheduled task, no specific origin
    headers: { ...getCorsHeaders(null), "Content-Type": "application/json" },
  });

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatBoolean = (value: boolean | null | undefined) =>
  value === true ? "Yes" : value === false ? "No" : "Unknown";

const formatDateParts = (value: string | null | undefined) => {
  if (!value) {
    return { date: "Unknown", time: "Unknown" };
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    return { date: value, time: value };
  }
  const toLocal = new Date(d.getTime());
  const y = toLocal.getUTCFullYear();
  const m = String(toLocal.getUTCMonth() + 1).padStart(2, "0");
  const day = String(toLocal.getUTCDate()).padStart(2, "0");
  const hh = String(toLocal.getUTCHours()).padStart(2, "0");
  const mm = String(toLocal.getUTCMinutes()).padStart(2, "0");
  return { date: `${day}/${m}/${y}`, time: `${hh}:${mm}` };
};

const fetchAuthUser = async (
  client: SupabaseClient,
  userId: string,
): Promise<{
  email: string | null;
  created_at: string | null;
  metaName?: string | null;
}> => {
  const { data, error } = await client.auth.admin.getUserById(userId);
  if (error) {
    console.error("Failed to fetch auth user:", error);
    return { email: null, created_at: null, metaName: null };
  }
  return {
    email: data.user?.email ?? null,
    created_at: data.user?.created_at ?? null,
    metaName:
      (data.user?.user_metadata as { full_name?: string } | undefined)
        ?.full_name ?? null,
  };
};


const buildDownloadRequestsSection = (requests: DownloadRequest[], hours: number): { html: string; text: string } => {
  if (requests.length === 0) {
    return {
      html: `<p style="color:#6b7280;font-size:13px;">No download requests in the last ${hours}h.</p>`,
      text: `No download requests in the last ${hours}h.`,
    };
  }
  const rowsHtml = requests.map((r) => {
    const parts = formatDateParts(r.created_at);
    const statusBadge = r.status === "sent"
      ? `<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">✓ sent</span>`
      : r.status === "blocked"
        ? `<span style="background:#fef9c3;color:#92400e;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">blocked</span>`
        : `<span style="background:#fee2e2;color:#991b1b;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">error</span>`;
    return `<tr>
      <td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;">${escapeHtml(r.from_email)}</td>
      <td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;">${escapeHtml(parts.date)}</td>
      <td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:13px;color:#374151;">${escapeHtml(parts.time)}</td>
      <td style="padding:8px;border-bottom:1px solid #f3f4f6;">${statusBadge}</td>
      <td style="padding:8px;border-bottom:1px solid #f3f4f6;font-size:12px;color:#9ca3af;">${escapeHtml(r.reason ?? "")}</td>
    </tr>`;
  }).join("");

  return {
    html: `<table style="width:100%;border-collapse:collapse;margin-top:8px;">
      <thead><tr style="background:#f9fafb;">
        <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Email</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Date</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Time</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Status</th>
        <th style="padding:8px;text-align:left;font-size:12px;color:#6b7280;font-weight:600;">Reason</th>
      </tr></thead>
      <tbody>${rowsHtml}</tbody>
    </table>`,
    text: requests.map((r) => {
      const parts = formatDateParts(r.created_at);
      return `  ${parts.date} ${parts.time} | ${r.from_email} | ${r.status}${r.reason ? ` (${r.reason})` : ""}`;
    }).join("\n"),
  };
};

const buildEmailBodies = (args: {
  rows: SummaryRow[];
  hours: number;
  downloadRequests: {
    windowCount: number;
    total: number;
    details: DownloadRequest[];
  };
  totalUsers: number;
  reminderLogs: ReminderRunLog[];
  github: { totalDownloads: number | null; last24h: number | null; latestVersion: string; latestDownloads: number | null };
}) => {
  const { rows, hours, downloadRequests, totalUsers, reminderLogs, github } = args;
  const { windowCount, total, details: downloadDetails } = downloadRequests;
  const windowLabel = `Last ${hours} hours`;

  const downloadSection = buildDownloadRequestsSection(downloadDetails, hours);

  if (rows.length === 0 && windowCount === 0) {
    const textBody = `${windowLabel}: No new profiles and no new download requests.\nTotal users (all-time): ${totalUsers}`;
    const htmlBody = `<!DOCTYPE html>
    <html>
      <body style="font-family:Arial,sans-serif; background:#f8fafc; padding:24px;">
        <h2 style="margin:0 0 12px 0; color:#111827;">Daily Summary</h2>
        <p style="margin:0 0 8px 0; color:#374151;">${windowLabel}: No new profiles and no new download requests.</p>
        <p style="margin:0 0 24px 0; color:#6b7280;font-size:13px;">Total registered users (all-time): <strong>${totalUsers}</strong></p>
      </body>
    </html>`;
    return { htmlBody, textBody };
  }

  const reminderSent = reminderLogs.filter((l) => l.was_reminder_day).reduce((s, l) => s + l.emails_sent, 0);
  const reminderFailed = reminderLogs.reduce((s, l) => s + l.emails_failed, 0);
  const wasReminderDay = reminderLogs.some((l) => l.was_reminder_day);
  const wasShabbatSkip = !wasReminderDay && reminderLogs.some((l) => l.was_shabbat || l.notes?.includes("Shabbat") || l.notes?.includes("Erev"));
  const reminderStatusLine = wasReminderDay
    ? reminderSent > 0
      ? `📧 Reminder emails: <strong style="color:#166534;">${reminderSent} sent</strong>${reminderFailed > 0 ? ` &nbsp;·&nbsp; <strong style="color:#dc2626;">${reminderFailed} failed</strong>` : ""}`
      : `📧 Reminder emails: reminder day — <strong style="color:#6b7280;">no users configured</strong>`
    : wasShabbatSkip
      ? `📧 Reminder emails: skipped (Shabbat)`
      : reminderFailed > 0
        ? `📧 Reminder emails: <strong style="color:#dc2626;">${reminderFailed} failed</strong>`
        : `📧 Reminder emails: not a reminder day`;

  const card = (bg: string, border: string, labelColor: string, icon: string, label: string, bigNum: string | number, footer: string) => `
    <div style="background:${bg};border:1px solid ${border};border-radius:12px;padding:20px 12px;text-align:center;height:130px;box-sizing:border-box;">
      <div style="font-size:11px;color:${labelColor};font-weight:800;text-transform:uppercase;letter-spacing:.06em;">${icon} ${label}</div>
      <div style="margin-top:10px;font-size:40px;line-height:1.1;color:#111827;font-weight:900;">${bigNum}</div>
      <div style="margin-top:12px;font-size:11px;color:#6b7280;">${footer}</div>
    </div>`;

  const statsSectionHtml = `
  <div style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.08em;font-weight:700;margin-bottom:10px;">${escapeHtml(windowLabel)}</div>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin:0 0 4px 0;">
    <tr>
      <td width="33%" valign="top" style="padding:0 4px 0 0;">
        ${card("#eff6ff","#bfdbfe","#1e3a8a","💻","Email downloads", windowCount, `All-time: <strong style="color:#374151;">${total}</strong>`)}
      </td>
      <td width="33%" valign="top" style="padding:0 4px;">
        ${card("#ecfdf5","#bbf7d0","#065f46","🌐","New web users", rows.length, `All-time: <strong style="color:#374151;">${totalUsers}</strong>`)}
      </td>
      <td width="33%" valign="top" style="padding:0 0 0 4px;">
        ${card("#fefce8","#fde68a","#92400e","📦","GitHub installs", github.last24h !== null ? `+${github.last24h}` : "—", github.totalDownloads !== null ? `All-time: <strong style="color:#374151;">${github.totalDownloads}</strong> &nbsp;·&nbsp; ${escapeHtml(github.latestVersion)}: ${github.latestDownloads ?? "—"}` : `GitHub unavailable`)}
      </td>
    </tr>
  </table>
  <div style="padding:10px 14px;font-size:15px;color:#4b5563;margin-bottom:20px;background:#f9fafb;border-radius:8px;border:1px solid #e5e7eb;">${reminderStatusLine}</div>`;

  const rowsHtml = rows
    .map((r) => {
      const avatarCell = r.avatar_url
        ? `<img src="${escapeHtml(
            r.avatar_url,
          )}" alt="avatar" class="avatar" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid #e5e7eb;" />`
        : `<div class="avatar-placeholder" style="width:36px;height:36px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:12px;">N/A</div>`;

      const consentBadge =
        r.mailing_list_consent === true
          ? `<span class="badge badge-yes" style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background-color:#dcfce7;color:#166534;">Yes</span>`
          : r.mailing_list_consent === false
            ? `<span class="badge badge-no" style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background-color:#fee2e2;color:#991b1b;">No</span>`
            : `<span class="badge" style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;background-color:#f3f4f6;color:#6b7280;">Unknown</span>`;

      return `
      <tr>
        <td>${avatarCell}</td>
        <td><strong>${escapeHtml(r.full_name ?? "Not provided")}</strong></td>
        <td>${escapeHtml(r.email ?? "unknown")}</td>
        <td style="font-family: monospace; color: #6b7280;">${escapeHtml(
          r.id.substring(0, 8),
        )}...</td>
        <td>${escapeHtml(
          formatDateParts(r.auth_created_at ?? r.updated_at ?? null).date,
        )}</td>
        <td>${escapeHtml(
          formatDateParts(r.auth_created_at ?? r.updated_at ?? null).time,
        )}</td>
        <td>${consentBadge}</td>
      </tr>`;
    })
    .join("");

  const htmlBody = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>New users summary</title>
      <style>
        body { font-family: ${EMAIL_THEME.fonts.main}; background-color: ${
          EMAIL_THEME.colors.background
        }; margin: 0; padding: 0; }
        .container { max-width: 800px; margin: 40px auto; background: ${
          EMAIL_THEME.colors.cardBackground
        }; border-radius: 16px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); overflow: hidden; border-top: 6px solid ${
          EMAIL_THEME.colors.primary
        }; }
        /* Header styles are inline */
        .content { padding: 32px; }
        .summary-box { background-color: ${
          EMAIL_THEME.colors.success.bg
        }; border: 1px solid ${
          EMAIL_THEME.colors.success.border
        }; border-radius: 8px; padding: 16px; margin-bottom: 24px; color: ${
          EMAIL_THEME.colors.success.text
        }; font-weight: 500; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; padding: 12px; border-bottom: 2px solid ${
          EMAIL_THEME.colors.border
        }; color: ${
          EMAIL_THEME.colors.textSecondary
        }; font-weight: 600; font-size: 14px; }
        td { padding: 12px; border-bottom: 1px solid ${
          EMAIL_THEME.colors.background
        }; color: ${
          EMAIL_THEME.colors.textMain
        }; font-size: 14px; vertical-align: middle; }
        tr:last-child td { border-bottom: none; }
        .avatar { width: 36px; height: 36px; border-radius: 50%; object-fit: cover; border: 1px solid ${
          EMAIL_THEME.colors.border
        }; }
        .avatar-placeholder { width: 36px; height: 36px; border-radius: 50%; background: ${
          EMAIL_THEME.colors.border
        }; display: flex; align-items: center; justify-content: center; color: ${
          EMAIL_THEME.colors.textLight
        }; font-size: 12px; }
        .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 600; }
        .badge-yes { background-color: ${
          EMAIL_THEME.colors.success.bg
        }; color: ${EMAIL_THEME.colors.success.text}; }
        .badge-no { background-color: ${EMAIL_THEME.colors.error.bg}; color: ${
          EMAIL_THEME.colors.error.text
        }; }
      </style>
    </head>
    <body>
      <div class="container">
        ${getEmailHeader("en")}
        <div class="content">
          <h2 style="margin: 0 0 16px 0; color: #111827; font-size: 24px;">Daily Summary</h2>
          
          ${statsSectionHtml}

          <h3 style="margin: 0 0 8px 0; color: #111827; font-size: 16px;">
            🌐 Web Platform — New Users
          </h3>
          <div style="overflow-x: auto;">
            <table>
              <thead>
                <tr>
                  <th>Avatar</th>
                  <th>Full Name</th>
                  <th>Email</th>
                  <th>User ID</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Consent</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          <h3 style="margin: 32px 0 8px 0; color: #111827; font-size: 16px; border-top: 1px solid #e5e7eb; padding-top: 24px;">
            💻 Desktop Platform — Download Requests
          </h3>
          ${downloadSection.html}

        </div>
      </div>
    </body>
  </html>`;

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

  for (const r of rows) {
    const parts = formatDateParts(r.auth_created_at ?? r.updated_at ?? null);
    textBodyLines.push(
      `  - ${r.full_name ?? "Not provided"} | ${r.email ?? "unknown"} | date=${parts.date} ${parts.time} | consent: ${formatBoolean(r.mailing_list_consent)}`,
    );
  }

  textBodyLines.push("");
  textBodyLines.push(`💻 Desktop Platform — Download requests last ${hours}h: ${windowCount} (all-time: ${total})`);
  textBodyLines.push(downloadSection.text);


  return { htmlBody, textBody: textBodyLines.join("\n") };
};

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse(
      { error: "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY" },
      500,
    );
  }

  let body: { hours?: number; to?: string } = {};
  if (req.method === "POST") {
    try {
      body = (await req.json()) as { hours?: number; to?: string };
    } catch {
      // allow empty/invalid body -> defaults
    }
  }

  const hours =
    body?.hours && body.hours > 0 ? body.hours : DEFAULT_WINDOW_HOURS;
  const toEmail =
    body?.to?.trim() || Deno.env.get("NEW_USERS_SUMMARY_TO") || DEFAULT_TO;

  const sinceIso = new Date(Date.now() - hours * 3600 * 1000).toISOString();

  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Fetch only NEW users based on auth.users.created_at within the window using Auth Admin API (pagination)
  const newUsers: {
    id: string;
    email: string | null;
    created_at: string;
    raw_user_meta_data?: any;
  }[] = [];
  const pageSize = 1000;
  let page = 1;
  let more = true;
  while (more) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage: pageSize,
    });
    if (error) {
      console.error("Failed to fetch auth users:", error);
      return jsonResponse({ error: "Failed to fetch auth users" }, 500);
    }
    const filtered = (data?.users ?? []).filter(
      (u) => u.created_at && u.created_at >= sinceIso,
    );
    newUsers.push(
      ...filtered.map((u) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        raw_user_meta_data: u.user_metadata,
      })),
    );

    if ((data?.users?.length ?? 0) < pageSize) {
      more = false;
    } else {
      const oldest = data?.users?.[data.users.length - 1];
      if (oldest?.created_at && oldest.created_at < sinceIso) {
        more = false;
      } else {
        page += 1;
      }
    }
  }

  const userIds = newUsers.map((u) => u.id);
  const { data: profiles, error: profilesError } = userIds.length
    ? await supabaseAdmin
        .from("profiles")
        .select(
          "id, full_name, mailing_list_consent, reminder_enabled, reminder_day_of_month, updated_at, avatar_url",
        )
        .in("id", userIds)
    : { data: [], error: null };

  if (profilesError) {
    console.error("Failed to fetch profiles:", profilesError);
    return jsonResponse({ error: "Failed to fetch profiles" }, 500);
  }

  const profilesById = new Map<
    string,
    ProfileRecord & { avatar_url?: string | null }
  >((profiles ?? []).map((p) => [p.id, p]));

  const rows: SummaryRow[] = [];
  for (const u of newUsers ?? []) {
    const profile = profilesById.get(u.id);
    const meta =
      (u.raw_user_meta_data as {
        full_name?: string;
        avatar_url?: string;
      } | null) ?? {};

    rows.push({
      id: u.id,
      full_name: profile?.full_name ?? meta.full_name ?? null,
      email: u.email ?? null,
      auth_created_at: u.created_at,
      mailing_list_consent: profile?.mailing_list_consent ?? null,
      reminder_enabled: profile?.reminder_enabled ?? null,
      reminder_day_of_month: profile?.reminder_day_of_month ?? null,
      updated_at: profile?.updated_at ?? null,
      avatar_url: profile?.avatar_url ?? meta.avatar_url ?? null,
    });
  }

  // Download requests — counts + row details, total user count, and GitHub releases — all in parallel
  const [
    { count: last24h, error: err24h },
    { count: totalDownloads, error: errTotal },
    { data: downloadDetails, error: errDetails },
    { count: totalUsersCount, error: errTotalUsers },
    ghResult,
  ] = await Promise.all([
    supabaseAdmin
      .from("download_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent")
      .gte("created_at", sinceIso),
    supabaseAdmin
      .from("download_requests")
      .select("*", { count: "exact", head: true })
      .eq("status", "sent"),
    supabaseAdmin
      .from("download_requests")
      .select("id, created_at, from_email, status, reason")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true }),
    fetch("https://api.github.com/repos/yossi-weinberger/ten10/releases", {
      headers: { "User-Agent": "ten10-summary-bot" },
    })
      .then((r) => (r.ok ? r.json() : Promise.resolve(null)))
      .catch(() => null),
  ]);

  if (err24h) console.error("Failed to fetch download requests last24h:", err24h);
  if (errTotal) console.error("Failed to fetch download requests total:", errTotal);
  if (errDetails) console.error("Failed to fetch download request details:", errDetails);
  if (errTotalUsers) console.error("Failed to fetch total users count:", errTotalUsers);

  // Parse GitHub release download counts
  type GhRelease = { tag_name: string; published_at: string; assets: { name: string; download_count: number }[] };
  const ghFetchOk = Array.isArray(ghResult);
  const ghReleases: GhRelease[] = ghFetchOk ? ghResult : [];

  // Count only real installer downloads — exclude update-check files (.json, .sig)
  const isRealInstaller = (name: string) =>
    !name.endsWith(".json") && !name.endsWith(".sig");

  const ghTotalDownloads: number | null = ghFetchOk
    ? ghReleases.reduce((sum, r) => sum + r.assets.filter((a) => isRealInstaller(a.name)).reduce((s, a) => s + a.download_count, 0), 0)
    : null;
  const ghLatest = ghFetchOk ? (ghReleases[0] ?? null) : null;
  const ghLatestVersion = ghLatest?.tag_name ?? "—";
  const ghLatestDownloads: number | null = ghLatest
    ? ghLatest.assets.filter((a) => isRealInstaller(a.name)).reduce((s, a) => s + a.download_count, 0)
    : null;

  // Compute 24h GitHub download delta using yesterday's snapshot
  const GH_SNAPSHOT_KEY = "github_total_downloads";
  const { data: snapshotRow } = await supabaseAdmin
    .from("app_kv_store")
    .select("value_int")
    .eq("key", GH_SNAPSHOT_KEY)
    .single();

  const yesterdayTotal = snapshotRow?.value_int ?? null;
  const ghLast24h =
    ghTotalDownloads !== null && yesterdayTotal !== null
      ? Math.max(0, ghTotalDownloads - Number(yesterdayTotal))
      : null;

  // Upsert today's snapshot only when GitHub responded successfully (avoid overwriting with 0 on error)
  if (ghFetchOk && ghTotalDownloads !== null) {
    await supabaseAdmin
      .from("app_kv_store")
      .upsert({ key: GH_SNAPSHOT_KEY, value_int: ghTotalDownloads, updated_at: new Date().toISOString() });
  } else {
    console.warn("[GitHub] Fetch failed — skipping snapshot update to preserve delta integrity.");
  }

  // Reminder run logs for the configured window (default 24 hours)
  const { data: reminderLogs, error: reminderLogsError } = await supabaseAdmin
    .from("reminder_run_logs")
    .select(
      "run_at, day_of_month, was_reminder_day, was_shabbat, users_processed, emails_sent, emails_failed, notes",
    )
    .gte("run_at", sinceIso)
    .order("run_at", { ascending: false });

  if (reminderLogsError) {
    console.error("Failed to fetch reminder logs:", reminderLogsError);
  }
  const reminderRunLogs: ReminderRunLog[] = reminderLogs ?? [];

  const downloadRequests = {
    windowCount: last24h ?? 0,
    total: totalDownloads ?? 0,
    details: (downloadDetails ?? []) as DownloadRequest[],
  };

  const { htmlBody, textBody } = buildEmailBodies({
    rows,
    hours,
    downloadRequests,
    totalUsers: totalUsersCount ?? 0,
    reminderLogs: reminderRunLogs,
    github: { totalDownloads: ghTotalDownloads, last24h: ghLast24h, latestVersion: ghLatestVersion, latestDownloads: ghLatestDownloads },
  });

  if (rows.length === 0 && downloadRequests.windowCount === 0) {
    // No new users AND no downloads: still return 200, avoid sending an empty email
    return jsonResponse({
      message: "No new profiles or download requests in window",
      hours,
      to: toEmail,
      sent: false,
    });
  }

  try {
    // Use a dedicated sender for the new-users summary email so it won't be affected by the global SES_FROM
    // (which may be set for reminder emails).
    const fromUsers =
      Deno.env.get("SES_FROM_USERS") ?? "users-update@ten10-app.com";
    const emailService = new SimpleEmailService(fromUsers);
    await emailService.sendRawEmail({
      to: toEmail,
      subject: `[Ten10] Daily Summary: +${rows.length} users (${totalUsersCount ?? 0} total), ${downloadRequests.windowCount} downloads`,
      textBody,
      htmlBody,
    });

    return jsonResponse({
      message: "Summary sent",
      to: toEmail,
      count: rows.length,
      hours,
    });
  } catch (error) {
    console.error("Failed to send summary email:", error);
    return jsonResponse(
      {
        error: "Failed to send summary email",
        details:
          error instanceof Error
            ? error.message
            : String(error ?? "Unknown error"),
      },
      500,
    );
  }
});
