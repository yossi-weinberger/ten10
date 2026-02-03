import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";
import { getCorsHeaders } from "../_shared/cors.ts";

interface MonitoringData {
  database: DatabaseStats;
  auth: AuthStats;
  edgeFunctions: EdgeFunctionStats;
  email: EmailStats;
  cloudflare: CloudflareStats;
  vercel: VercelStats;
  anomalies: Anomaly[];
  timestamp: string;
}

interface CloudflareStats {
  requests24h: number;
  errors24h: number;
  errorRate: number;
  bandwidth24h: number;
  available: boolean;
  error?: string;
}

interface VercelStats {
  deployments: VercelDeployment[];
  lastDeployment?: VercelDeployment;
  available: boolean;
  error?: string;
}

interface VercelDeployment {
  id: string;
  state: string;
  createdAt: string;
  url?: string;
  meta?: {
    githubCommitMessage?: string;
    githubCommitRef?: string;
  };
}

interface EmailStats {
  sends24h: number;
  deliveries24h: number;
  bounces24h: number;
  complaints24h: number;
  rejects24h: number;
  deliveryRate: number;
  bounceRate: number;
  available: boolean;
  error?: string;
}

interface DatabaseStats {
  activeConnections: number;
  slowQueries: SlowQuery[];
  tableStats: TableStat[];
  advisories: Advisory[];
}

interface SlowQuery {
  query: string;
  calls: number;
  totalTime: number;
  meanTime: number;
}

interface TableStat {
  tableName: string;
  rowCount: number;
  seqScans: number;
  indexScans: number;
  deadTuples: number;
}

interface Advisory {
  type: "security" | "performance";
  message: string;
  severity: "warning" | "error";
  table?: string;
}

interface AuthStats {
  recentEvents: AuthEvent[];
  failedLogins24h: number;
  signups24h: number;
  passwordResets24h: number;
}

interface AuthEvent {
  id: string;
  action: string;
  createdAt: string;
  ipAddress?: string;
}

interface EdgeFunctionStats {
  invocations24h: number;
  errors24h: number;
  errorRate: number;
}

interface Anomaly {
  type: "auth" | "database" | "edge_function" | "email";
  severity: "warning" | "error";
  message: string;
  value?: number;
  threshold?: number;
}

// Anomaly thresholds
const THRESHOLDS = {
  authFailures: { warning: 10, error: 50 },
  edgeFunctionErrorRate: { warning: 5, error: 20 },
  slowQueries: { warning: 5, error: 20 },
  deadTuples: { warning: 1000, error: 10000 },
  emailBounceRate: { warning: 5, error: 10 },
};

serve(async (req) => {
  const origin = req.headers.get("origin");

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: getCorsHeaders(origin) });
  }

  try {
    // Verify JWT and check admin access
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

    // Create client with user's JWT to verify identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Extract JWT from Authorization header and validate it directly
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

    // Create service role client for system queries
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin by querying admin_emails table
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

    // Fetch all monitoring data in parallel
    const [
      dbStats,
      authStats,
      edgeFunctionStats,
      emailStats,
      cloudflareStats,
      vercelStats,
    ] = await Promise.all([
      fetchDatabaseStats(adminClient),
      fetchAuthStats(adminClient),
      fetchEdgeFunctionStats(adminClient),
      fetchEmailStats(),
      fetchCloudflareStats(),
      fetchVercelStats(),
    ]);

    // Detect anomalies
    const anomalies = detectAnomalies(
      dbStats,
      authStats,
      edgeFunctionStats,
      emailStats,
      cloudflareStats
    );

    const monitoringData: MonitoringData = {
      database: dbStats,
      auth: authStats,
      edgeFunctions: edgeFunctionStats,
      email: emailStats,
      cloudflare: cloudflareStats,
      vercel: vercelStats,
      anomalies,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(monitoringData), {
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching monitoring data:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: {
        ...getCorsHeaders(origin),
        "Content-Type": "application/json",
      },
    });
  }
});

