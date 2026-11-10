import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { gatewayProviderOptions } from "../_shared/ai/gateway-tags.ts";
import { readSplitResponse } from "../_shared/ai/split-response.ts";
import { splitReadContext } from "../_shared/ai/split-anchor.ts";
import { loadSplitLists } from "../_shared/ai/split-lists.ts";
import { todayInZone } from "../_shared/ai/split-date.ts";
import { SPLIT_MODEL, SPLIT_RESPONSES_URL, SPLIT_TIMEOUT_MS, splitRequestBody } from "../_shared/ai/split-prompt.ts";
import { callModel, failedBeforeBilling } from "../_shared/ai/model-call.ts";
import { serviceModelCallRecorder } from "../_shared/ai/model-call-recorder.ts";
import { serviceUsageGate } from "../_shared/ai/usage-gate-client.ts";
import { isSupportedCurrencyCode } from "../_shared/transaction-domain/normalize-core.ts";
import {
  decodeReceiptBase64,
  readModelText,
  readReceiptArtifactId,
  readStoredReceiptPath,
  receiptDraftFromItems,
  RECEIPT_COPY_PROMPT,
  receiptFilePart,
  receiptMagicMatches,
  receiptSha256,
  receiptStoragePath,
  receiptCopyTimeoutMs,
  receiptTooLarge,
  RECEIPT_VISION_MODEL,
} from "../_shared/ai/receipt-draft.ts";
import { requireAiUser } from "../_shared/ai/require-ai-user.ts";

const RECEIPT_BUCKET = "intake-artifacts";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function storageNotReady(message: string): boolean {
  const text = message.toLowerCase();
  return text.includes("could not find the function")
    || text.includes("bucket not found")
    || text.includes("schema cache");
}

