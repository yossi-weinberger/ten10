export function orderCandidatesByRank<T extends { id: string }>(
  rows: readonly T[],
  scores: readonly { id: string; probability: number }[],
): T[] {
  const probability = new Map(scores.map((score) => [score.id, score.probability]));
  return rows.map((row, index) => ({ row, index })).sort((left, right) => {
    const leftScore = probability.get(left.row.id);
    const rightScore = probability.get(right.row.id);
    if (leftScore === undefined && rightScore === undefined) return left.index - right.index;
    if (leftScore === undefined) return 1;
    if (rightScore === undefined) return -1;
    if (leftScore === rightScore) return left.index - right.index;
    return rightScore - leftScore;
  }).map((entry) => entry.row);
}