async function fetchDatabaseStats(
  client: ReturnType<typeof createClient>
): Promise<DatabaseStats> {
  // Query active connections
  const { data: connections } = await client
    .rpc("get_active_connections")
    .single();

  // Query slow queries from pg_stat_statements (if available)
  const { data: slowQueries } = await client.rpc("get_slow_queries");

  // Query table statistics
  const { data: tableStats } = await client.rpc("get_table_stats");

  // Check for tables without RLS (security advisory)
  const { data: tablesWithoutRls } = await client.rpc("get_tables_without_rls");

  // Check for missing indexes (performance advisory)
  const { data: missingIndexes } = await client.rpc("get_missing_indexes");

  const advisories: Advisory[] = [];

  // Add RLS advisories
  if (tablesWithoutRls && Array.isArray(tablesWithoutRls)) {
    for (const table of tablesWithoutRls) {
      advisories.push({
        type: "security",
        message: `Table "${table.table_name}" has no Row Level Security policies`,
        severity: "warning",
        table: table.table_name,
      });
    }
  }

  // Add missing index advisories
  if (missingIndexes && Array.isArray(missingIndexes)) {
    for (const idx of missingIndexes) {
      advisories.push({
        type: "performance",
        message: `Table "${idx.table_name}" has high sequential scan ratio - consider adding index on "${idx.column_name}"`,
        severity: "warning",
        table: idx.table_name,
      });
    }
  }

  return {
    activeConnections: connections?.count ?? 0,
    slowQueries: (slowQueries ?? []).map((q: Record<string, unknown>) => ({
      query: String(q.query ?? "").substring(0, 200),
      calls: Number(q.calls ?? 0),
      totalTime: Number(q.total_time ?? 0),
      meanTime: Number(q.mean_time ?? 0),
    })),
    tableStats: (tableStats ?? []).map((t: Record<string, unknown>) => ({
      tableName: String(t.table_name ?? ""),
      rowCount: Number(t.row_count ?? 0),
      seqScans: Number(t.seq_scans ?? 0),
      indexScans: Number(t.index_scans ?? 0),
      deadTuples: Number(t.dead_tuples ?? 0),
    })),
    advisories,
  };
}

async function fetchAuthStats(
  client: ReturnType<typeof createClient>
): Promise<AuthStats> {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayISO = yesterday.toISOString();

  // Query recent auth events
  const { data: recentEvents } = await client
    .from("auth.audit_log_entries")
    .select("id, payload, created_at, ip_address")
    .gte("created_at", yesterdayISO)
    .order("created_at", { ascending: false })
    .limit(50);

  // Count failed logins
  const { count: failedLogins } = await client
    .from("auth.audit_log_entries")
    .select("*", { count: "exact", head: true })
    .gte("created_at", yesterdayISO)
    .or("payload->>action.eq.login,payload->>action.eq.user_signedup")
    .eq("payload->>error", "true");

  // Count signups
  const { count: signups } = await client
    .from("auth.audit_log_entries")
    .select("*", { count: "exact", head: true })
    .gte("created_at", yesterdayISO)
    .eq("payload->>action", "user_signedup");

  // Count password resets
  const { count: passwordResets } = await client
    .from("auth.audit_log_entries")
    .select("*", { count: "exact", head: true })
    .gte("created_at", yesterdayISO)
    .eq("payload->>action", "user_recovery_requested");

  return {
    recentEvents: (recentEvents ?? []).map((e: Record<string, unknown>) => ({
      id: String(e.id ?? ""),
      action: String(
        (e.payload as Record<string, unknown>)?.action ?? "unknown"
      ),
      createdAt: String(e.created_at ?? ""),
      ipAddress: e.ip_address ? String(e.ip_address) : undefined,
    })),
    failedLogins24h: failedLogins ?? 0,
    signups24h: signups ?? 0,
    passwordResets24h: passwordResets ?? 0,
  };
}

async function fetchEdgeFunctionStats(
  client: ReturnType<typeof createClient>
): Promise<EdgeFunctionStats> {
  // Edge function logs are stored in Supabase's internal logging system
  // We'll query download_requests table as a proxy for edge function activity
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayISO = yesterday.toISOString();

  const { count: totalInvocations } = await client
    .from("download_requests")
    .select("*", { count: "exact", head: true })
    .gte("created_at", yesterdayISO);

  const { count: errorCount } = await client
    .from("download_requests")
    .select("*", { count: "exact", head: true })
    .gte("created_at", yesterdayISO)
    .eq("status", "error");

  const invocations = totalInvocations ?? 0;
  const errors = errorCount ?? 0;
  const errorRate = invocations > 0 ? (errors / invocations) * 100 : 0;

  return {
    invocations24h: invocations,
    errors24h: errors,
    errorRate: Math.round(errorRate * 100) / 100,
  };
}

