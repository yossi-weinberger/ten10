/** Share of the progress that fills the ring; the slice covers the rest. */
export const BRAND_PROGRESS_RING_SHARE = 0.9;

export interface BrandProgressParts {
  /** How much of the ring is revealed, 0–1. */
  ring: number;
  /** How far the slice has dropped into place, 0–1. */
  slice: number;
}

/**
 * Splits a 0–100 progress value between the ring and the slice of the Ten10 symbol:
 * the ring fills over the first 90%, and the slice completes the last 10%.
 */
export function getBrandProgressParts(value: number): BrandProgressParts {
  const fraction = Number.isFinite(value) ? Math.min(Math.max(value, 0), 100) / 100 : 0;
  return {
    ring: Math.min(fraction / BRAND_PROGRESS_RING_SHARE, 1),
    slice: Math.max(0, (fraction - BRAND_PROGRESS_RING_SHARE) / (1 - BRAND_PROGRESS_RING_SHARE)),
  };
}
