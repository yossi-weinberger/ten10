export type IntakeDraftCounts = {
  ready: number;
  needs_review: number;
  approved: number;
  rejected: number;
  committed: number;
  reverted: number;
};

export type IntakeFunnel = {
  created: number;
  open: number;
  rejected: number;
  saved: number;
  undone: number;
  kept: number;
  existing: number;
  auto: number;
};

/** Each step is a subset of the previous one, except existing transactions, which can be deleted later. */
export function intakeFunnel(
  drafts: IntakeDraftCounts,
  origins: { ai: number; ai_auto: number },
): IntakeFunnel {
  const open = drafts.ready + drafts.needs_review + drafts.approved;
  const saved = drafts.committed + drafts.reverted;
  return {
    created: open + drafts.rejected + saved,
    open,
    rejected: drafts.rejected,
    saved,
    undone: drafts.reverted,
    kept: drafts.committed,
    existing: origins.ai + origins.ai_auto,
    auto: origins.ai_auto,
  };
}

export function shareOfCreated(part: number, created: number): number {
  if (created <= 0) return 0;
  return Math.round((part / created) * 100);
}

export type FunnelStepPercents = {
  ofPrevious: number;
  ofTotal: number;
  /** Bar width, 0–100. Non-zero values keep a visible sliver. */
  bar: number;
};

const MIN_VISIBLE_BAR = 2;

function percentOf(part: number, whole: number): number {
  if (!Number.isFinite(part) || !Number.isFinite(whole) || whole <= 0) return 0;
  return Math.round((part / whole) * 100);
}

/** Percents for one funnel row. Zero denominators stay 0, never NaN. */
export function funnelStepPercents(value: number, previous: number, total: number): FunnelStepPercents {
  const ofTotal = percentOf(value, total);
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0 || value <= 0) {
    return { ofPrevious: percentOf(value, previous), ofTotal, bar: 0 };
  }
  const raw = Math.min(100, (value / total) * 100);
  return {
    ofPrevious: percentOf(value, previous),
    ofTotal,
    bar: Math.min(100, Math.max(raw, MIN_VISIBLE_BAR)),
  };
}
