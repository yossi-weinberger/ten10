// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from "vitest";

const { invoke, speechToWav } = vi.hoisted(() => ({
  invoke: vi.fn(),
  speechToWav: vi.fn<(blob: Blob) => Promise<Blob | null>>(),
}));

vi.mock("@/lib/supabaseClient", () => ({ supabase: { functions: { invoke } } }));
vi.mock("@/lib/ai/flags", () => ({ aiCallsAllowed: () => true }));
vi.mock("@/lib/ai/speech-wav", () => ({ speechToWav }));

import { transcribeSpeech } from "./transcribe-speech";

const recording = new Blob([new Uint8Array([1, 2, 3, 4])], { type: "audio/webm;codecs=opus" });

describe("transcribeSpeech", () => {
  beforeEach(() => {
    invoke.mockReset();
    speechToWav.mockReset();
    invoke.mockResolvedValue({ data: { text: "תרמתי מאה שמונים שקל" }, error: null });
  });

  it("sends WAV when the recording converts", async () => {
    speechToWav.mockResolvedValue(new Blob([new Uint8Array([9, 9])], { type: "audio/wav" }));

    const result = await transcribeSpeech(recording);

    expect(result).toEqual({ ok: true, text: "תרמתי מאה שמונים שקל" });
    expect(invoke).toHaveBeenCalledWith("ai-transcribe-speech", {
      body: { media_type: "audio/wav", data: "CQk=" },
    });
  });

  it("sends the original recording when it cannot convert", async () => {
    speechToWav.mockResolvedValue(null);

    await transcribeSpeech(recording);

    expect(invoke.mock.calls[0][1].body.media_type).toBe("audio/webm");
  });

  it("checks the size of what is sent", async () => {
    speechToWav.mockResolvedValue(new Blob([new Uint8Array(2 * 1024 * 1024 + 1)], { type: "audio/wav" }));

    expect(await transcribeSpeech(recording)).toEqual({ ok: false, reason: "TOO_LONG" });
    expect(invoke).not.toHaveBeenCalled();
  });
});
