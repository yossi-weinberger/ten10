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
