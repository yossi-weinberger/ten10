import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { isAdminFlag } from "../get-ai-admin-spend/report.ts";
import { parseGatewayCredits } from "./credits.ts";

const CREDITS_URL = "https://ai-gateway.vercel.sh/v1/credits";
const CREDITS_TIMEOUT_MS = 10000;

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

function unavailable(origin: string | null): Response {
  return json(origin, { available: false, balance: null, totalUsed: null, passRemaining: null }, 200);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(origin) });
  if (req.method !== "GET") return json(origin, { error: "Method not allowed" }, 405);

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
  if (!apiKey) return unavailable(origin);

  try {
    const response = await fetch(CREDITS_URL, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(CREDITS_TIMEOUT_MS),
    });
    if (!response.ok) {
      logger.error(`ai gateway credits failed: ${response.status}`);
      return unavailable(origin);
    }
    const credits = parseGatewayCredits(await response.json());
    if (!credits) return unavailable(origin);
    return json(origin, { available: true, ...credits }, 200);
  } catch {
    logger.error("ai gateway credits failed");
    return unavailable(origin);
  }
});
