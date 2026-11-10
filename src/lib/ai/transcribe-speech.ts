import { supabase } from "@/lib/supabaseClient";
import { blobToBase64 } from "@/lib/ai/blob-base64";
import { aiCallsAllowed } from "@/lib/ai/flags";
import { speechToWav } from "@/lib/ai/speech-wav";
import { readTranscript } from "../../../supabase/functions/_shared/ai/speech-transcript.ts";
import { readLimitInfo, type LimitInfo } from "@/lib/ai/limit-reason";

const MAX_BYTES = 2 * 1024 * 1024;

export type TranscribeSpeechResult =
  | { ok: true; text: string }
  | { ok: false; reason: "LIMIT"; limit: LimitInfo }
  | { ok: false; reason: "TOO_LONG" | "UNHEARD" | "UNAVAILABLE" };

export async function transcribeSpeech(recording: Blob): Promise<TranscribeSpeechResult> {
  if (!aiCallsAllowed()) return { ok: false, reason: "UNAVAILABLE" };
  const blob = (await speechToWav(recording)) ?? recording;
  if (blob.size > MAX_BYTES) return { ok: false, reason: "TOO_LONG" };
  const data = await blobToBase64(blob);
  if (!data) return { ok: false, reason: "UNHEARD" };
  const mediaType = (blob.type || "audio/webm").split(";")[0];

  const { data: payload, error } = await supabase.functions.invoke("ai-transcribe-speech", {
    body: { media_type: mediaType, data },
  });
  if (error || !payload || typeof payload !== "object") return { ok: false, reason: "UNAVAILABLE" };
  const limit = readLimitInfo(payload);
  if (limit) return { ok: false, reason: "LIMIT", limit };
  if ((payload as { reason?: unknown }).reason === "unavailable") return { ok: false, reason: "UNAVAILABLE" };
  const text = readTranscript(payload);
  if (!text) return { ok: false, reason: "UNHEARD" };
  return { ok: true, text };
}
