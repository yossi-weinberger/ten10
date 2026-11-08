import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { isAiIntakeEnabled } from "../_shared/ai/enabled.ts";
import { isTrialUser } from "../_shared/ai/trial-users.ts";
import { callModel } from "../_shared/ai/model-call.ts";
import { serviceModelCallRecorder } from "../_shared/ai/model-call-recorder.ts";
import { serviceUsageGate } from "../_shared/ai/usage-gate-client.ts";
import { readTurnId } from "../_shared/ai/usage-gate.ts";
import { readModelText } from "../_shared/ai/receipt-draft.ts";
import { parseSplitPayload, readSplitResponse } from "../_shared/ai/split-response.ts";
import { splitReadContext, type SplitRuleRef } from "../_shared/ai/split-anchor.ts";
import { loadSplitLists } from "../_shared/ai/split-lists.ts";
import { knownTimeZone, todayInZone } from "../_shared/ai/split-date.ts";
import {
  SPLIT_MODEL,
  SPLIT_RESPONSES_URL,
  SPLIT_TIMEOUT_MS,
  splitRequestBody,
  type SplitPromptContext,
} from "../_shared/ai/split-prompt.ts";
import { readContextField } from "../_shared/ai/conversation-context.ts";
import { isSupportedCurrencyCode } from "../_shared/transaction-domain/normalize-core.ts";

/** Real messages are a few hundred characters. A longer one is cut, not sent whole. */
const MAX_TEXT_CHARS = 8000;

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (userError || !userData.user) return json(origin, { error: "Invalid token" }, 401);
  if (!isTrialUser(userData.user.id)) return json(origin, { reason: "unavailable" }, 200);

  const body = await req.json().catch(() => null) as {
    text?: unknown;
    today?: unknown;
    timeZone?: unknown;
    receivedAt?: unknown;
    defaultCurrency?: unknown;
    calendar?: unknown;
    context?: unknown;
    /** The open card's words and amounts. A continuing message may keep an amount only from them, not from the whole chat. */
    cardEvidence?: unknown;
    /** Shared with the classify call of the same message, so the message is charged once. */
    turn?: unknown;
  } | null;

  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const admin = serviceKey ? createClient(supabaseUrl, serviceKey) : null;
  const usage = serviceUsageGate();

  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MAX_TEXT_CHARS) : "";
  const zone = knownTimeZone(body?.timeZone);
  const received = typeof body?.receivedAt === "string" ? new Date(body.receivedAt) : new Date();
  const fallbackToday = typeof body?.today === "string" ? body.today : "";
  const today = (Number.isNaN(received.getTime()) ? null : todayInZone(received, zone)) ?? fallbackToday;
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return json(origin, { route: "unreadable" }, 200);

  const apiKey = (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim();
  if (!apiKey) return json(origin, { reason: "unavailable" }, 200);

  const currency = isSupportedCurrencyCode(body?.defaultCurrency) ? body.defaultCurrency : "ILS";
  const prepStarted = Date.now();
  const [lists, firstGate] = await Promise.all([
    admin
      ? loadSplitLists(userClient, admin, userData.user.id).catch((error) => {
        logger.error(`split lists failed: ${error instanceof Error ? error.name : "unknown"}`);
        return { context: {}, rules: [] as SplitRuleRef[] };
      })
      : Promise.resolve({ context: {}, rules: [] as SplitRuleRef[] }),
    // The split is a paid model call, so it is charged as the text message itself, not as a free follow-up.
    usage.consume(userData.user.id, "text", { id: readTurnId(body?.turn), op: "split" }),
  ]);
  const prepMs = Date.now() - prepStarted;
  if (!firstGate.allowed) return json(origin, { reason: "unavailable", prep_ms: prepMs }, 200);
  const calendar = body?.calendar === "hebrew" ? "hebrew" : "gregorian";
  const conversation = readContextField(body?.context);
  const promptContext: SplitPromptContext = { ...lists.context, timeZone: zone, calendar, ...(conversation ? { conversation } : {}) };
  let modelMs = 0;

  async function ask(usageId: string | null): Promise<{ payload: unknown; usageId: string | null } | null> {
    const started = Date.now();
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
        body: JSON.stringify(splitRequestBody(text, today, promptContext, "app")),
      },
      timeoutMs: SPLIT_TIMEOUT_MS,
      record: serviceModelCallRecorder(),
    });
    modelMs += Date.now() - started;
    if (!result.ok) {
      logger.error(`split failed: ${result.status ?? result.errorCode}`);
      await usage.release(usageId);
      return null;
    }
    return { payload: result.payload, usageId };
  }

  try {
    const first = await ask(firstGate.usageId);
    if (!first) return json(origin, { reason: "unavailable", prep_ms: prepMs, model_ms: modelMs }, 200);
    let payload = first.payload;
    let usageId = first.usageId;
    let retried = false;
    if (!parseSplitPayload(readModelText(payload))) {
      const secondGate = await usage.consumeCall(userData.user.id);
      if (secondGate.allowed) {
        retried = true;
        const second = await ask(secondGate.usageId);
        if (second) {
          payload = second.payload;
          usageId = second.usageId;
        }
      }
    }
    const split = readSplitResponse(
      text,
      readModelText(payload),
      splitReadContext(today, {
        defaultCurrency: currency,
        categories: lists.context.categories ?? [],
        rules: lists.rules,
        recipients: lists.context.recipients ?? [],
      }),
      readContextField(body?.cardEvidence),
    );
    return json(origin, { ...split, usage_id: usageId, retried, prep_ms: prepMs, model_ms: modelMs }, 200);
  } catch (error) {
    logger.error(`split error: ${error instanceof Error ? error.name : "unknown"}`);
    return json(origin, { reason: "unavailable" }, 200);
  }
});
