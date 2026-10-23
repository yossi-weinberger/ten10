import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import type { AiBucketGrain } from "../_shared/ai/admin-buckets.ts";
import {
  aggregateDayReport,
  isAdminFlag,
  parseGatewayReport,
  sourceTotals,
  type SpendBucket,
} from "./report.ts";

const REPORT_URL = "https://ai-gateway.vercel.sh/v1/report";
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
/** First UTC day whose calls send source tags. Earlier days stay mixed. */
const TAGGING_START = "2026-10-23";
const MAX_MODELS = 8;

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

function empty(origin: string | null, grain: AiBucketGrain, mixed: boolean): Response {
  return json(origin, {
    available: false,
    mixed,
    grain,
    models: [],
    days: [],
    modelBuckets: [],
    appBuckets: null,
    sources: { app: 0, eval: 0 },
  }, 200);
}

async function report(
  key: string,
  from: string,
  to: string,
  params: Record<string, string>,
): Promise<unknown | null> {
  const url = new URL(REPORT_URL);
  url.searchParams.set("start_date", from);
  url.searchParams.set("end_date", to);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetch(url, { headers: { Authorization: `Bearer ${key}` } });
  if (!response.ok) {
    logger.error(`ai gateway report failed: ${response.status}`);
    return null;
  }
  return response.json();
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(origin) });
  if (req.method !== "GET") return json(origin, { error: "Method not allowed" }, 405);

  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? "";
  const to = url.searchParams.get("to") ?? "";
  if (!ISO_DAY.test(from) || !ISO_DAY.test(to) || to < from) {
    return json(origin, { error: "Invalid range" }, 400);
  }
  const mixed = from < TAGGING_START;

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(origin, { error: "Missing authorization" }, 401);

  const userClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (userError || !userData.user) return json(origin, { error: "Invalid token" }, 401);
  const { data: adminFlag, error: adminError } = await userClient.rpc("is_admin_user");
  if (adminError || !isAdminFlag(adminFlag)) return json(origin, { error: "Forbidden" }, 403);

  const apiKey = (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim();
  if (!apiKey) return empty(origin, aggregateDayReport(null, from, to).grain, mixed);

  try {
    const [models, days, tags] = await Promise.all([
      report(apiKey, from, to, { group_by: "model" }),
      report(apiKey, from, to, { group_by: "day" }),
      report(apiKey, from, to, { group_by: "tag" }),
    ]);
    if (!models || !days || !tags) return empty(origin, aggregateDayReport(null, from, to).grain, mixed);

    const modelRows = parseGatewayReport(models).slice(0, MAX_MODELS);
    const dayReport = aggregateDayReport(days, from, to);
    const modelBuckets: Array<SpendBucket & { model: string }> = [];
    const perModel = await Promise.all(modelRows.map(async (row) => {
      const payload = await report(apiKey, from, to, { group_by: "day", model: row.label });
      return { model: row.label, buckets: payload ? aggregateDayReport(payload, from, to).buckets : [] };
    }));
    for (const series of perModel) {
      for (const bucket of series.buckets) {
        modelBuckets.push({ model: series.model, ...bucket });
      }
    }

    const sources = sourceTotals(tags);
    let appBuckets: SpendBucket[] | null = null;
    if (!mixed) {
      const appDays = await report(apiKey, from, to, { group_by: "day", tags: "source:app" });
      appBuckets = appDays && sources.app > 0 ? aggregateDayReport(appDays, from, to).buckets : null;
    }

    return json(origin, {
      available: true,
      mixed,
      grain: dayReport.grain,
      models: modelRows,
      days: dayReport.buckets,
      modelBuckets,
      appBuckets,
      sources: { app: sources.app, eval: sources.evalCost },
    }, 200);
  } catch {
    logger.error("ai gateway report failed");
    return empty(origin, aggregateDayReport(null, from, to).grain, mixed);
  }
});
