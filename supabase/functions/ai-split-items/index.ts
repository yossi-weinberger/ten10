import { createClient, type SupabaseClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { isAiIntakeEnabled } from "../_shared/ai/enabled.ts";
import { isTrialUser } from "../_shared/ai/trial-users.ts";
import { mayReleaseRecentTextUsage } from "../_shared/ai/usage-gate.ts";
import { callModel } from "../_shared/ai/model-call.ts";
import { serviceModelCallRecorder } from "../_shared/ai/model-call-recorder.ts";
import { serviceUsageGate } from "../_shared/ai/usage-gate-client.ts";
import { readModelText } from "../_shared/ai/receipt-draft.ts";
import { parseSplitPayload, readSplitResponse } from "../_shared/ai/split-response.ts";
import { splitReadContext, type SplitRuleRef } from "../_shared/ai/split-anchor.ts";
import { todayInZone } from "../_shared/ai/split-date.ts";
import {
  SPLIT_MODEL,
  SPLIT_MESSAGES_URL,
  SPLIT_TIMEOUT_MS,
  splitAnthropicBody,
  type SplitPromptContext,
} from "../_shared/ai/split-prompt.ts";

const USAGE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SPECIAL = new Set(["exempt-income", "recognized-expense", "non_tithe_donation"]);

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

function categoryNames(data: unknown): string[] {
  if (!Array.isArray(data)) return [];
  const names: string[] = [];
  for (const row of data) {
    if (typeof row === "string" && row.trim()) names.push(row.trim());
    else if (row && typeof row === "object" && typeof (row as { category?: unknown }).category === "string") {
      const name = (row as { category: string }).category.trim();
      if (name) names.push(name);
    }
  }
  return names;
}

function ruleRefs(data: unknown): SplitRuleRef[] {
  if (!Array.isArray(data)) return [];
  const rules: SplitRuleRef[] = [];
  for (const row of data) {
    if (!row || typeof row !== "object") continue;
    const id = (row as { id?: unknown }).id;
    const match = (row as { match?: unknown }).match;
    const action = (row as { action?: unknown }).action;
    const name = match && typeof match === "object" ? (match as { name?: unknown }).name : null;
    const type = action && typeof action === "object" ? (action as { type?: unknown }).type : null;
    if (typeof id !== "string" || typeof name !== "string" || typeof type !== "string") continue;
    if (!SPECIAL.has(type)) continue;
    rules.push({ id, name, type: type as SplitRuleRef["type"] });
  }
  return rules.slice(0, 40);
}

async function loadLists(
  userClient: SupabaseClient,
  admin: SupabaseClient,
  userId: string,
): Promise<{ context: SplitPromptContext; rules: SplitRuleRef[] }> {
  const [income, expense, recipients, rules] = await Promise.all([
    userClient.rpc("get_user_categories", { p_type: "income" }),
    userClient.rpc("get_user_categories", { p_type: "expense" }),
    userClient.rpc("list_ai_recipients"),
    admin.schema("ai").from("user_rules").select("id, match, action").eq("user_id", userId).eq("status", "active").limit(40),
  ]);
  const categories = [...new Set([...categoryNames(income.data), ...categoryNames(expense.data)])].slice(0, 80);
  const recipientNames = Array.isArray(recipients.data)
    ? recipients.data.filter((name): name is string => typeof name === "string" && name.trim().length > 0).slice(0, 40)
    : [];
  const saved = ruleRefs(rules.data);
  return {
    rules: saved,
    context: {
      categories,
      recipients: recipientNames,
      rules: saved.map((rule) => ({ id: rule.id, name: rule.name })),
    },
  };
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
    release?: unknown;
  } | null;

  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const admin = serviceKey ? createClient(supabaseUrl, serviceKey) : null;
  const usage = serviceUsageGate();

  if (typeof body?.release === "string") {
    if (!admin || !USAGE_ID.test(body.release)) return json(origin, { released: false }, 200);
    const { data } = await admin.schema("ai").from("usage_events")
      .select("user_id, kind, created_at, released_at")
      .eq("id", body.release)
      .maybeSingle();
    if (!mayReleaseRecentTextUsage(data, userData.user.id, Date.now())) {
      return json(origin, { released: false }, 200);
    }
    await usage.release(body.release);
    return json(origin, { released: true }, 200);
  }

  const text = typeof body?.text === "string" ? body.text.trim() : "";
  const zone = typeof body?.timeZone === "string" && body.timeZone.trim() ? body.timeZone.trim() : "UTC";
  const received = typeof body?.receivedAt === "string" ? new Date(body.receivedAt) : new Date();
  const fallbackToday = typeof body?.today === "string" ? body.today : "";
  const today = (Number.isNaN(received.getTime()) ? null : todayInZone(received, zone)) ?? fallbackToday;
  if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return json(origin, { route: "unreadable" }, 200);

  const apiKey = (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim();
  if (!apiKey) return json(origin, { reason: "unavailable" }, 200);

  const currency = body?.defaultCurrency === "USD" || body?.defaultCurrency === "EUR" ? body.defaultCurrency : "ILS";
  const lists = admin
    ? await loadLists(userClient, admin, userData.user.id).catch(() => ({ context: {}, rules: [] as SplitRuleRef[] }))
    : { context: {}, rules: [] as SplitRuleRef[] };
  const promptContext: SplitPromptContext = { ...lists.context, timeZone: zone };

  async function ask(): Promise<{ payload: unknown; usageId: string | null } | null> {
    const allowed = await usage.consumeCall(userData.user.id);
    if (!allowed.allowed) return null;
    const result = await callModel({
      userId: userData.user.id,
      operation: "split",
      model: SPLIT_MODEL,
      url: SPLIT_MESSAGES_URL,
      init: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(splitAnthropicBody(text, today, promptContext, "app")),
      },
      timeoutMs: SPLIT_TIMEOUT_MS,
      record: serviceModelCallRecorder(),
    });
    if (!result.ok) {
      logger.error(`split failed: ${result.status ?? result.errorCode}`);
      await usage.release(allowed.usageId);
      return null;
    }
    return { payload: result.payload, usageId: allowed.usageId };
  }

  try {
    const first = await ask();
    if (!first) return json(origin, { reason: "unavailable" }, 200);
    let payload = first.payload;
    let usageId = first.usageId;
    if (!parseSplitPayload(readModelText(payload))) {
      const second = await ask();
      if (second) {
        payload = second.payload;
        usageId = second.usageId;
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
    );
    return json(origin, { ...split, usage_id: usageId }, 200);
  } catch (error) {
    logger.error(`split error: ${error instanceof Error ? error.name : "unknown"}`);
    return json(origin, { reason: "unavailable" }, 200);
  }
});
