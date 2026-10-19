/** Locked transcription model. It detects the spoken language, including mixed speech. */
export const SPEECH_MODEL = "microsoft/mai-transcribe-2";

export function readTranscript(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const text = (payload as { text?: unknown }).text;
  if (typeof text !== "string") return null;
  const trimmed = text.trim().slice(0, 500);
  if (trimmed.length < 2) return null;
  return trimmed;
}
