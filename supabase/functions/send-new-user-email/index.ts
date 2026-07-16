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
import {
  buildEmailBodies,
  generateDailySummarySubject,
  type DownloadRequest,
  type ReminderRunLog,
  type SummaryRow,
} from "./email-template.ts";

type ProfileRecord = {
  id: string;
  full_name?: string | null;
  updated_at?: string | null;
  reminder_enabled?: boolean | null;
  reminder_day_of_month?: number | null;
  mailing_list_consent?: boolean | null;
  created_at?: string | null;
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
    fetch("https://api.github.com/repos/yossi-weinberger/ten10/releases?per_page=100", {
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
    const { error: ghSnapshotError } = await supabaseAdmin
      .from("app_kv_store")
      .upsert({ key: GH_SNAPSHOT_KEY, value_int: ghTotalDownloads, updated_at: new Date().toISOString() });
    if (ghSnapshotError) {
      console.error("[GitHub] Failed to upsert download snapshot:", ghSnapshotError);
    }
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

  const emailInput = {
    rows,
    hours,
    downloadRequests,
    totalUsers: totalUsersCount ?? 0,
    reminderLogs: reminderRunLogs,
    github: { totalDownloads: ghTotalDownloads, last24h: ghLast24h, latestVersion: ghLatestVersion, latestDownloads: ghLatestDownloads },
  };
  const { htmlBody, textBody } = buildEmailBodies(emailInput);

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
      subject: generateDailySummarySubject(emailInput),
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
