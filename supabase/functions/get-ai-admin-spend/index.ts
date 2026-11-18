import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { parseGatewayCredits } from "../_shared/ai/gateway-credits.ts";
import { EVAL_SOURCE_TAG } from "../_shared/ai/gateway-tags.ts";
import {
  appDailyCosts,
  dailyCosts,
  isAdminFlag,
  parseGatewayReport,
  sumCost,
} from "./report.ts";

const REPORT_URL = "https://ai-gateway.vercel.sh/v1/report";
const CREDITS_URL = "https://ai-gateway.vercel.sh/v1/credits";
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
/** First UTC day eval scripts tag `source:eval`. Before it, app spend still includes eval runs. */
const TAGGING_START = "2026-10-23";
const MAX_MODELS = 8;
const GATEWAY_TIMEOUT_MS = 10000;

export type AdminCreditsBody = {
  available: boolean;
  balance: string | null;
  totalUsed: string | null;
  passRemaining: string | null;
};

const CREDITS_UNAVAILABLE: AdminCreditsBody = {
  available: false,
  balance: null,
  totalUsed: null,
  passRemaining: null,
};

export type AdminSpendAuth = "ok" | "invalid" | "forbidden";

export type AdminSpendDeps = {
  authorize: (authHeader: string) => Promise<AdminSpendAuth>;
  apiKey: () => string;
  fetchImpl: typeof fetch;
  warn: (message: string) => void;
};

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

function emptySpend(mixed: boolean, credits: AdminCreditsBody) {
  return {
    available: false,
    mixed,
    models: [],
    appDays: [],
    sources: { app: 0, eval: 0 },
    credits,
  };
}

/** Each report query is billed, so the function makes exactly three. */
async function report(
  fetchImpl: typeof fetch,
  key: string,
  from: string,
  to: string,
  params: Record<string, string>,
): Promise<unknown | null> {
  const url = new URL(REPORT_URL);
  url.searchParams.set("start_date", from);
  url.searchParams.set("end_date", to);
  for (const [name, value] of Object.entries(params)) url.searchParams.set(name, value);
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
  });
  if (!response.ok) {
    logger.error(`ai gateway report failed: ${response.status}`);
    return null;
  }
  return response.json();
}

async function loadReports(
  fetchImpl: typeof fetch,
  key: string,
  from: string,
  to: string,
  mixed: boolean,
) {
  const [models, days, evalDays] = await Promise.all([
    report(fetchImpl, key, from, to, { group_by: "model" }),
    report(fetchImpl, key, from, to, { group_by: "day" }),
    report(fetchImpl, key, from, to, { group_by: "day", tags: EVAL_SOURCE_TAG }),
  ]);
  if (!models || !days || !evalDays) return null;
  const evalCosts = dailyCosts(evalDays);
  const appDays = appDailyCosts(dailyCosts(days), evalCosts);
  return {
    available: true,
    mixed,
    models: parseGatewayReport(models).slice(0, MAX_MODELS),
    appDays,
    sources: { app: sumCost(appDays), eval: sumCost(evalCosts) },
  };
}

async function loadCredits(
  fetchImpl: typeof fetch,
  key: string,
  warn: (message: string) => void,
): Promise<AdminCreditsBody> {
  try {
    const response = await fetchImpl(CREDITS_URL, {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(GATEWAY_TIMEOUT_MS),
    });
    if (!response.ok) {
      warn("ai gateway credits failed");
      return CREDITS_UNAVAILABLE;
    }
    const credits = parseGatewayCredits(await response.json());
    if (!credits) {
      warn("ai gateway credits failed");
      return CREDITS_UNAVAILABLE;
    }
    return { available: true, ...credits };
  } catch {
    warn("ai gateway credits failed");
    return CREDITS_UNAVAILABLE;
  }
}

export async function handleAdminAiSpend(req: Request, deps: AdminSpendDeps): Promise<Response> {
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

  const auth = await deps.authorize(authHeader);
  if (auth === "invalid") return json(origin, { error: "Invalid token" }, 401);
  if (auth === "forbidden") return json(origin, { error: "Forbidden" }, 403);

  const apiKey = deps.apiKey();
  if (!apiKey) {
    deps.warn("ai gateway key missing");
    return json(origin, emptySpend(mixed, CREDITS_UNAVAILABLE), 200);
  }

  const [reportsOutcome, creditsOutcome] = await Promise.allSettled([
    loadReports(deps.fetchImpl, apiKey, from, to, mixed),
    loadCredits(deps.fetchImpl, apiKey, deps.warn),
  ]);
  const credits = creditsOutcome.status === "fulfilled" ? creditsOutcome.value : CREDITS_UNAVAILABLE;
  if (creditsOutcome.status === "rejected") deps.warn("ai gateway credits failed");

  if (reportsOutcome.status !== "fulfilled" || !reportsOutcome.value) {
    if (reportsOutcome.status === "rejected") logger.error("ai gateway report failed");
    return json(origin, emptySpend(mixed, credits), 200);
  }

  return json(origin, { ...reportsOutcome.value, credits }, 200);
}

async function authorize(authHeader: string): Promise<AdminSpendAuth> {
  const userClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (userError || !userData.user) return "invalid";
  const { data: adminFlag, error: adminError } = await userClient.rpc("is_admin_user");
  if (adminError || !isAdminFlag(adminFlag)) return "forbidden";
  return "ok";
}

if (import.meta.main) {
  Deno.serve((req) =>
    handleAdminAiSpend(req, {
      authorize,
      apiKey: () => (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim(),
      fetchImpl: fetch,
      warn: (message) => logger.warn(message),
    })
  );
}
