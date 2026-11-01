import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { gatewaySystemOneBody, JEV_SYSTEMONE_URL } from "../_shared/ai/jev-duplicate-rank.ts";
import { isAiIntakeEnabled } from "../_shared/ai/enabled.ts";
import { isTrialUser } from "../_shared/ai/trial-users.ts";
import { callModel } from "../_shared/ai/model-call.ts";
import { serviceModelCallRecorder } from "../_shared/ai/model-call-recorder.ts";
import { serviceUsageGate } from "../_shared/ai/usage-gate-client.ts";
import {
  buildQuestionSlotBody,
  predefinedQuestionCategories,
  readQuestionSlots,
  slotConfidence,
} from "../_shared/ai/question-slots.ts";
import { saveQuestionMeasurement } from "./measurement.ts";
import { readModelText } from "../_shared/ai/receipt-draft.ts";
import { anchoredQuestionName } from "../_shared/ai/data-question.ts";
import {
  boundsFromPeriod,
  periodRequestBody,
  readPeriodPayload,
  SPLIT_RESPONSES_URL,
} from "../_shared/ai/question-period.ts";
import { SPLIT_MODEL } from "../_shared/ai/split-prompt.ts";

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

  const body = await req.json().catch(() => null) as { text?: unknown; calendar?: unknown; today?: unknown; context?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const context = typeof body?.context === "string" ? body.context.slice(0, 800) : "";
  const calendar = body?.calendar === "hebrew" ? "hebrew" : "gregorian";
  const today = typeof body?.today === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.today)
    ? body.today
    : new Date().toISOString().slice(0, 10);
  if (!text) return json(origin, { reason: "unavailable" }, 200);

  const apiKey = (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim();
  if (!apiKey) return json(origin, { reason: "unavailable" }, 200);

  const prepStarted = Date.now();
  const [allowed, recipientCall, categoryCalls] = await Promise.all([
    serviceUsageGate().consumeCall(userData.user.id),
    userClient.rpc("list_ai_recipients"),
    Promise.all(CATEGORY_TYPES.map((type) => userClient.rpc("get_user_categories", { p_type: type }))),
  ]);
  const prepMs = Date.now() - prepStarted;
  if (!allowed.allowed) return json(origin, { reason: allowed.reason, prep_ms: prepMs }, 200);
  const lists = {
    recipients: namesFrom(recipientCall.data),
    categories: [
      ...predefinedQuestionCategories(),
      ...categoryCalls.flatMap((call) => namesFrom(call.data)),
    ],
  };

  const slotsCall = (async () => {
    try {
      const request = buildQuestionSlotBody(text, lists, context);
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
          })),
        },
        timeoutMs: 12000,
        record: serviceModelCallRecorder(),
      });
      if (!result.ok) {
        logger.error(`jev question slots failed: ${result.status ?? result.errorCode}`);
        return { slots: null, signals: {} as Record<string, number> };
      }
      return {
        slots: readQuestionSlots(result.payload, lists),
        signals: slotConfidence(result.payload) ?? {},
      };
    } catch {
      logger.error("jev question slots failed");
      return { slots: null, signals: {} as Record<string, number> };
    }
  })();
  const periodCall = (async () => {
    try {
      const result = await callModel({
        userId: userData.user.id,
        operation: "question_period",
        model: SPLIT_MODEL,
        url: SPLIT_RESPONSES_URL,
        init: {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(periodRequestBody(context ? `${context}\n${text}` : text, today, "app", calendar)),
        },
        timeoutMs: 8000,
        record: serviceModelCallRecorder(),
      });
      if (!result.ok) {
        logger.error(`question period failed: ${result.status ?? result.errorCode}`);
        return { period: null, nameText: null as string | null };
      }
      const raw = readPeriodPayload(readModelText(result.payload));
      if (!raw) return { period: null, nameText: null as string | null };
      const nameText = raw.name_text ?? null;
      if (raw.kind === "all") return { period: { kind: "all" as const }, nameText };
      const bounds = boundsFromPeriod(raw, today);
      const period = bounds?.from && bounds.to
        ? { kind: "span" as const, from: bounds.from, to: bounds.to }
        : null;
      return { period, nameText };
    } catch {
      logger.error("question period failed");
      return { period: null, nameText: null as string | null };
    }
  })();
  const modelStarted = Date.now();
  const [slotOutcome, read] = await Promise.all([slotsCall, periodCall]);
  const modelMs = Date.now() - modelStarted;
  const period = read.period;
  let slots = slotOutcome.slots;
  const bareName = anchoredQuestionName(text, read.nameText, []);
  const nameText = slots?.family
    ? anchoredQuestionName(text, bareName, slots.family === "donation" ? lists.recipients : lists.categories)
    : bareName;
  if (slots && nameText && slots.family === "donation" && !slots.recipient) slots = { ...slots, recipient: nameText };
  if (slots && nameText && slots.family && slots.family !== "donation" && !slots.category) {
    slots = { ...slots, category: nameText };
  }
  const signals = slotOutcome.signals;

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
  const timing = { prep_ms: prepMs, model_ms: modelMs };
  if (!slots) return json(origin, { reason: "unavailable", measurement_id: measurementId, period, name_text: nameText, ...timing }, 200);
  return json(origin, { ...slots, measurement_id: measurementId, period, name_text: nameText, ...timing }, 200);
});
