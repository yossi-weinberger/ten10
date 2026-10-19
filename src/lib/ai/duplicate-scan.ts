export type SavedTransactionRow = {
  id: string;
  date: string;
  amount: number;
  currency: string;
  type: string;
  description: string;
};

export type DuplicatePair = {
  left: SavedTransactionRow;
  right: SavedTransactionRow;
};

function dayGap(left: string, right: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(left) || !/^\d{4}-\d{2}-\d{2}$/.test(right)) return null;
  const [ly, lm, ld] = left.split("-").map(Number);
  const [ry, rm, rd] = right.split("-").map(Number);
  const leftUtc = Date.UTC(ly, lm - 1, ld);
  const rightUtc = Date.UTC(ry, rm - 1, rd);
  return Math.abs(Math.round((leftUtc - rightUtc) / 86_400_000));
}

/** Same type, same currency, within 3 days, amount within 2%. Saved rows only. */
export function findDuplicatePairs(rows: readonly SavedTransactionRow[]): DuplicatePair[] {
  const pairs: DuplicatePair[] = [];
  for (let i = 0; i < rows.length; i++) {
    const left = rows[i];
    if (!Number.isFinite(left.amount) || left.amount === 0) continue;
    for (let j = i + 1; j < rows.length; j++) {
      const right = rows[j];
      if (left.type !== right.type) continue;
      if (left.currency.toUpperCase() !== right.currency.toUpperCase()) continue;
      const gap = dayGap(left.date, right.date);
      if (gap === null || gap > 3) continue;
      const low = left.amount * 0.98;
      const high = left.amount * 1.02;
      if (right.amount < low || right.amount > high) continue;
      pairs.push({ left, right });
    }
  }
  pairs.sort((a, b) => {
    const byDate = laterDate(b).localeCompare(laterDate(a));
    if (byDate !== 0) return byDate;
    return `${a.left.id}:${a.right.id}`.localeCompare(`${b.left.id}:${b.right.id}`);
  });
  return pairs;
}

function laterDate(pair: DuplicatePair): string {
  return pair.left.date > pair.right.date ? pair.left.date : pair.right.date;
}
