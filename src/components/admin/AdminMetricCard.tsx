import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MetricWithTooltip } from "@/components/admin/monitoring/AdminMonitoringComponents";
import { cn } from "@/lib/utils";

interface AdminMetricCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  subtitle?: React.ReactNode;
  tooltip?: string;
  className?: string;
  valueClassName?: string;
}

export function AdminMetricCard({
  title,
  value,
  icon: Icon,
  subtitle,
  tooltip,
  className,
  valueClassName,
}: AdminMetricCardProps) {
  const { i18n } = useTranslation();
  const display =
    typeof value === "number" ? value.toLocaleString(i18n.language) : value;

  return (
    <Card className={cn("bg-card border-border", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {tooltip ? (
            <MetricWithTooltip label={title} tooltip={tooltip} />
          ) : (
            title
          )}
        </CardTitle>
        <div className="rounded-md bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <p
          className={cn(
            "text-3xl sm:text-4xl font-bold tabular-nums text-foreground",
            valueClassName
          )}
        >
          {display}
        </p>
        {subtitle ? (
          <div className="mt-1 text-xs text-muted-foreground" dir={i18n.dir()}>
            {subtitle}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
