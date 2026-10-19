import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { isTrialUser } from "../_shared/ai/trial-users.ts";
import {
  readModelText,
  readReceiptDraft,
  receiptFilePart,
  RECEIPT_MAX_BASE64_CHARS,
  RECEIPT_VISION_MODEL,
} from "../_shared/ai/receipt-draft.ts";

const RESPONSES_URL = "https://ai-gateway.vercel.sh/v1/responses";
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

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
  const filePart = receiptFilePart(mediaType, data);
  if (data.length > RECEIPT_MAX_BASE64_CHARS) return json(origin, { draft: null, reason: "too_large" }, 200);
  if (!ALLOWED_TYPES.has(mediaType) || !filePart || data.length === 0) {
    return json(origin, { draft: null }, 400);
  }

  const apiKey = (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim();
  if (!apiKey) return json(origin, { draft: null, reason: "unavailable" }, 200);

  try {
    const response = await fetch(RESPONSES_URL, {
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
          gateway: {
            zeroDataRetention: true,
            only: ["anthropic"],
          },
        },
      }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      logger.error(`receipt read failed: ${response.status}`);
      return json(origin, { draft: null, reason: "unavailable" }, 200);
    }
    const draft = readReceiptDraft(readModelText(await response.json()));
    return json(origin, { draft }, 200);
  } catch {
    logger.error("receipt read failed");
    return json(origin, { draft: null, reason: "unavailable" }, 200);
  }
});
