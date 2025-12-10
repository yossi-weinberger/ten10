// @ts-nocheck
// Edge Function: send-new-user-email (daily summary)
// Usage: scheduled (pg_cron) HTTP POST with optional body { hours?: number, to?: string }
// Secrets required: SUPABASE_SERVICE_ROLE_KEY, SUPABASE_URL, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION (optional), SES_FROM (optional override, default contact-form@ten10-app.com)

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { SimpleEmailService } from "../_shared/simple-email-service.ts";

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
    headers: { ...corsHeaders, "Content-Type": "application/json" },
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

const buildEmailBodies = (args: { rows: SummaryRow[]; hours: number }) => {
  const { rows, hours } = args;
  const windowLabel = `Last ${hours} hours`;

  if (rows.length === 0) {
    const textBody = `${windowLabel}: No new profiles`;
    const htmlBody = `<!DOCTYPE html>
    <html>
      <body style="font-family:Arial,sans-serif; background:#f8fafc; padding:24px;">
        <h2 style="margin:0 0 12px 0; color:#111827;">New users summary</h2>
        <p style="margin:0; color:#374151;">${windowLabel}: No new profiles.</p>
      </body>
    </html>`;
    return { htmlBody, textBody };
  }

  const rowsHtml = rows
    .map((r) => {
      const avatarCell = r.avatar_url
        ? `<img src="${escapeHtml(
            r.avatar_url
          )}" alt="avatar" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid #e5e7eb;" />`
        : `<div style="width:36px;height:36px;border-radius:50%;background:#e5e7eb;display:flex;align-items:center;justify-content:center;color:#6b7280;font-size:12px;">N/A</div>`;

      return `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${avatarCell}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
          r.full_name ?? "Not provided"
        )}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
          r.email ?? "unknown"
        )}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
          r.id
        )}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
          formatDateParts(r.auth_created_at ?? r.updated_at ?? null).date
        )}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
          formatDateParts(r.auth_created_at ?? r.updated_at ?? null).time
        )}</td>
        <td style="padding:8px;border-bottom:1px solid #e5e7eb;">${escapeHtml(
          formatBoolean(r.mailing_list_consent)
        )}</td>
      </tr>`;
    })
    .join("");

  const htmlBody = `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <title>New users summary</title>
    </head>
    <body style="margin:0;padding:0;font-family:Arial,sans-serif;background-color:#f8fafc;">
      <div style="max-width:720px;margin:0 auto;background:#ffffff;padding:28px;">
        <h2 style="margin:0 0 16px 0;color:#111827;">New users summary</h2>
        <p style="margin:0 0 16px 0;color:#374151;">${windowLabel}. Total: ${rows.length}.</p>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Avatar</th>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Full name</th>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Email</th>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">User ID</th>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Date</th>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Time</th>
              <th style="text-align:left;padding:8px;border-bottom:2px solid #e5e7eb;">Mailing consent</th>
            </tr>
          </thead>
          <tbody>
            ${rowsHtml}
          </tbody>
        </table>
      </div>
    </body>
  </html>`;

  const textBodyLines: string[] = [
    "New users summary",
    `${windowLabel}. Total: ${rows.length}.`,
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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

  const { htmlBody, textBody } = buildEmailBodies({ rows, hours });

  if (rows.length === 0) {
    // No new users: still return 200, avoid sending an empty email
    return jsonResponse({
      message: "No new profiles in window",
      hours,
      to: toEmail,
      sent: false,
    });
  }

  try {
    const fromOverride = Deno.env.get("SES_FROM_USERS");
    const emailService = new SimpleEmailService(fromOverride ?? undefined);
    await emailService.sendRawEmail({
      to: toEmail,
      subject: `[Ten10] New users summary (${rows.length})`,
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
        details: String(error?.message ?? error),
      },
      500
    );
  }
});
