export const SPEECH_WAV_RATE = 16000;

/** 16-bit PCM mono WAV. */
export function encodeWav16(samples: Float32Array, sampleRate: number): Uint8Array {
  const view = new DataView(new ArrayBuffer(44 + samples.length * 2));
  const text = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) view.setUint8(offset + index, value.charCodeAt(index));
  };
  text(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  text(8, "WAVE");
  text(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  text(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let index = 0; index < samples.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(44 + index * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
  }
  return new Uint8Array(view.buffer);
}

function mono(buffer: AudioBuffer): Float32Array {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const mixed = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const data = buffer.getChannelData(channel);
    for (let index = 0; index < buffer.length; index += 1) mixed[index] += data[index] / buffer.numberOfChannels;
  }
  return mixed;
}

/**
 * The transcription model rejects the browser's webm/opus recording and accepts WAV.
 * Decoding through a 16 kHz offline context resamples with the browser's filter.
 * Null when the browser cannot decode the recording.
 */
export async function speechToWav(blob: Blob): Promise<Blob | null> {
  if (typeof OfflineAudioContext === "undefined") return null;
  try {
    const context = new OfflineAudioContext(1, SPEECH_WAV_RATE, SPEECH_WAV_RATE);
    const buffer = await context.decodeAudioData(await blob.arrayBuffer());
    const bytes = encodeWav16(mono(buffer), buffer.sampleRate);
    return new Blob([bytes.buffer as ArrayBuffer], { type: "audio/wav" });
  } catch {
    return null;
  }
}
