import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton for horizontal bar chart loading state.
 * Simulates the shape of a BreakdownBarPieChart in bar mode.
 */
export function BreakdownBarSkeleton({ height = 280 }: { height?: number }) {
  const widths = [88, 72, 60, 48, 36, 24, 14];
  return (
    <div className="flex flex-col justify-center gap-2 py-2" style={{ height }}>
      {widths.map((w, i) => (
        <div key={i} className="flex items-center gap-2">
          <Skeleton className="h-7 rounded-sm" style={{ width: `${w}%` }} />
          <Skeleton className="h-4 w-14 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for list-style loading (RecurringForecastInsight).
 */
export function ListRowsSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center justify-between gap-2 rounded-md border border-border/50 px-2.5 py-1.5"
        >
          <div className="space-y-1 flex-1">
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-2.5 w-1/2" />
          </div>
          <Skeleton className="h-4 w-12 shrink-0" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for KPI card grid loading state.
 */
export function KpiGridSkeleton({
  count = 3,
  className = "grid-cols-3",
}: {
  count?: number;
  className?: string;
}) {
  return (
    <div className={`grid ${className} gap-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border border-border bg-card p-3">
          <Skeleton className="h-3 w-16 mb-2" />
          <Skeleton className="h-7 w-20" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for ring chart row (RecurringRatioInsight).
 */
export function RingsRowSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex justify-around items-center pt-2 pb-1">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex flex-col items-center gap-1.5">
          <Skeleton className="w-[96px] h-[96px] rounded-full" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-3 w-12" />
        </div>
      ))}
    </div>
  );
}

/**
 * Skeleton for a simple area/bar chart area.
 */
export function ChartAreaSkeleton({ height = 192 }: { height?: number }) {
  return (
    <div className="flex items-end gap-1 px-2" style={{ height }}>
      {[0.4, 0.65, 0.5, 0.85, 0.7, 0.9, 0.6, 0.75, 0.55, 0.8, 0.45, 0.7].map(
        (h, i) => (
          <Skeleton
            key={i}
            className="flex-1 rounded-t-sm"
            style={{ height: `${h * 100}%` }}
          />
        )
      )}
    </div>
  );
}
