import { SYMBOL_RING_PATH, SYMBOL_SLICE_PATH } from "./logoPaths";

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

/**
 * The corners of a path made of one closed outline, drawn with `M`, `L`, `H`, `V`, `C`
 * (absolute or relative) and `Z`, each cubic curve split into `curveSteps` straight
 * pieces. That covers the symbol's paths in `logoPaths.ts`; any other command throws, so
 * a new path shape fails loudly. (The browser's `getPointAtLength` would do this from the
 * DOM, but it walks the whole path on every call: about 100 ms for the symbol.)
 */
export function flattenPath(d: string, curveSteps = 12): Point[] {
  const points: Point[] = [];
  let x = 0;
  let y = 0;
  let start: Point = [0, 0];
  for (const command of d.match(/[a-zA-Z][^a-zA-Z]*/g) ?? []) {
    const type = command[0];
    const values = (command.slice(1).match(/-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/gi) ?? []).map(Number);
    const relative = type !== type.toUpperCase();
    const at = (dx: number, dy: number): Point => (relative ? [x + dx, y + dy] : [dx, dy]);
    switch (type.toUpperCase()) {
      case "M":
      case "L":
        for (let i = 0; i < values.length; i += 2) {
          [x, y] = at(values[i], values[i + 1]);
          if (type.toUpperCase() === "M" && i === 0) start = [x, y];
          points.push([x, y]);
        }
        break;
      case "H":
        for (const value of values) {
          x = relative ? x + value : value;
          points.push([x, y]);
        }
        break;
      case "V":
        for (const value of values) {
          y = relative ? y + value : value;
          points.push([x, y]);
        }
        break;
      case "C":
        for (let i = 0; i < values.length; i += 6) {
          const from: Point = [x, y];
          const c1 = at(values[i], values[i + 1]);
          const c2 = at(values[i + 2], values[i + 3]);
          const end = at(values[i + 4], values[i + 5]);
          for (let step = 1; step <= curveSteps; step++) {
            const t = step / curveSteps;
            const u = 1 - t;
            const a = u * u * u;
            const b = 3 * u * u * t;
            const c = 3 * u * t * t;
            const e = t * t * t;
            points.push([
              a * from[0] + b * c1[0] + c * c2[0] + e * end[0],
              a * from[1] + b * c1[1] + c * c2[1] + e * end[1],
            ]);
          }
          [x, y] = end;
        }
        break;
      case "Z":
        [x, y] = start;
        break;
      default:
        throw new Error(`flattenPath: unsupported path command "${type}"`);
    }
  }
  // A closed outline usually ends where it started; drop the repeated corner.
  const first = points[0];
  const last = points[points.length - 1];
  if (points.length > 1 && Math.hypot(last[0] - first[0], last[1] - first[1]) < 1e-6) points.pop();
  return points;
}

export type CheckPart = "ring" | "slice";

/** Points per outline in the check morph. */
const MORPH_POINTS = 72;

const SYMBOL_PATHS: Record<CheckPart, string> = { ring: SYMBOL_RING_PATH, slice: SYMBOL_SLICE_PATH };
const ARM_OUTLINES: Record<CheckPart, Point[]> = { ring: CHECK_LONG_ARM, slice: CHECK_SHORT_ARM };
const ARM_PATHS: Record<CheckPart, string> = {
  ring: outlinePath(CHECK_LONG_ARM),
  slice: outlinePath(CHECK_SHORT_ARM),
};

let checkMorph: Record<CheckPart, [from: Point[], to: Point[]]> | undefined;

/** The ring and slice outlines, each paired with the arm it becomes. Built on first use. */
function getCheckMorph() {
  if (!checkMorph) {
    const pair = (part: CheckPart): [Point[], Point[]] => {
      const outline = resamplePolygon(flattenPath(SYMBOL_PATHS[part]), MORPH_POINTS);
      return [outline, alignOutline(outline, resamplePolygon(ARM_OUTLINES[part], MORPH_POINTS))];
    };
    checkMorph = { ring: pair("ring"), slice: pair("slice") };
  }
  return checkMorph;
}

/**
 * The path of the ring or the slice `t` of the way (0 to 1) into its arm of the check:
 * the symbol's own path at 0, the arm at 1.
 */
export function checkShapeAt(part: CheckPart, t: number): string {
  if (t <= 0) return SYMBOL_PATHS[part];
  if (t >= 1) return ARM_PATHS[part];
  const [from, to] = getCheckMorph()[part];
  return mixOutlines(from, to, t);
}

/**
 * How the turning symbol settles upright when the save succeeds, from the angle (0 to
 * 360) where its spin stopped: it finishes the turn it is on, plus one more if less than
 * 60° are left, so it never stops abruptly. The time grows with the distance, about
 * 1.6 ms per degree, within 250 to 450 ms.
 */
export function getSettle(angle: number): { turn: number; ms: number } {
  const turn = (angle > 300 ? 720 : 360) - angle;
  return { turn, ms: Math.min(450, Math.max(250, turn * 1.6)) };
}

/**
 * When the click, the morph and the pop happen, in ms from the end of the settle (the
 * click starts just before it ends), and how long each lasts.
 */
export const CHECK_TIMING = {
  clickAt: -60,
  clickMs: 240,
  morphMs: 300,
  popAt: 280,
  popMs: 240,
} as const;

/** Ease-in-out for the morph (cubic). */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
}
