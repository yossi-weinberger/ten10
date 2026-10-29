import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { gatewayProviderOptions } from "../_shared/ai/gateway-tags.ts";
import { isAiIntakeEnabled } from "../_shared/ai/enabled.ts";
import { isTrialUser } from "../_shared/ai/trial-users.ts";
import { callModel } from "../_shared/ai/model-call.ts";
import { serviceModelCallRecorder } from "../_shared/ai/model-call-recorder.ts";
import { serviceUsageGate } from "../_shared/ai/usage-gate-client.ts";
import {
  decodeReceiptBase64,
  readModelText,
  readReceiptDraft,
  readReceiptArtifactId,
  readStoredReceiptPath,
  receiptFilePart,
  receiptMagicMatches,
  receiptSha256,
  receiptStoragePath,
  RECEIPT_MAX_BASE64_CHARS,
  RECEIPT_VISION_MODEL,
} from "../_shared/ai/receipt-draft.ts";

const RESPONSES_URL = "https://ai-gateway.vercel.sh/v1/responses";
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

const PROMPT = [
  "Read this receipt. It may be written in Hebrew, English, or both.",
  "Reply with JSON only, no markdown.",
  '{"description":"merchant name","date":"YYYY-MM-DD","amount":12.34,"currency":"ILS"}',
  "currency is ILS, USD, or EUR.",
  "amount is the total paid, as a positive number.",
  "description is the merchant name exactly as printed. Keep Hebrew in Hebrew and English in English. Do not translate.",
  "Israeli dates are day/month/year. Return the date as YYYY-MM-DD.",
  "If you cannot read a total, reply {\"description\":null}.",
].join(" ");

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return json(origin, { draft: null }, 405);
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
  if (!isTrialUser(userData.user.id)) return json(origin, { draft: null }, 200);

  const body = await req.json().catch(() => null) as { media_type?: unknown; data?: unknown } | null;
  const mediaType = typeof body?.media_type === "string" ? body.media_type : "";
  const data = typeof body?.data === "string" ? body.data : "";
  if (data.length > RECEIPT_MAX_BASE64_CHARS) return json(origin, { draft: null, reason: "too_large" }, 200);
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
  const allowed = await usage.consume(userData.user.id, "receipt");
  if (!allowed.allowed) return json(origin, { draft: null, reason: allowed.reason }, 200);

  const stored = await storeCheckedReceipt(userData.user.id, mediaType, bytes);
  if (stored.status === "failed") {
    await usage.release(allowed.usageId);
    return json(origin, { draft: null, reason: "unavailable" }, 200);
  }

  try {
    const result = await callModel({
      userId: userData.user.id,
      operation: "receipt",
      model: RECEIPT_VISION_MODEL,
      url: RESPONSES_URL,
      init: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: RECEIPT_VISION_MODEL,
          max_output_tokens: 300,
          input: [{
            role: "user",
            content: [
              { type: "input_text", text: PROMPT },
              filePart,
            ],
          }],
          providerOptions: {
            gateway: gatewayProviderOptions({
              source: "app",
              only: ["anthropic"],
            }),
          },
        }),
      },
      timeoutMs: 20000,
      record: serviceModelCallRecorder(),
    });
    if (!result.ok) {
      logger.error(`receipt read failed: ${result.status ?? result.errorCode}`);
      await usage.release(allowed.usageId);
      return json(origin, { draft: null, reason: "unavailable" }, 200);
    }
    const draft = readReceiptDraft(readModelText(result.payload));
    const artifactId = readReceiptArtifactId(stored.artifactId);
    return json(origin, artifactId ? { draft, artifact_id: artifactId } : { draft }, 200);
  } catch {
    logger.error("receipt read failed");
    return json(origin, { draft: null, reason: "unavailable" }, 200);
  }
});
