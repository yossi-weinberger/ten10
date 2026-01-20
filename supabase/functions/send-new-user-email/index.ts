// @ts-nocheck
// Edge Function: send-new-user-email (daily summary)
// Usage: scheduled (pg_cron) HTTP POST with optional body { hours?: number, to?: string }
// Secrets required: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (optional), SES_FROM (optional override, default contact-form@ten10-app.com)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
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
  userId: string
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

const buildEmailBodies = (args: {
  rows: SummaryRow[];
  hours: number;
  downloadRequests: {
    windowCount: number;
    total: number;
  };
}) => {
  const { rows, hours, downloadRequests } = args;
  const { windowCount, total } = downloadRequests;
  const windowLabel = `Last ${hours} hours`;

  if (rows.length === 0 && windowCount === 0) {
    const textBody = `${windowLabel}: No new profiles and no new download requests.`;
    const htmlBody = `<!DOCTYPE html>
    <html>
      <body style="font-family:Arial,sans-serif; background:#f8fafc; padding:24px;">
        <h2 style="margin:0 0 12px 0; color:#111827;">Daily Summary</h2>
        <p style="margin:0; color:#374151;">${windowLabel}: No new profiles and no new download requests.</p>
      </body>
    </html>`;
    return { htmlBody, textBody };
  }

  const statsSectionHtml = `<table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 24px 0;">
    <tr>
      <td style="padding: 0 0 12px 0;">
        <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.08em; font-weight: 700;">
          ${escapeHtml(windowLabel)}
        </div>
      </td>
    </tr>
    <tr>
      <td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td width="50%" valign="top" style="padding: 0 8px 0 0;">
              <div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px; padding: 16px;">
                <div style="font-size: 12px; color: #1e3a8a; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;">
                  Download requests
                </div>
                <div style="margin-top: 8px; font-size: 34px; line-height: 1.1; color: #111827; font-weight: 900;">
                  ${windowCount}
                </div>
                <div style="margin-top: 6px; font-size: 13px; color: #1f2937;">
                  in the last ${hours} hours
                </div>
                <div style="margin-top: 12px; font-size: 12px; color: #6b7280;">
                  All-time total: <strong style="color:#374151;">${total}</strong>
                </div>
              </div>
            </td>
            <td width="50%" valign="top" style="padding: 0 0 0 8px;">
              <div style="background: #ecfdf5; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px;">
                <div style="font-size: 12px; color: #065f46; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;">
                  New users
                </div>
                <div style="margin-top: 8px; font-size: 34px; line-height: 1.1; color: #111827; font-weight: 900;">
                  ${rows.length}
                </div>
                <div style="margin-top: 6px; font-size: 13px; color: #1f2937;">
                  joined in the last ${hours} hours
                </div>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>`;

  const rowsHtml = rows
    .map((r) => {
      const avatarCell = r.avatar_url
        ? `<img src="${escapeHtml(
            r.avatar_url
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
          r.id.substring(0, 8)
        )}...</td>
        <td>${escapeHtml(
          formatDateParts(r.auth_created_at ?? r.updated_at ?? null).date
        )}</td>
        <td>${escapeHtml(
          formatDateParts(r.auth_created_at ?? r.updated_at ?? null).time
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
        </div>
      </div>
    </body>
  </html>`;

  const textBodyLines: string[] = [
    "Daily Summary",
    `${windowLabel}.`,
    `Download requests (email) in the last ${hours}h: ${windowCount} (all-time total: ${total})`,
    `New users in the last ${hours}h: ${rows.length}`,
    "",
  ];

  for (const r of rows) {
    const parts = formatDateParts(r.auth_created_at ?? r.updated_at ?? null);
    textBodyLines.push(
      `- ${r.full_name ?? "Not provided"} | ${r.email ?? "unknown"} | ${
        r.id
      } | date=${parts.date} time=${
        parts.time
      } | mailing consent: ${formatBoolean(r.mailing_list_consent)} | avatar: ${
        r.avatar_url ?? "N/A"
      }`
    );
  }

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
      500
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
      (u) => u.created_at && u.created_at >= sinceIso
    );
    newUsers.push(
      ...filtered.map((u) => ({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        raw_user_meta_data: u.user_metadata,
      }))
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
          "id, full_name, mailing_list_consent, reminder_enabled, reminder_day_of_month, updated_at, avatar_url"
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

  // Download requests stats (status=sent)
  const [
    { count: last24h, error: err24h },
    { count: totalDownloads, error: errTotal },
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
  ]);

  if (err24h)
    console.error("Failed to fetch download requests last24h:", err24h);
  if (errTotal)
    console.error("Failed to fetch download requests total:", errTotal);

  const downloadRequests = {
    windowCount: last24h ?? 0,
    total: totalDownloads ?? 0,
  };

  const { htmlBody, textBody } = buildEmailBodies({
    rows,
    hours,
    downloadRequests,
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
      subject: `[Ten10] Daily Summary: ${rows.length} Users, ${downloadRequests.windowCount} Download Requests`,
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
      500
    );
  }
});
