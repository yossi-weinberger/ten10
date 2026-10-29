import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { gatewaySystemOneBody, JEV_SYSTEMONE_URL } from "../_shared/ai/jev-duplicate-rank.ts";
import { CATEGORY_KEYS_BY_TYPE } from "../_shared/transaction-domain/category-keys.ts";
import {
  buildShadowBody,
  categoryBase,
  readShadowChoice,
  readTypeChoice,
} from "../_shared/ai/jev-type-choice.ts";
import { isAiIntakeEnabled } from "../_shared/ai/enabled.ts";
import { isTrialUser } from "../_shared/ai/trial-users.ts";
import { callModel } from "../_shared/ai/model-call.ts";
import { serviceModelCallRecorder } from "../_shared/ai/model-call-recorder.ts";
import { serviceUsageGate } from "../_shared/ai/usage-gate-client.ts";

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return json(origin, { recorded: false }, 405);
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
  if (!isTrialUser(userData.user.id)) return json(origin, { recorded: false }, 200);

  const body = await req.json().catch(() => null) as { item_id?: unknown; shadow_type?: unknown } | null;
  const itemId = typeof body?.item_id === "string" ? body.item_id : "";
  if (!itemId) return json(origin, { recorded: false }, 400);

  const { data: context, error: contextError } = await userClient.rpc("read_ai_shadow_type_context", {
    p_item_id: itemId,
  });
  if (contextError || !context || typeof context !== "object") {
    return json(origin, { recorded: false }, 200);
  }
  const record = context as {
    description?: unknown;
    amount?: unknown;
    currency?: unknown;
    date?: unknown;
    type?: unknown;
    category?: unknown;
  };
  const amount = typeof record.amount === "number" ? record.amount : Number(record.amount);
  if (
    typeof record.description !== "string"
    || typeof record.currency !== "string"
    || typeof record.date !== "string"
    || typeof record.type !== "string"
    || !/^\d{4}-\d{2}-\d{2}$/.test(record.date)
    || !Number.isFinite(amount)
    || amount === 0
  ) {
    return json(origin, { recorded: false }, 200);
  }

  const base = categoryBase(record.type);
  let categories: string[] = [];
  if (base) {
    const { data } = await userClient.rpc("get_user_categories", { p_type: base });
    const custom = Array.isArray(data)
      ? data.flatMap((row) => {
        if (typeof row === "string") return [row];
        if (row && typeof row === "object" && typeof (row as { category?: unknown }).category === "string") {
          return [(row as { category: string }).category];
        }
        return [];
      })
      : [];
    categories = [...CATEGORY_KEYS_BY_TYPE[base], ...custom];
  }

  const request = buildShadowBody({
    description: record.description,
    amount,
    currency: record.currency,
    date: record.date,
    includeType: body?.shadow_type === true,
    categoryBase: base,
    categories,
  });
  if (!request) return json(origin, { recorded: false }, 200);

  const apiKey = (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim();
  if (!apiKey) return json(origin, { recorded: false }, 200);

  const allowed = await serviceUsageGate().consumeCall(userData.user.id);
  if (!allowed.allowed) return json(origin, { recorded: false, reason: allowed.reason }, 200);

  try {
    const result = await callModel({
      userId: userData.user.id,
      operation: "shadow",
      model: request.model,
      url: JEV_SYSTEMONE_URL,
      init: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gatewaySystemOneBody(request, {
          source: "app",
        })),
      },
      timeoutMs: 8000,
      record: serviceModelCallRecorder(),
    });
    if (!result.ok) {
      logger.error(`jev shadow failed: ${result.status ?? result.errorCode}`);
      return json(origin, { recorded: false }, 200);
    }
    const payload = result.payload;
    const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
    if (!serviceKey) return json(origin, { recorded: false }, 200);
    const adminClient = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
    let recorded = false;
    if (request.questions.transaction_type) {
      const choice = readTypeChoice(payload);
      if (choice) {
        const { error } = await adminClient.rpc("record_ai_shadow_type", {
          p_item_id: itemId,
          p_user_id: userData.user.id,
          p_choice: choice.choice,
          p_confidence: choice.confidence,
        });
        recorded = !error;
      }
    }
    if (request.questions.category) {
      const choice = readShadowChoice(payload, "category", Object.keys(request.questions.category.criteria));
      if (choice) {
        const { error } = await adminClient.rpc("record_ai_shadow_category", {
          p_item_id: itemId,
          p_user_id: userData.user.id,
          p_choice: choice.choice,
          p_confidence: choice.confidence,
        });
        recorded = recorded || !error;
      }
    }
    return json(origin, { recorded }, 200);
  } catch {
    logger.error("jev shadow failed");
    return json(origin, { recorded: false }, 200);
  }
});
