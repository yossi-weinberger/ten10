import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { parseGatewayReport } from "./report.ts";

const REPORT_URL = "https://ai-gateway.vercel.sh/v1/report";

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

async function report(key: string, groupBy: "model" | "day"): Promise<unknown> {
  const end = new Date();
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  const url = new URL(REPORT_URL);
  url.searchParams.set("start_date", isoDay(start));
  url.searchParams.set("end_date", isoDay(end));
  url.searchParams.set("group_by", groupBy);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${key}` },
  });
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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(origin, { error: "Missing authorization" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const jwt = authHeader.replace("Bearer ", "");
  const { data: userData, error: userError } = await userClient.auth.getUser(jwt);
  if (userError || !userData.user?.email) return json(origin, { error: "Invalid token" }, 401);

  const adminClient = createClient(supabaseUrl, serviceKey);
  const { data: adminData, error: adminError } = await adminClient
    .from("admin_emails")
    .select("email")
    .eq("email", userData.user.email)
    .maybeSingle();
  if (adminError || !adminData) return json(origin, { error: "Forbidden" }, 403);

  const apiKey = (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim();
  if (!apiKey) {
    return json(origin, { available: false, mixed: true, models: [], days: [] }, 200);
  }

  try {
    const [models, days] = await Promise.all([
      report(apiKey, "model"),
      report(apiKey, "day"),
    ]);
    if (!models || !days) {
      return json(origin, { available: false, mixed: true, models: [], days: [] }, 200);
    }
    return json(origin, {
      available: true,
      mixed: true,
      models: parseGatewayReport(models),
      days: parseGatewayReport(days),
    }, 200);
  } catch {
    logger.error("ai gateway report failed");
    return json(origin, { available: false, mixed: true, models: [], days: [] }, 200);
  }
});