async function fetchEmailStats(): Promise<EmailStats> {
  const awsAccessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
  const awsSecretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");
  const awsRegion = Deno.env.get("AWS_REGION") ?? "eu-central-1";

  // If AWS credentials are not configured, return unavailable status
  if (!awsAccessKeyId || !awsSecretAccessKey) {
    return {
      sends24h: 0,
      deliveries24h: 0,
      bounces24h: 0,
      complaints24h: 0,
      rejects24h: 0,
      deliveryRate: 0,
      bounceRate: 0,
      available: false,
      error: "AWS credentials not configured",
    };
  }

  try {
    // Call SES GetSendStatistics API
    const host = `email.${awsRegion}.amazonaws.com`;
    const endpoint = `https://${host}/v2/email/deliverability-dashboard/statistics-report`;

    // For SES v2, we use GetSendStatistics which gives us the last 2 weeks
    // We'll use the simpler v1 API that's more reliable
    const sesV1Host = `email.${awsRegion}.amazonaws.com`;
    const sesV1Endpoint = `https://${sesV1Host}/?Action=GetSendStatistics&Version=2010-12-01`;

    const now = new Date();
    const dateStamp = now.toISOString().slice(0, 10).replace(/-/g, "");
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");

    // Create signature for AWS SigV4
    const method = "GET";
    const service = "ses";
    const algorithm = "AWS4-HMAC-SHA256";
    const credentialScope = `${dateStamp}/${awsRegion}/${service}/aws4_request`;

    const canonicalUri = "/";
    const canonicalQuerystring = "Action=GetSendStatistics&Version=2010-12-01";
    const canonicalHeaders = `host:${sesV1Host}\nx-amz-date:${amzDate}\n`;
    const signedHeaders = "host;x-amz-date";
    const payloadHash = await sha256("");

    const canonicalRequest = `${method}\n${canonicalUri}\n${canonicalQuerystring}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const stringToSign = `${algorithm}\n${amzDate}\n${credentialScope}\n${await sha256(
      canonicalRequest
    )}`;

    const signingKey = await getSignatureKey(
      awsSecretAccessKey,
      dateStamp,
      awsRegion,
      service
    );
    const signature = await hmacHex(signingKey, stringToSign);

    const authorizationHeader = `${algorithm} Credential=${awsAccessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    const response = await fetch(
      `https://${sesV1Host}/?${canonicalQuerystring}`,
      {
        method: "GET",
        headers: {
          Host: sesV1Host,
          "X-Amz-Date": amzDate,
          Authorization: authorizationHeader,
        },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("SES API error:", response.status, errorText);
      return {
        sends24h: 0,
        deliveries24h: 0,
        bounces24h: 0,
        complaints24h: 0,
        rejects24h: 0,
        deliveryRate: 0,
        bounceRate: 0,
        available: false,
        error: `SES API error: ${response.status}`,
      };
    }

    const xmlText = await response.text();

    // Parse XML response - SES returns data points for last 2 weeks
    // We'll sum up the last 24 hours (roughly 96 data points at 15-min intervals)
    const dataPointMatches = xmlText.matchAll(/<member>([\s\S]*?)<\/member>/g);

    let sends24h = 0;
    let deliveries24h = 0;
    let bounces24h = 0;
    let complaints24h = 0;
    let rejects24h = 0;

    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const match of dataPointMatches) {
      const dataPoint = match[1];
      const timestampMatch = dataPoint.match(/<Timestamp>(.*?)<\/Timestamp>/);
      if (timestampMatch) {
        const timestamp = new Date(timestampMatch[1]);
        if (timestamp >= yesterday) {
          const deliveryAttempts = parseInt(
            dataPoint.match(
              /<DeliveryAttempts>(\d+)<\/DeliveryAttempts>/
            )?.[1] ?? "0"
          );
          const bouncesCount = parseInt(
            dataPoint.match(/<Bounces>(\d+)<\/Bounces>/)?.[1] ?? "0"
          );
          const complaintsCount = parseInt(
            dataPoint.match(/<Complaints>(\d+)<\/Complaints>/)?.[1] ?? "0"
          );
          const rejectsCount = parseInt(
            dataPoint.match(/<Rejects>(\d+)<\/Rejects>/)?.[1] ?? "0"
          );

          sends24h += deliveryAttempts;
          bounces24h += bouncesCount;
          complaints24h += complaintsCount;
          rejects24h += rejectsCount;
        }
      }
    }

    // Calculate deliveries: sends - bounces - rejects
    // SES doesn't return deliveries directly, so we calculate it
    deliveries24h = Math.max(0, sends24h - bounces24h - rejects24h);

    const deliveryRate = sends24h > 0 ? (deliveries24h / sends24h) * 100 : 100;
    const bounceRate = sends24h > 0 ? (bounces24h / sends24h) * 100 : 0;

    return {
      sends24h,
      deliveries24h,
      bounces24h,
      complaints24h,
      rejects24h,
      deliveryRate: Math.round(deliveryRate * 100) / 100,
      bounceRate: Math.round(bounceRate * 100) / 100,
      available: true,
    };
  } catch (error) {
    console.error("Error fetching SES stats:", error);
    return {
      sends24h: 0,
      deliveries24h: 0,
      bounces24h: 0,
      complaints24h: 0,
      rejects24h: 0,
      deliveryRate: 0,
      bounceRate: 0,
      available: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// AWS SigV4 helper functions
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hmacBytes(
  key: ArrayBuffer | Uint8Array,
  message: string
): Promise<Uint8Array> {
  const keyBuffer = key instanceof Uint8Array ? key.buffer : key;
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyBuffer,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    cryptoKey,
    new TextEncoder().encode(message)
  );
  return new Uint8Array(signature);
}

async function hmacHex(
  key: ArrayBuffer | Uint8Array,
  message: string
): Promise<string> {
  const bytes = await hmacBytes(key, message);
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function getSignatureKey(
  secretKey: string,
  dateStamp: string,
  region: string,
  service: string
): Promise<Uint8Array> {
  const kDate = await hmacBytes(
    new TextEncoder().encode("AWS4" + secretKey),
    dateStamp
  );
  const kRegion = await hmacBytes(kDate, region);
  const kService = await hmacBytes(kRegion, service);
  const kSigning = await hmacBytes(kService, "aws4_request");
  return kSigning;
}

async function fetchCloudflareStats(): Promise<CloudflareStats> {
  const cfApiToken = Deno.env.get("CLOUDFLARE_API_TOKEN");
  const cfAccountId = Deno.env.get("CLOUDFLARE_ACCOUNT_ID");

  if (!cfApiToken) {
    return {
      requests24h: 0,
      errors24h: 0,
      errorRate: 0,
      bandwidth24h: 0,
      available: false,
      error: "CLOUDFLARE_API_TOKEN not configured",
    };
  }

  try {
    // Use Cloudflare GraphQL Analytics API
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Sanitize account ID - only allow alphanumeric and hyphens
    const sanitizedAccountId = cfAccountId
      ? cfAccountId.replace(/[^a-zA-Z0-9-]/g, "")
      : null;

    // Use GraphQL variables to prevent injection
    const query = `
      query($accountTag: String, $datetimeGeq: Time, $datetimeLeq: Time) {
        viewer {
          accounts(filter: {accountTag: $accountTag}) {
            workersInvocationsAdaptive(
              filter: {
                datetime_geq: $datetimeGeq
                datetime_leq: $datetimeLeq
              }
              limit: 1000
            ) {
              sum {
                requests
                errors
                subrequests
              }
            }
          }
        }
      }
    `;

    const variables = {
      accountTag: sanitizedAccountId || null,
      datetimeGeq: yesterday.toISOString(),
      datetimeLeq: now.toISOString(),
    };

    const response = await fetch(
      "https://api.cloudflare.com/client/v4/graphql",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfApiToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Cloudflare API error:", response.status, errorText);
      return {
        requests24h: 0,
        errors24h: 0,
        errorRate: 0,
        bandwidth24h: 0,
        available: false,
        error: `Cloudflare API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const accounts = data?.data?.viewer?.accounts || [];

    let totalRequests = 0;
    let totalErrors = 0;

    for (const account of accounts) {
      const invocations = account.workersInvocationsAdaptive || [];
      for (const inv of invocations) {
        totalRequests += inv.sum?.requests || 0;
        totalErrors += inv.sum?.errors || 0;
      }
    }

    const errorRate =
      totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0;

    return {
      requests24h: totalRequests,
      errors24h: totalErrors,
      errorRate: Math.round(errorRate * 100) / 100,
      bandwidth24h: 0, // Would need different API for bandwidth
      available: true,
    };
  } catch (error) {
    console.error("Error fetching Cloudflare stats:", error);
    return {
      requests24h: 0,
      errors24h: 0,
      errorRate: 0,
      bandwidth24h: 0,
      available: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

async function fetchVercelStats(): Promise<VercelStats> {
  const vercelToken = Deno.env.get("VERCEL_API_TOKEN");
  const vercelProjectId = Deno.env.get("VERCEL_PROJECT_ID");

  if (!vercelToken) {
    return {
      deployments: [],
      available: false,
      error: "VERCEL_API_TOKEN not configured",
    };
  }

  try {
    // Sanitize project ID - only allow alphanumeric, hyphens, and underscores
    const sanitizedProjectId = vercelProjectId
      ? vercelProjectId.replace(/[^a-zA-Z0-9_-]/g, "")
      : null;

    // Use URLSearchParams to safely construct URL
    const baseUrl = "https://api.vercel.com/v6/deployments";
    const params = new URLSearchParams({ limit: "5" });
    if (sanitizedProjectId) {
      params.set("projectId", sanitizedProjectId);
    }
    const url = `${baseUrl}?${params.toString()}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${vercelToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Vercel API error:", response.status, errorText);
      return {
        deployments: [],
        available: false,
        error: `Vercel API error: ${response.status}`,
      };
    }

    const data = await response.json();
    const deployments: VercelDeployment[] = (data.deployments || []).map(
      (d: Record<string, unknown>) => ({
        id: String(d.uid || ""),
        state: String(d.state || d.readyState || "unknown"),
        createdAt: String(
          d.created ? new Date(Number(d.created)).toISOString() : ""
        ),
        url: d.url ? String(d.url) : undefined,
        meta: d.meta
          ? {
              githubCommitMessage: (d.meta as Record<string, unknown>)
                .githubCommitMessage
                ? String(
                    (d.meta as Record<string, unknown>).githubCommitMessage
                  )
                : undefined,
              githubCommitRef: (d.meta as Record<string, unknown>)
                .githubCommitRef
                ? String((d.meta as Record<string, unknown>).githubCommitRef)
                : undefined,
            }
          : undefined,
      })
    );

    return {
      deployments,
      lastDeployment: deployments[0],
      available: true,
    };
  } catch (error) {
    console.error("Error fetching Vercel stats:", error);
    return {
      deployments: [],
      available: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

function detectAnomalies(
  dbStats: DatabaseStats,
  authStats: AuthStats,
  edgeFunctionStats: EdgeFunctionStats,
  emailStats: EmailStats,
  cloudflareStats: CloudflareStats
): Anomaly[] {
  const anomalies: Anomaly[] = [];

  // Check auth failures
  if (authStats.failedLogins24h > THRESHOLDS.authFailures.error) {
    anomalies.push({
      type: "auth",
      severity: "error",
      message: `High number of failed login attempts: ${authStats.failedLogins24h} in last 24h`,
      value: authStats.failedLogins24h,
      threshold: THRESHOLDS.authFailures.error,
    });
  } else if (authStats.failedLogins24h > THRESHOLDS.authFailures.warning) {
    anomalies.push({
      type: "auth",
      severity: "warning",
      message: `Elevated failed login attempts: ${authStats.failedLogins24h} in last 24h`,
      value: authStats.failedLogins24h,
      threshold: THRESHOLDS.authFailures.warning,
    });
  }

  // Check edge function error rate
  if (edgeFunctionStats.errorRate > THRESHOLDS.edgeFunctionErrorRate.error) {
    anomalies.push({
      type: "edge_function",
      severity: "error",
      message: `Critical edge function error rate: ${edgeFunctionStats.errorRate}%`,
      value: edgeFunctionStats.errorRate,
      threshold: THRESHOLDS.edgeFunctionErrorRate.error,
    });
  } else if (
    edgeFunctionStats.errorRate > THRESHOLDS.edgeFunctionErrorRate.warning
  ) {
    anomalies.push({
      type: "edge_function",
      severity: "warning",
      message: `Elevated edge function error rate: ${edgeFunctionStats.errorRate}%`,
      value: edgeFunctionStats.errorRate,
      threshold: THRESHOLDS.edgeFunctionErrorRate.warning,
    });
  }

  // Check slow queries count
  const slowQueryCount = dbStats.slowQueries.length;
  if (slowQueryCount > THRESHOLDS.slowQueries.error) {
    anomalies.push({
      type: "database",
      severity: "error",
      message: `Many slow queries detected: ${slowQueryCount}`,
      value: slowQueryCount,
      threshold: THRESHOLDS.slowQueries.error,
    });
  } else if (slowQueryCount > THRESHOLDS.slowQueries.warning) {
    anomalies.push({
      type: "database",
      severity: "warning",
      message: `Slow queries detected: ${slowQueryCount}`,
      value: slowQueryCount,
      threshold: THRESHOLDS.slowQueries.warning,
    });
  }

  // Check for tables with high dead tuples
  for (const table of dbStats.tableStats) {
    if (table.deadTuples > THRESHOLDS.deadTuples.error) {
      anomalies.push({
        type: "database",
        severity: "error",
        message: `Table "${table.tableName}" has ${table.deadTuples} dead tuples - vacuum recommended`,
        value: table.deadTuples,
        threshold: THRESHOLDS.deadTuples.error,
      });
    } else if (table.deadTuples > THRESHOLDS.deadTuples.warning) {
      anomalies.push({
        type: "database",
        severity: "warning",
        message: `Table "${table.tableName}" has ${table.deadTuples} dead tuples`,
        value: table.deadTuples,
        threshold: THRESHOLDS.deadTuples.warning,
      });
    }
  }

  // Add security advisories as anomalies
  for (const advisory of dbStats.advisories) {
    if (advisory.type === "security") {
      anomalies.push({
        type: "database",
        severity: advisory.severity,
        message: advisory.message,
      });
    }
  }

  // Check email bounce rate
  if (emailStats.available) {
    if (emailStats.bounceRate > THRESHOLDS.emailBounceRate.error) {
      anomalies.push({
        type: "email",
        severity: "error",
        message: `Critical email bounce rate: ${emailStats.bounceRate}%`,
        value: emailStats.bounceRate,
        threshold: THRESHOLDS.emailBounceRate.error,
      });
    } else if (emailStats.bounceRate > THRESHOLDS.emailBounceRate.warning) {
      anomalies.push({
        type: "email",
        severity: "warning",
        message: `Elevated email bounce rate: ${emailStats.bounceRate}%`,
        value: emailStats.bounceRate,
        threshold: THRESHOLDS.emailBounceRate.warning,
      });
    }

    // Check for complaints (any complaint is concerning)
    if (emailStats.complaints24h > 0) {
      anomalies.push({
        type: "email",
        severity: emailStats.complaints24h > 5 ? "error" : "warning",
        message: `Email complaints received: ${emailStats.complaints24h} in last 24h`,
        value: emailStats.complaints24h,
        threshold: 0,
      });
    }
  }

  // Check Cloudflare error rate
  if (cloudflareStats.available && cloudflareStats.errorRate > 5) {
    anomalies.push({
      type: "edge_function", // Using edge_function type for CF workers
      severity: cloudflareStats.errorRate > 10 ? "error" : "warning",
      message: `Cloudflare Workers error rate: ${cloudflareStats.errorRate}%`,
      value: cloudflareStats.errorRate,
      threshold: 5,
    });
  }

  return anomalies;
}
