interface PieCustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number }>;
  total: number;
  fmt: (v: number) => string;
}

export function PieCustomTooltip({ active, payload, total, fmt }: PieCustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const { name, value } = payload[0];
  const pct = total > 0 ? ((value / total) * 100).toFixed(1) : "0";
  return (
    <div className="rounded-md border border-border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium text-foreground">{name}</p>
      <p className="text-muted-foreground">{fmt(value)} ({pct}%)</p>
    </div>
  );
}
