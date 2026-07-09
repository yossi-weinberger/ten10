import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getCorsHeaders } from "../_shared/cors.ts";

type HogQLResult = {
  results?: unknown[][];
  columns?: string[];
  error?: string;
};

type PostHogAnalyticsResponse = {
  available: boolean;
  error?: string;
  dau7d: number | null;
  wau30d: number | null;
  pageviews7d: number | null;
  signupCompleted7d: number | null;
  transactionCreated7d: number | null;
  importStarted7d: number | null;
  importCompleted7d: number | null;
  importSuccessRate7d: number | null;
  exceptions7d: number | null;
  surveyResponses30d: number | null;
  topPaths7d: Array<{ path: string; views: number }>;
  eventCounts7d: Array<{ event: string; count: number }>;
  links: {
    project: string;
    webAnalytics: string;
    surveys: string;
    errorTracking: string;
  };
  timestamp: string;
};

async function runHogQL(
  host: string,
  projectId: string,
  apiKey: string,
  query: string,
  name: string
): Promise<HogQLResult> {
  const url = `${host.replace(/\/$/, "")}/api/projects/${projectId}/query/`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query: { kind: "HogQLQuery", query },
      name,
      refresh: "blocking",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { error: `HTTP ${response.status}: ${body.slice(0, 200)}` };
  }

  return (await response.json()) as HogQLResult;
}

