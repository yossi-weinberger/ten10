import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricWithTooltip } from "@/components/admin/monitoring/AdminMonitoringComponents";
import { funnelStepPercents, type IntakeFunnel } from "@/lib/admin/ai-intake-funnel";

type FunnelCopy = {
  created: string;
  open: string;
  rejected: string;
  saved: string;
  undone: string;
  kept: string;
  existing: string;
  existingTip: string;
  auto: string;
  ofPrevious: (percent: number) => string;
  ofTotal: (percent: number) => string;
};

function BarTrack({ percent, tone }: { percent: number; tone: "main" | "branch" | "muted" }) {
  const fill = tone === "branch" ? "bg-destructive/70" : tone === "muted" ? "bg-muted-foreground/50" : "bg-primary";
  return (
    <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={`h-full rounded-full ${fill}`} style={{ width: `${percent}%` }} />
    </div>
  );
}

function StepRow({
  label,
  value,
  previous,
  total,
  ofPrevious,
  ofTotal,
  tone = "main",
  tip,
  first = false,
}: {
  label: string;
  value: number;
  previous: number;
  total: number;
  ofPrevious: (percent: number) => string;
  ofTotal: (percent: number) => string;
  tone?: "main" | "branch" | "muted";
  tip?: string;
  first?: boolean;
}) {
  const percents = funnelStepPercents(value, previous, total);
  return (
    <div className={tone === "main" ? "space-y-1.5" : "space-y-1 ps-4 sm:ps-8"}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className={tone === "main" ? "text-sm font-medium" : "text-sm text-muted-foreground"}>
          {tip ? <MetricWithTooltip label={label} tooltip={tip} /> : label}
        </div>
        <div className="flex items-baseline gap-2">
          <span className={tone === "main" ? "text-lg font-semibold tabular-nums" : "font-medium tabular-nums"}>{value}</span>
          {first ? null : (
            <span className="text-xs text-muted-foreground tabular-nums">{ofPrevious(percents.ofPrevious)}</span>
          )}
          <span className="text-xs text-muted-foreground/80 tabular-nums">{ofTotal(percents.ofTotal)}</span>
        </div>
      </div>
      <BarTrack percent={percents.bar} tone={tone} />
    </div>
  );
}

export function AdminAiFunnel({
  title,
  hint,
  funnel,
  copy,
}: {
  title: string;
  hint: string;
  funnel: IntakeFunnel;
  copy: FunnelCopy;
}) {
  const total = funnel.created;
  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        <p className="text-sm font-normal text-muted-foreground">{hint}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <StepRow
          label={copy.created}
          value={funnel.created}
          previous={total}
          total={total}
          ofPrevious={copy.ofPrevious}
          ofTotal={copy.ofTotal}
          first
        />
        <StepRow
          label={copy.rejected}
          value={funnel.rejected}
          previous={total}
          total={total}
          ofPrevious={copy.ofPrevious}
          ofTotal={copy.ofTotal}
          tone="branch"
        />
        <StepRow
          label={copy.open}
          value={funnel.open}
          previous={total}
          total={total}
          ofPrevious={copy.ofPrevious}
          ofTotal={copy.ofTotal}
        />
        <StepRow
          label={copy.saved}
          value={funnel.saved}
          previous={funnel.open}
          total={total}
          ofPrevious={copy.ofPrevious}
          ofTotal={copy.ofTotal}
        />
        <StepRow
          label={copy.undone}
          value={funnel.undone}
          previous={funnel.saved}
          total={total}
          ofPrevious={copy.ofPrevious}
          ofTotal={copy.ofTotal}
          tone="branch"
        />
        <StepRow
          label={copy.kept}
          value={funnel.kept}
          previous={funnel.saved}
          total={total}
          ofPrevious={copy.ofPrevious}
          ofTotal={copy.ofTotal}
        />
        <div className="space-y-2">
          <StepRow
            label={copy.existing}
            value={funnel.existing}
            previous={funnel.kept}
            total={total}
            ofPrevious={copy.ofPrevious}
            ofTotal={copy.ofTotal}
            tip={copy.existingTip}
          />
          <div className="flex flex-wrap items-center gap-2 ps-4 sm:ps-8">
            <Badge variant="secondary">{copy.auto}</Badge>
            <span className="text-sm font-medium tabular-nums">{funnel.auto}</span>
            <span className="text-xs text-muted-foreground tabular-nums">
              {copy.ofPrevious(funnelStepPercents(funnel.auto, funnel.existing, total).ofPrevious)}
            </span>
            <span className="text-xs text-muted-foreground/80 tabular-nums">
              {copy.ofTotal(funnelStepPercents(funnel.auto, funnel.existing, total).ofTotal)}
            </span>
          </div>
          <div className="ps-4 sm:ps-8">
            <BarTrack percent={funnelStepPercents(funnel.auto, funnel.existing, total).bar} tone="muted" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
