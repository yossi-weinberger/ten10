import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricWithTooltip } from "@/components/admin/monitoring/AdminMonitoringComponents";

function money(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

function modelTitle(model: string): string {
  if (model.startsWith("anthropic/claude")) return "Claude";
  if (model.startsWith("typesafe-ai/jev")) return "Jev";
  if (model.startsWith("microsoft/")) return "Microsoft";
  const name = model.split("/")[1] ?? model;
  return name.replaceAll("-", " ");
}

function ModelMark({ model }: { model: string }) {
  if (model.startsWith("anthropic/")) {
    return (
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#d97757" />
        <path d="M16 7l2.2 6.2L24.5 16l-6.3 2.8L16 25l-2.2-6.2L7.5 16l6.3-2.8L16 7z" fill="#1c1917" />
      </svg>
    );
  }
  if (model.startsWith("microsoft/")) {
    return (
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#f5f5f4" />
        <rect x="7" y="7" width="8" height="8" fill="#f35325" />
        <rect x="17" y="7" width="8" height="8" fill="#81bc06" />
        <rect x="7" y="17" width="8" height="8" fill="#05a6f0" />
        <rect x="17" y="17" width="8" height="8" fill="#ffba08" />
      </svg>
    );
  }
  if (model.startsWith("typesafe-ai/")) {
    return (
      <svg viewBox="0 0 32 32" className="h-8 w-8" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#0f172a" />
        <path d="M16 6l8 10-8 10-8-10 8-10z" fill="#38bdf8" />
      </svg>
    );
  }
  const letter = (model.split("/")[1] ?? model).slice(0, 1).toUpperCase();
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-semibold">
      {letter}
    </span>
  );
}

export function AdminAiSpendCards({
  models,
  requestsLabel,
}: {
  models: Array<{ label: string; totalCost: number; requestCount: number }>;
  requestsLabel: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {models.map((row) => (
        <Card key={row.label} className="bg-card border-border">
          <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
            <ModelMark model={row.label} />
            <div className="min-w-0">
              <CardTitle className="text-base">{modelTitle(row.label)}</CardTitle>
              <p className="truncate text-xs text-muted-foreground">{row.label}</p>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold tabular-nums">{money(row.totalCost)}</p>
            <p className="mt-1 text-sm text-muted-foreground">
              {row.requestCount.toLocaleString()} {requestsLabel}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminAiSourceSplit({
  app,
  evalCost,
  appLabel,
  evalLabel,
  appTooltip,
  evalTooltip,
}: {
  app: number;
  evalCost: number;
  appLabel: string;
  evalLabel: string;
  appTooltip: string;
  evalTooltip: string;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            <MetricWithTooltip label={appLabel} tooltip={appTooltip} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">{money(app)}</p>
        </CardContent>
      </Card>
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            <MetricWithTooltip label={evalLabel} tooltip={evalTooltip} />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold tabular-nums">{money(evalCost)}</p>
        </CardContent>
      </Card>
    </div>
  );
}
