/** RMS of time-domain bytes (128 = silence), mapped to 0..1. */
export function levelFromSamples(samples: Uint8Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (const sample of samples) {
    const centered = (sample - 128) / 128;
    sum += centered * centered;
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 2.5);
}
