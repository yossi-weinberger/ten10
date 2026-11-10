import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import {
  gatewaySystemOneBody,
  JEV_DUPLICATE_MODEL,
  JEV_SYSTEMONE_URL,
} from "../_shared/ai/jev-duplicate-rank.ts";
import { buildIntentBody, readChomeshChoice, readHalachaChoice, readIntentChoice } from "../_shared/ai/jev-intent.ts";
import { readContextField } from "../_shared/ai/conversation-context.ts";
import { callModel } from "../_shared/ai/model-call.ts";
import { serviceModelCallRecorder } from "../_shared/ai/model-call-recorder.ts";
import { serviceUsageGate } from "../_shared/ai/usage-gate-client.ts";
import { readTurnId } from "../_shared/ai/usage-gate.ts";
import { requireAiUser } from "../_shared/ai/require-ai-user.ts";

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const setup = await requireAiUser(req, {
    methodNotAllowedBody: { intent: null },
    notAllowedBody: { intent: null },
  });
  if (!setup.ok) return setup.response;
  const { userId, origin } = setup;

  const body = await req.json().catch(() => null) as { text?: unknown; context?: unknown; turn?: unknown } | null;
  const text = typeof body?.text === "string" ? body.text.trim() : "";
  if (!text) return json(origin, { intent: "out_of_scope" }, 200);

  const apiKey = (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim();
  if (!apiKey) return json(origin, { intent: null, reason: "unavailable" }, 200);

  const usage = serviceUsageGate();
  const allowed = await usage.consume(userId, "text", { id: readTurnId(body?.turn), op: "intent" });
  if (!allowed.allowed) {
    if (allowed.reason === "not_allowed") return json(origin, { intent: null }, 200);
    return json(origin, { intent: null, reason: allowed.reason, resets_at: allowed.resetsAt }, 200);
  }

  try {
    const result = await callModel({
      userId,
      operation: "intent",
      model: JEV_DUPLICATE_MODEL,
      url: JEV_SYSTEMONE_URL,
      init: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(gatewaySystemOneBody(buildIntentBody(text, readContextField(body?.context)), {
          source: "app",
        })),
      },
      timeoutMs: 8000,
      record: serviceModelCallRecorder(),
    });
    if (!result.ok) {
      logger.error(`jev intent failed: ${result.status ?? result.errorCode}`);
      await usage.release(allowed.usageId);
      return json(origin, { intent: null, reason: "unavailable" }, 200);
    }
    const payload = result.payload;
    const choice = readIntentChoice(payload);
    if (!choice) return json(origin, { intent: null }, 200);
    const page = readHalachaChoice(payload);
    return json(origin, {
      intent: choice.intent,
      confidence: choice.confidence,
      count: null,
      count_confidence: null,
      halacha_page: page?.page ?? null,
      halacha_page_confidence: page?.confidence ?? null,
      chomesh: readChomeshChoice(payload),
    }, 200);
  } catch {
    logger.error("jev intent failed");
    await usage.release(allowed.usageId);
    return json(origin, { intent: null, reason: "unavailable" }, 200);
  }
});
