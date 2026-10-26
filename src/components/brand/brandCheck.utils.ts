/** A point in symbol units (the viewBox is centred on the ring, see `logoPaths.ts`). */
export type Point = readonly [number, number];

/**
 * The check mark the symbol turns into when a save succeeds (#40). The ring becomes the
 * long arm and the slice the short one, so the mark spans the ring's width.
 */
export const CHECK_ARMS = {
  short: { from: [-32, 0], to: [-9, 23] },
  long: { from: [-9, 23], to: [33, -24] },
  halfWidth: 7,
} as const;

/**
 * The outline of a straight bar from `from` to `to`, `halfWidth` either side of the line.
 * `extendStart` / `extendEnd` lengthen it past its ends.
 */
export function barOutline(
  from: Point,
  to: Point,
  halfWidth: number,
  extendStart = 0,
  extendEnd = 0
): Point[] {
  const length = Math.hypot(to[0] - from[0], to[1] - from[1]);
  const ux = (to[0] - from[0]) / length;
  const uy = (to[1] - from[1]) / length;
  const nx = -uy * halfWidth;
  const ny = ux * halfWidth;
  const start: Point = [from[0] - ux * extendStart, from[1] - uy * extendStart];
  const end: Point = [to[0] + ux * extendEnd, to[1] + uy * extendEnd];
  return [
    [start[0] + nx, start[1] + ny],
    [end[0] + nx, end[1] + ny],
    [end[0] - nx, end[1] - ny],
    [start[0] - nx, start[1] - ny],
  ];
}

const { short, long, halfWidth } = CHECK_ARMS;

/** The slice's arm. It runs on past the corner, so the two arms join without a notch. */
export const CHECK_SHORT_ARM = barOutline(short.from, short.to, halfWidth, 0, halfWidth);

/** The ring's arm. */
export const CHECK_LONG_ARM = barOutline(long.from, long.to, halfWidth, halfWidth, 0);

/** Twice the signed area of a closed polygon; the sign tells which way round it runs. */
export function signedArea(points: readonly Point[]): number {
  let area = 0;
  points.forEach(([x1, y1], i) => {
    const [x2, y2] = points[(i + 1) % points.length];
    area += x1 * y2 - x2 * y1;
  });
  return area;
}

/** `count` points evenly spaced along a closed polygon, starting at its first corner. */
export function resamplePolygon(points: readonly Point[], count: number): Point[] {
  const edges = points.map((p, i) => {
    const q = points[(i + 1) % points.length];
    return { p, q, length: Math.hypot(q[0] - p[0], q[1] - p[1]) };
  });
  const perimeter = edges.reduce((sum, edge) => sum + edge.length, 0);
  const result: Point[] = [];
  let edge = 0;
  let edgeStart = 0;
  for (let i = 0; i < count; i++) {
    const at = (perimeter * i) / count;
    while (at > edgeStart + edges[edge].length && edge < edges.length - 1) {
      edgeStart += edges[edge].length;
      edge++;
    }
    const { p, q, length } = edges[edge];
    const t = length === 0 ? 0 : (at - edgeStart) / length;
    result.push([p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t]);
  }
  return result;
}

/**
 * Reorders `target` so it runs the same way round as `source` and starts at the point that
 * keeps each pair of points closest, so mixing the two shapes doesn't twist or cross.
 * Both outlines must have the same number of points.
 */
export function alignOutline(source: readonly Point[], target: readonly Point[]): Point[] {
  const turned =
    signedArea(source) * signedArea(target) < 0 ? [...target].reverse() : [...target];
  const n = turned.length;
  let bestShift = 0;
  let bestDistance = Infinity;
  for (let shift = 0; shift < n; shift++) {
    let distance = 0;
    for (let i = 0; i < n; i++) {
      const a = source[i];
      const b = turned[(i + shift) % n];
      distance += (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;
    }
    if (distance < bestDistance) {
      bestDistance = distance;
      bestShift = shift;
    }
  }
  return turned.map((_, i) => turned[(i + bestShift) % n]);
}

/** A closed path through the points. */
export function outlinePath(points: readonly Point[]): string {
  return `M${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join("L")}Z`;
}

/** The outline `t` of the way from `from` to `to` (aligned, same length), as a path. */
export function mixOutlines(from: readonly Point[], to: readonly Point[], t: number): string {
  return outlinePath(
    from.map(([x, y], i) => [x + (to[i][0] - x) * t, y + (to[i][1] - y) * t] as const)
  );
}