function firstNumber(result: HogQLResult): number | null {
  if (result.error) return null;
  const value = result.results?.[0]?.[0];
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function buildUnavailableResponse(
  error: string,
  links: PostHogAnalyticsResponse["links"]
): PostHogAnalyticsResponse {
  return {
    available: false,
    error,
    dau7d: null,
    wau30d: null,
    pageviews7d: null,
    signupCompleted7d: null,
    transactionCreated7d: null,
    importStarted7d: null,
    importCompleted7d: null,
    importSuccessRate7d: null,
    exceptions7d: null,
    surveyResponses30d: null,
    topPaths7d: [],
    eventCounts7d: [],
    links,
    timestamp: new Date().toISOString(),
  };
}

function defaultLinks(host: string, projectId: string): PostHogAnalyticsResponse["links"] {
  const base = `${host.replace(/\/$/, "")}/project/${projectId}`;
  return {
    project: base,
    webAnalytics: `${base}/web-analytics`,
    surveys: `${base}/surveys`,
    errorTracking: `${base}/error_tracking`,
  };
}

serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser(jwt);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: adminData, error: adminError } = await adminClient
      .from("admin_emails")
      .select("email")
      .eq("email", user.email ?? "")
      .single();

    if (adminError || !adminData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: {
          ...getCorsHeaders(origin),
          "Content-Type": "application/json",
        },
      });
    }

    const posthogHost =
      Deno.env.get("POSTHOG_HOST") ?? "https://eu.posthog.com";
    const projectId = Deno.env.get("POSTHOG_PROJECT_ID") ?? "169449";
    const apiKey = Deno.env.get("POSTHOG_PERSONAL_API_KEY") ?? "";
    const links = defaultLinks(posthogHost, projectId);

    if (!apiKey) {
      return new Response(
        JSON.stringify(
          buildUnavailableResponse(
            "POSTHOG_PERSONAL_API_KEY is not configured",
            links
          )
        ),
        {
          headers: {
            ...getCorsHeaders(origin),
            "Content-Type": "application/json",
          },
        }
      );
    }

    const [
      dau,
      wau,
      pageviews,
      signups,
      txCreated,
      importStarted,
      importCompleted,
      exceptions,
      surveyResponses,
      topPaths,
      eventCounts,
    ] = await Promise.all([
      runHogQL(
        posthogHost,
        projectId,
        apiKey,
        `SELECT count(DISTINCT person_id) FROM events WHERE timestamp >= now() - INTERVAL 7 DAY AND person_id IS NOT NULL`,
        "ten10_admin_dau_7d"
      ),
      runHogQL(
        posthogHost,
        projectId,
        apiKey,
        `SELECT count(DISTINCT person_id) FROM events WHERE timestamp >= now() - INTERVAL 30 DAY AND person_id IS NOT NULL`,
        "ten10_admin_wau_30d"
      ),
      runHogQL(
        posthogHost,
        projectId,
        apiKey,
        `SELECT count() FROM events WHERE event = '$pageview' AND timestamp >= now() - INTERVAL 7 DAY`,
        "ten10_admin_pageviews_7d"
      ),
      runHogQL(
        posthogHost,
        projectId,
        apiKey,
        `SELECT count() FROM events WHERE event = 'signup_completed' AND timestamp >= now() - INTERVAL 7 DAY`,
        "ten10_admin_signup_7d"
      ),
      runHogQL(
        posthogHost,
        projectId,
        apiKey,
        `SELECT count() FROM events WHERE event = 'transaction_created' AND timestamp >= now() - INTERVAL 7 DAY`,
        "ten10_admin_tx_created_7d"
      ),
      runHogQL(
        posthogHost,
        projectId,
        apiKey,
        `SELECT count() FROM events WHERE event = 'transaction_import_started' AND timestamp >= now() - INTERVAL 7 DAY`,
        "ten10_admin_import_started_7d"
      ),
      runHogQL(
        posthogHost,
        projectId,
        apiKey,
        `SELECT count() FROM events WHERE event = 'transaction_import_completed' AND timestamp >= now() - INTERVAL 7 DAY`,
        "ten10_admin_import_completed_7d"
      ),
      runHogQL(
        posthogHost,
        projectId,
        apiKey,
        `SELECT count() FROM events WHERE event = '$exception' AND timestamp >= now() - INTERVAL 7 DAY`,
        "ten10_admin_exceptions_7d"
      ),
      runHogQL(
        posthogHost,
        projectId,
        apiKey,
        `SELECT count() FROM events WHERE event = 'survey sent' AND timestamp >= now() - INTERVAL 30 DAY`,
        "ten10_admin_survey_sent_30d"
      ),
      runHogQL(
        posthogHost,
        projectId,
        apiKey,
        `SELECT properties.$pathname AS path, count() AS views
         FROM events
         WHERE event = '$pageview'
           AND timestamp >= now() - INTERVAL 7 DAY
           AND properties.$pathname IS NOT NULL
         GROUP BY path
         ORDER BY views DESC
         LIMIT 8`,
        "ten10_admin_top_paths_7d"
      ),
      runHogQL(
        posthogHost,
        projectId,
        apiKey,
        `SELECT event, count() AS c
         FROM events
         WHERE timestamp >= now() - INTERVAL 7 DAY
           AND event NOT LIKE '$%'
         GROUP BY event
         ORDER BY c DESC
         LIMIT 12`,
        "ten10_admin_event_counts_7d"
      ),
    ]);

    const queryErrors = [
      dau,
      wau,
      pageviews,
      signups,
      txCreated,
      importStarted,
      importCompleted,
      exceptions,
      surveyResponses,
      topPaths,
      eventCounts,
    ]
      .map((r) => r.error)
      .filter(Boolean);

    const started = firstNumber(importStarted) ?? 0;
    const completed = firstNumber(importCompleted) ?? 0;
    const importSuccessRate7d =
      started > 0 ? Math.round((completed / started) * 1000) / 10 : null;

    const payload: PostHogAnalyticsResponse = {
      available: queryErrors.length === 0,
      error: queryErrors[0],
      dau7d: firstNumber(dau),
      wau30d: firstNumber(wau),
      pageviews7d: firstNumber(pageviews),
      signupCompleted7d: firstNumber(signups),
      transactionCreated7d: firstNumber(txCreated),
      importStarted7d: firstNumber(importStarted),
      importCompleted7d: firstNumber(importCompleted),
      importSuccessRate7d,
      exceptions7d: firstNumber(exceptions),
      surveyResponses30d: firstNumber(surveyResponses),
      topPaths7d: (topPaths.results ?? []).map((row) => ({
        path: String(row[0] ?? ""),
        views: Number(row[1] ?? 0),
      })),
      eventCounts7d: (eventCounts.results ?? []).map((row) => ({
        event: String(row[0] ?? ""),
        count: Number(row[1] ?? 0),
      })),
      links,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(payload), {
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("get-posthog-analytics error:", error);
    const posthogHost =
      Deno.env.get("POSTHOG_HOST") ?? "https://eu.posthog.com";
    const projectId = Deno.env.get("POSTHOG_PROJECT_ID") ?? "169449";
    const unavailable = buildUnavailableResponse(
      error instanceof Error ? error.message : "Unknown error",
      defaultLinks(posthogHost, projectId)
    );
    // Same full shape as the missing-key path so clients can render safely.
    return new Response(JSON.stringify(unavailable), {
      status: 200,
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
      },
    });
  }
});
