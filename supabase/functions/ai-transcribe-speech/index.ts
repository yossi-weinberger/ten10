import { createClient } from "npm:@supabase/supabase-js@2.116.0";
import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { isAiIntakeEnabled } from "../_shared/ai/enabled.ts";
import { isTrialUser } from "../_shared/ai/trial-users.ts";
import { readTranscript, SPEECH_MODEL } from "../_shared/ai/speech-transcript.ts";

const TRANSCRIBE_URL = "https://ai-gateway.vercel.sh/v4/ai/transcription-model";
const ALLOWED_TYPES = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/wav", "audio/ogg"]);
const MAX_BASE64_CHARS = 3_000_000;

function json(origin: string | null, body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...getCorsHeaders(origin), "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response("ok", { headers: getCorsHeaders(origin) });
  if (req.method !== "POST") return json(origin, { text: null }, 405);
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
  if (!isTrialUser(userData.user.id)) return json(origin, { text: null }, 200);

  const body = await req.json().catch(() => null) as { media_type?: unknown; data?: unknown } | null;
  const mediaType = typeof body?.media_type === "string" ? body.media_type.split(";")[0] : "";
  const data = typeof body?.data === "string" ? body.data : "";
  if (!ALLOWED_TYPES.has(mediaType) || data.length === 0 || data.length > MAX_BASE64_CHARS) {
    return json(origin, { text: null }, 400);
  }

  const apiKey = (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim();
  if (!apiKey) return json(origin, { text: null, reason: "unavailable" }, 200);

  try {
    const response = await fetch(TRANSCRIBE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "ai-gateway-protocol-version": "0.0.1",
        "ai-transcription-model-specification-version": "4",
        "ai-model-id": SPEECH_MODEL,
      },
      body: JSON.stringify({ audio: data, mediaType }),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok) {
      logger.error(`speech transcribe failed: ${response.status}`);
      return json(origin, { text: null, reason: "unavailable" }, 200);
    }
    const text = readTranscript(await response.json());
    return json(origin, { text }, 200);
  } catch {
    logger.error("speech transcribe failed");
    return json(origin, { text: null, reason: "unavailable" }, 200);
  }
});
