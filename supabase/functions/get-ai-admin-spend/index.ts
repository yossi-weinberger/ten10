import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { EVAL_SOURCE_TAG } from "../_shared/ai/gateway-tags.ts";
import {
  appDailyCosts,
  dailyCosts,
  isAdminFlag,
  parseGatewayReport,
  sumCost,
} from "./report.ts";

const REPORT_URL = "https://ai-gateway.vercel.sh/v1/report";
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
/** First UTC day eval scripts tag `source:eval`. Before it, app spend still includes eval runs. */
const TAGGING_START = "2026-10-23";
const MAX_MODELS = 8;

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

function empty(origin: string | null, mixed: boolean): Response {
  return json(origin, {
    available: false,
    mixed,
    models: [],
    appDays: [],
    sources: { app: 0, eval: 0 },
  }, 200);
}

/** Each report query is billed, so the function makes exactly three. */
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
  if (!apiKey) return empty(origin, mixed);

  try {
    const [models, days, evalDays] = await Promise.all([
      report(apiKey, from, to, { group_by: "model" }),
      report(apiKey, from, to, { group_by: "day" }),
      report(apiKey, from, to, { group_by: "day", tags: EVAL_SOURCE_TAG }),
    ]);
    if (!models || !days || !evalDays) return empty(origin, mixed);

    const evalCosts = dailyCosts(evalDays);
    const appDays = appDailyCosts(dailyCosts(days), evalCosts);
    return json(origin, {
      available: true,
      mixed,
      models: parseGatewayReport(models).slice(0, MAX_MODELS),
      appDays,
      sources: { app: sumCost(appDays), eval: sumCost(evalCosts) },
    }, 200);
  } catch {
    logger.error("ai gateway report failed");
    return empty(origin, mixed);
  }
});
