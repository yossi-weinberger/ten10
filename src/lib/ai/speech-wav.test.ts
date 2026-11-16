import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeWav16, speechToWav } from "./speech-wav";

function fakeBuffer(channels: Float32Array[], sampleRate = 16000) {
  return {
    numberOfChannels: channels.length,
    length: channels[0].length,
    sampleRate,
    getChannelData: (index: number) => channels[index],
  };
}

function stubOfflineContext(decode: () => Promise<unknown>) {
  const created: number[][] = [];
  class FakeOfflineAudioContext {
    constructor(channels: number, length: number, sampleRate: number) {
      created.push([channels, length, sampleRate]);
    }
    decodeAudioData() {
      return decode();
    }
  }
  vi.stubGlobal("OfflineAudioContext", FakeOfflineAudioContext);
  return created;
}

describe("encodeWav16", () => {
  it("writes a 16-bit mono PCM header and clamps samples", () => {
    const bytes = encodeWav16(new Float32Array([0, 1, -1, 2]), 16000);
    const view = new DataView(bytes.buffer);
    expect(String.fromCharCode(...bytes.slice(0, 4))).toBe("RIFF");
    expect(String.fromCharCode(...bytes.slice(8, 12))).toBe("WAVE");
    expect(view.getUint16(20, true)).toBe(1);
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(16000);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getUint32(40, true)).toBe(8);
    expect(bytes.length).toBe(52);
    expect(view.getInt16(44, true)).toBe(0);
    expect(view.getInt16(46, true)).toBe(0x7fff);
    expect(view.getInt16(48, true)).toBe(-0x8000);
    expect(view.getInt16(50, true)).toBe(0x7fff);
  });
});

describe("speechToWav", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("decodes at 16 kHz and returns a WAV blob", async () => {
    const created = stubOfflineContext(() => Promise.resolve(fakeBuffer([new Float32Array([0.5, -0.5])])));
    const wav = await speechToWav(new Blob([new Uint8Array([1, 2, 3])], { type: "audio/webm;codecs=opus" }));
    expect(created).toEqual([[1, 16000, 16000]]);
    expect(wav?.type).toBe("audio/wav");
    expect(wav?.size).toBe(48);
  });

  it("mixes stereo down to mono", async () => {
    stubOfflineContext(() => Promise.resolve(fakeBuffer([new Float32Array([1, 0]), new Float32Array([0, 0])])));
    const wav = await speechToWav(new Blob([new Uint8Array([1])]));
    const view = new DataView(await wav!.arrayBuffer());
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getInt16(44, true)).toBe(16383);
    expect(view.getInt16(46, true)).toBe(0);
  });

  it("is null when the browser cannot decode the recording", async () => {
    stubOfflineContext(() => Promise.reject(new Error("EncodingError")));
    expect(await speechToWav(new Blob([new Uint8Array([1])]))).toBeNull();
  });

  it("is null without OfflineAudioContext", async () => {
    vi.stubGlobal("OfflineAudioContext", undefined);
    expect(await speechToWav(new Blob([new Uint8Array([1])]))).toBeNull();
  });
});
