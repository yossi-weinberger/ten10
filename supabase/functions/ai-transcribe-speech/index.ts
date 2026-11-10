import { getCorsHeaders } from "../_shared/cors.ts";
import { logger } from "../_shared/logger.ts";
import { gatewayProviderOptions } from "../_shared/ai/gateway-tags.ts";
import { readTranscript, SPEECH_MODEL } from "../_shared/ai/speech-transcript.ts";
import { callModel } from "../_shared/ai/model-call.ts";
import { serviceModelCallRecorder } from "../_shared/ai/model-call-recorder.ts";
import { serviceUsageGate } from "../_shared/ai/usage-gate-client.ts";
import { requireAiUser } from "../_shared/ai/require-ai-user.ts";

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
  const setup = await requireAiUser(req, {
    methodNotAllowedBody: { text: null },
    notAllowedBody: { text: null },
  });
  if (!setup.ok) return setup.response;
  const { userId, origin } = setup;

  const body = await req.json().catch(() => null) as { media_type?: unknown; data?: unknown } | null;
  const mediaType = typeof body?.media_type === "string" ? body.media_type.split(";")[0] : "";
  const data = typeof body?.data === "string" ? body.data : "";
  if (!ALLOWED_TYPES.has(mediaType) || data.length === 0 || data.length > MAX_BASE64_CHARS) {
    return json(origin, { text: null }, 400);
  }

  const apiKey = (Deno.env.get("VERCEL_AI_GATEWAY_API_KEY") ?? "").trim();
  if (!apiKey) return json(origin, { text: null, reason: "unavailable" }, 200);

  const usage = serviceUsageGate();
  const allowed = await usage.consume(userId, "speech");
  if (!allowed.allowed) {
    if (allowed.reason === "not_allowed") return json(origin, { text: null }, 200);
    return json(origin, { text: null, reason: allowed.reason }, 200);
  }

  try {
    const result = await callModel({
      userId,
      operation: "speech",
      model: SPEECH_MODEL,
      url: TRANSCRIBE_URL,
      init: {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "ai-gateway-protocol-version": "0.0.1",
          "ai-transcription-model-specification-version": "4",
          "ai-model-id": SPEECH_MODEL,
        },
        body: JSON.stringify({
          audio: data,
          mediaType,
          providerOptions: {
            gateway: gatewayProviderOptions({
              source: "app",
            }),
          },
        }),
      },
      timeoutMs: 20000,
      record: serviceModelCallRecorder(),
    });
    if (!result.ok) {
      logger.error(`speech transcribe failed: ${result.status ?? result.errorCode}`);
      await usage.release(allowed.usageId);
      return json(origin, { text: null, reason: "unavailable" }, 200);
    }
    const text = readTranscript(result.payload);
    return json(origin, { text }, 200);
  } catch {
    logger.error("speech transcribe failed");
    await usage.release(allowed.usageId);
    return json(origin, { text: null, reason: "unavailable" }, 200);
  }
});