async function storeCheckedReceipt(
  userId: string,
  mediaType: string,
  bytes: Uint8Array,
): Promise<{ status: "stored" | "skipped" | "failed"; artifactId: string | null }> {
  const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  if (!serviceKey || !supabaseUrl) return { status: "skipped", artifactId: null };
  const path = receiptStoragePath(userId, crypto.randomUUID(), new Date());
  if (!path) return { status: "failed", artifactId: null };
  const admin = createClient(supabaseUrl, serviceKey);
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  const uploaded = await admin.storage.from(RECEIPT_BUCKET).upload(
    path,
    new Blob([body], { type: mediaType }),
    { contentType: mediaType, upsert: false },
  );
  if (uploaded.error) {
    if (storageNotReady(uploaded.error.message)) return { status: "skipped", artifactId: null };
    logger.error("receipt artifact upload failed");
    return { status: "failed", artifactId: null };
  }
  const hash = await receiptSha256(bytes);
  const { data, error } = await admin.rpc("record_ai_receipt_artifact", {
    p_user_id: userId,
    p_sha256: hash,
    p_mime: mediaType,
    p_size: bytes.length,
    p_storage_path: path,
  });
  const recorded = readStoredReceiptPath(data);
  if (error || !recorded) {
    const removed = await admin.storage.from(RECEIPT_BUCKET).remove([path]);
    if (removed.error) logger.error("receipt artifact cleanup failed");
    if (error && storageNotReady(error.message)) return { status: "skipped", artifactId: null };
    logger.error("receipt artifact record failed");
    return { status: "failed", artifactId: null };
  }
  if (recorded.storagePath !== path) {
    const removed = await admin.storage.from(RECEIPT_BUCKET).remove([path]);
    if (removed.error) logger.error("receipt artifact cleanup failed");
  }
  const found = await admin.rpc("receipt_artifact_id_for_path", {
    p_user_id: userId,
    p_storage_path: recorded.storagePath,
  });
  const artifactId = readReceiptArtifactId(found.data);
  return { status: "stored", artifactId };
}

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const setup = await requireAiUser(req, {
    methodNotAllowedBody: { draft: null },
    notAllowedBody: { draft: null },
  });
  if (!setup.ok) return setup.response;
  const { userId, origin, userClient } = setup;

  const body = await req.json().catch(() => null) as {
    media_type?: unknown;
    data?: unknown;
    time_zone?: unknown;
    default_currency?: unknown;
  } | null;
  const defaultCurrency = isSupportedCurrencyCode(body?.default_currency) ? body.default_currency : "ILS";
  const mediaType = typeof body?.media_type === "string" ? body.media_type : "";
  const data = typeof body?.data === "string" ? body.data : "";
  if (receiptTooLarge(mediaType, data.length)) return json(origin, { draft: null, reason: "too_large" }, 200);
  if (!ALLOWED_TYPES.has(mediaType) || data.length === 0) {
    return json(origin, { draft: null }, 400);
  }
  const bytes = decodeReceiptBase64(data);
  if (!bytes || !receiptMagicMatches(mediaType, bytes)) {
    return json(origin, { draft: null, reason: "unreadable" }, 200);
  }
  const filePart = receiptFilePart(mediaType, data);
  if (!filePart) return json(origin, { draft: null }, 400);

  const apiKey = (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim();
  if (!apiKey) return json(origin, { draft: null, reason: "unavailable" }, 200);

  const usage = serviceUsageGate();
  const allowed = await usage.consume(userId, "receipt");
  if (!allowed.allowed) {
    if (allowed.reason === "not_allowed") return json(origin, { draft: null }, 200);
    return json(origin, { draft: null, reason: allowed.reason }, 200);
  }

  let billed = false;
  try {
    const stored = await storeCheckedReceipt(userId, mediaType, bytes);
    if (stored.status === "failed") {
      await usage.release(allowed.usageId);
      return json(origin, { draft: null, reason: "unavailable" }, 200);
    }
    const copyStarted = Date.now();
    const result = await callModel({
      userId: userId,
      operation: "receipt",
      model: RECEIPT_VISION_MODEL,
      url: SPLIT_RESPONSES_URL,
      init: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: RECEIPT_VISION_MODEL,
          max_output_tokens: 2000,
          input: [{
            role: "user",
            content: [
              { type: "input_text", text: RECEIPT_COPY_PROMPT },
              filePart,
            ],
          }],
          providerOptions: {
            gateway: gatewayProviderOptions({
              source: "app",
              only: ["anthropic"],
            }),
            anthropic: { thinking: { type: "disabled" } },
          },
        }),
      },
      timeoutMs: receiptCopyTimeoutMs(mediaType),
      record: serviceModelCallRecorder(),
    });
    if (!result.ok) {
      logger.error(`receipt read failed: ${result.status ?? result.errorCode}`);
      if (failedBeforeBilling(result)) await usage.release(allowed.usageId);
      return json(origin, { draft: null, reason: "unavailable" }, 200);
    }
    billed = true;
    const copyMs = Date.now() - copyStarted;
    const text = readModelText(result.payload);
    if (!text || !/\d/.test(text)) {
      return json(origin, { draft: null, reason: "unreadable" }, 200);
    }
    const zone = typeof body?.time_zone === "string" ? body.time_zone : "";
    const today = (zone ? todayInZone(new Date(), zone) : null) ?? todayInZone(new Date(), "Asia/Jerusalem") ?? new Date().toISOString().slice(0, 10);
    const serviceKey = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").trim();
    const admin = serviceKey ? createClient(Deno.env.get("SUPABASE_URL") ?? "", serviceKey) : null;
    const listsStarted = Date.now();
    const lists = admin
      ? await loadSplitLists(userClient, admin, userId).catch((error) => {
        logger.error(`receipt lists failed: ${error instanceof Error ? error.name : "unknown"}`);
        return { context: {}, rules: [] };
      })
      : { context: {}, rules: [] };
    const listsMs = Date.now() - listsStarted;
    const splitStarted = Date.now();
    const read = await callModel({
      userId: userId,
      operation: "split",
      model: SPLIT_MODEL,
      url: SPLIT_RESPONSES_URL,
      init: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(splitRequestBody(text, today, { ...lists.context, receipt: true })),
      },
      timeoutMs: SPLIT_TIMEOUT_MS,
      record: serviceModelCallRecorder(),
    });
    const splitMs = Date.now() - splitStarted;
    if (!read.ok) return json(origin, { draft: null, reason: "unavailable" }, 200);
    const split = readSplitResponse(text, readModelText(read.payload), splitReadContext(today, {
      missingDate: "check",
      defaultCurrency,
      categories: lists.context.categories ?? [],
      rules: lists.rules,
      recipients: lists.context.recipients ?? [],
    }));
    const draft = receiptDraftFromItems(
      split.route,
      split.route === "several"
        ? split.items.map((item) => ({
          description: item.description,
          amount: item.amount,
          date: item.date,
          currency: item.currency,
          type: item.typeHint,
          ruleName: item.ruleName,
        }))
        : [],
      defaultCurrency,
    );
    if (!draft) return json(origin, { draft: null, reason: "unreadable" }, 200);
    const artifactId = readReceiptArtifactId(stored.artifactId);
    const timing = { copy_ms: copyMs, lists_ms: listsMs, split_ms: splitMs, retried: false };
    return json(origin, artifactId ? { draft, artifact_id: artifactId, ...timing } : { draft, ...timing }, 200);
  } catch {
    logger.error("receipt read failed");
    if (!billed) await usage.release(allowed.usageId).catch(() => logger.error("usage release failed"));
    return json(origin, { draft: null, reason: "unavailable" }, 200);
  }
});
