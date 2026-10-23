import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { hashGatewayUser } from "../_shared/ai/gateway-tags.ts";
import { gatewaySystemOneBody, JEV_SYSTEMONE_URL } from "../_shared/ai/jev-duplicate-rank.ts";
import { buildIntentBody, readIntentChoice } from "../_shared/ai/jev-intent.ts";
import { isAiIntakeEnabled } from "../_shared/ai/enabled.ts";
import { isTrialUser } from "../_shared/ai/trial-users.ts";

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return json(origin, { intent: null }, 405);
  if (!isAiIntakeEnabled()) return json(origin, { reason: "unavailable" }, 200);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json(origin, { error: "Missing authorization" }, 401);

  const userClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    { global: { headers: { Authorization: authHeader } } },
  );
  const { data: userData, error: userError } = await userClient.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (userError || !userData.user) return json(origin, { error: "Invalid token" }, 401);
  if (!isTrialUser(userData.user.id)) return json(origin, { intent: null }, 200);

  const body = await req.json().catch(() => null) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return json(origin, { intent: "out_of_scope" }, 200);

  const apiKey = (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim();
  if (!apiKey) return json(origin, { intent: null, reason: "unavailable" }, 200);

  try {
    const response = await fetch(JEV_SYSTEMONE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(gatewaySystemOneBody(buildIntentBody(text), {
        source: "app",
        feature: "intent",
        user: await hashGatewayUser(userData.user.id),
      })),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      logger.error(`jev intent failed: ${response.status}`);
      return json(origin, { intent: null, reason: "unavailable" }, 200);
    }
    const choice = readIntentChoice(await response.json());
    if (!choice) return json(origin, { intent: null }, 200);
    return json(origin, { intent: choice.intent, confidence: choice.confidence }, 200);
  } catch {
    logger.error("jev intent failed");
    return json(origin, { intent: null, reason: "unavailable" }, 200);
  }
});
