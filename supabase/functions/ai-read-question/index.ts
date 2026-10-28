import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { hashGatewayUser } from "../_shared/ai/gateway-tags.ts";
import { gatewaySystemOneBody, JEV_SYSTEMONE_URL } from "../_shared/ai/jev-duplicate-rank.ts";
import { isAiIntakeEnabled } from "../_shared/ai/enabled.ts";
import { isTrialUser } from "../_shared/ai/trial-users.ts";
import { callModel } from "../_shared/ai/model-call.ts";
import { serviceModelCallRecorder } from "../_shared/ai/model-call-recorder.ts";
import {
  buildQuestionSlotBody,
  predefinedQuestionCategories,
  readQuestionSlots,
  slotConfidence,
} from "../_shared/ai/question-slots.ts";
import { saveQuestionMeasurement } from "./measurement.ts";

const CATEGORY_TYPES = ["income", "exempt-income", "expense", "recognized-expense"] as const;

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

function namesFrom(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((row) => {
    if (typeof row === "string" && row.trim()) return [row];
    if (!row || typeof row !== "object") return [];
    const category = (row as { category?: unknown }).category;
    return typeof category === "string" && category.trim() ? [category] : [];
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return json(origin, { reason: "unavailable" }, 405);
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

  const body = await req.json().catch(() => null) as { text?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return json(origin, { reason: "unavailable" }, 200);

  const apiKey = (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim();
  if (!apiKey) return json(origin, { reason: "unavailable" }, 200);

  const recipientCall = await userClient.rpc("list_ai_recipients");
  const categoryCalls = await Promise.all(CATEGORY_TYPES.map((type) => (
    userClient.rpc("get_user_categories", { p_type: type })
  )));
  const lists = {
    recipients: namesFrom(recipientCall.data),
    categories: [
      ...predefinedQuestionCategories(),
      ...categoryCalls.flatMap((call) => namesFrom(call.data)),
    ],
  };

  let slots: ReturnType<typeof readQuestionSlots> = null;
  let signals: Record<string, number> = {};
  try {
    const request = buildQuestionSlotBody(text, lists);
    const result = await callModel({
      userId: userData.user.id,
      operation: "question_slots",
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
          feature: "question_slots",
          user: await hashGatewayUser(userData.user.id),
        })),
      },
      timeoutMs: 12000,
      record: serviceModelCallRecorder(),
    });
    if (!result.ok) {
      logger.error(`jev question slots failed: ${result.status ?? result.errorCode}`);
    } else {
      slots = readQuestionSlots(result.payload, lists);
      signals = slotConfidence(result.payload) ?? {};
    }
  } catch {
    logger.error("jev question slots failed");
  }

  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  let measurementId: string | null = null;
  if (serviceKey) {
    const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey);
    measurementId = await saveQuestionMeasurement(
      (args) => admin.rpc("record_ai_slot_confidence", args),
      userData.user.id,
      signals,
    );
    if (!measurementId) logger.error("slot confidence was not saved");
  }
  if (!slots) return json(origin, { reason: "unavailable", measurement_id: measurementId }, 200);
  return json(origin, { ...slots, measurement_id: measurementId }, 200);
});
