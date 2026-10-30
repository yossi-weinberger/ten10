import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { gatewayProviderOptions } from "../_shared/ai/gateway-tags.ts";
import { isAiIntakeEnabled } from "../_shared/ai/enabled.ts";
import { isTrialUser } from "../_shared/ai/trial-users.ts";
import { callModel } from "../_shared/ai/model-call.ts";
import { serviceModelCallRecorder } from "../_shared/ai/model-call-recorder.ts";
import { serviceUsageGate } from "../_shared/ai/usage-gate-client.ts";
import { readModelText } from "../_shared/ai/receipt-draft.ts";
import { readSplitResponse } from "../_shared/ai/split-response.ts";
import { SPLIT_MODEL, SPLIT_RESPONSES_URL, splitPrompt } from "../_shared/ai/split-prompt.ts";

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return json(origin, { route: "unreadable" }, 405);
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
  if (!isTrialUser(userData.user.id)) return json(origin, { reason: "unavailable" }, 200);

  const body = await req.json().catch(() => null) as { text?: unknown; today?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const today = typeof body?.today === "string" ? body.today : "";
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return json(origin, { route: "unreadable" }, 200);

  const apiKey = (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim();
  if (!apiKey) return json(origin, { reason: "unavailable" }, 200);

  const usage = serviceUsageGate();
  const allowed = await usage.consumeCall(userData.user.id);
  if (!allowed.allowed) return json(origin, { reason: allowed.reason }, 200);

  try {
    const result = await callModel({
      userId: userData.user.id,
      operation: "split",
      model: SPLIT_MODEL,
      url: SPLIT_RESPONSES_URL,
      init: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: SPLIT_MODEL,
          max_output_tokens: 1200,
          input: [{ role: "user", content: [{ type: "input_text", text: splitPrompt(text, today) }] }],
          providerOptions: { gateway: gatewayProviderOptions({ source: "app" }) },
        }),
      },
      timeoutMs: 20000,
      record: serviceModelCallRecorder(),
    });
    if (!result.ok) {
      logger.error(`split failed: ${result.status ?? result.errorCode}`);
      await usage.release(allowed.usageId);
      return json(origin, { reason: "unavailable" }, 200);
    }
    const split = readSplitResponse(text, readModelText(result.payload), today);
    return json(origin, split, 200);
  } catch (error) {
    logger.error(`split error: ${error instanceof Error ? error.name : "unknown"}`);
    await usage.release(allowed.usageId);
    return json(origin, { reason: "unavailable" }, 200);
  }
});
