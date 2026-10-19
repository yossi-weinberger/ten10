import { supabase } from "@/lib/supabaseClient";
import { readTranscript } from "../../../supabase/functions/_shared/ai/speech-transcript.ts";

const MAX_BYTES = 2 * 1024 * 1024;

export type TranscribeSpeechResult =
  | { ok: true; text: string }
  | { ok: false; reason: "TOO_LONG" | "UNHEARD" | "UNAVAILABLE" };

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      const comma = value.indexOf(",");
      resolve(comma >= 0 ? value.slice(comma + 1) : "");
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

export async function transcribeSpeech(blob: Blob): Promise<TranscribeSpeechResult> {
  if (blob.size > MAX_BYTES) return { ok: false, reason: "TOO_LONG" };
  const data = await blobToBase64(blob);
  if (!data) return { ok: false, reason: "UNHEARD" };
  const mediaType = (blob.type || "audio/webm").split(";")[0];

  const { data: payload, error } = await supabase.functions.invoke("ai-transcribe-speech", {
    body: { media_type: mediaType, data },
  });
  if (error || !payload || typeof payload !== "object") return { ok: false, reason: "UNAVAILABLE" };
  if ((payload as { reason?: unknown }).reason === "unavailable") return { ok: false, reason: "UNAVAILABLE" };
  const text = readTranscript(payload);
  if (!text) return { ok: false, reason: "UNHEARD" };
  return { ok: true, text };
}
