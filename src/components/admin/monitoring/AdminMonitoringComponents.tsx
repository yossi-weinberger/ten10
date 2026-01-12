import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Activity,
  HelpCircle,
  Lock,
  TrendingUp,
  Server,
  Database,
  Shield,
  Zap,
  Mail,
} from "lucide-react";
import { MagicStatCard } from "@/components/dashboard/StatCards/MagicStatCard";
import type { ServiceHealthStatus, Anomaly, Advisory } from "@/lib/data-layer/monitoring.types";

// Color styles for different status types
const statusColors = {
  healthy: {
    bg: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900",
    border: "border-green-200 dark:border-green-800",
    icon: "text-green-600 dark:text-green-400",
    badge: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    gradient: "rgba(34, 197, 94, 0.3)",
  },
  warning: {
    bg: "bg-gradient-to-br from-yellow-50 to-amber-100 dark:from-yellow-950 dark:to-amber-900",
    border: "border-yellow-200 dark:border-yellow-800",
    icon: "text-yellow-600 dark:text-yellow-400",
    badge:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    gradient: "rgba(234, 179, 8, 0.3)",
  },
  error: {
    bg: "bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950 dark:to-red-900",
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-600 dark:text-red-400",
    badge: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    gradient: "rgba(239, 68, 68, 0.3)",
  },
  unknown: {
    bg: "bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900",
    border: "border-gray-200 dark:border-gray-800",
    icon: "text-gray-600 dark:text-gray-400",
    badge: "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200",
    gradient: "rgba(107, 114, 128, 0.3)",
  },
};

const serviceIcons = {
  Database: Database,
  Authentication: Shield,
  "Edge Functions": Zap,
  Email: Mail,
};

// Helper component for metric with tooltip
export function MetricWithTooltip({
  label,
  tooltip,
}: {
  label: string;
  tooltip: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 cursor-help">
          <span>{label}</span>
          <HelpCircle className="h-3 w-3 text-muted-foreground" />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-right" dir="rtl">
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export function StatusIcon({ status }: { status: ServiceHealthStatus }) {
  const colors = statusColors[status];
  switch (status) {
    case "healthy":
      return <CheckCircle2 className={`h-5 w-5 ${colors.icon}`} />;
    case "warning":
      return <AlertTriangle className={`h-5 w-5 ${colors.icon}`} />;
    case "error":
      return <AlertCircle className={`h-5 w-5 ${colors.icon}`} />;
    default:
      return <Activity className={`h-5 w-5 ${colors.icon}`} />;
  }
}

interface ServiceHealthCardProps {
  name: string;
  status: ServiceHealthStatus;
  message?: string;
  tooltip?: string;
}

export function ServiceHealthCard({
  name,
  status,
  message,
  tooltip,
}: ServiceHealthCardProps) {
  const colors = statusColors[status];
  const Icon = serviceIcons[name as keyof typeof serviceIcons] || Server;

  const card = (
    <MagicStatCard
      className={`${colors.bg} ${colors.border} border transition-all duration-300`}
      gradientColor={colors.gradient}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-sm font-medium">
          <span className="flex items-center gap-2">
            <Icon className={`h-4 w-4 ${colors.icon}`} />
            {name}
            {tooltip && (
              <HelpCircle className="h-3 w-3 text-muted-foreground" />
            )}
          </span>
          <StatusIcon status={status} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Badge className={colors.badge}>
          {status === "healthy"
            ? "OK"
            : status === "warning"
            ? "Warning"
            : status === "error"
            ? "Error"
            : "Unknown"}
        </Badge>
        {message && (
          <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
            {message}
          </p>
        )}
      </CardContent>
    </MagicStatCard>
  );

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="cursor-help">{card}</div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-right" dir="rtl">
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return card;
}

interface AnomalyListProps {
  anomalies: Anomaly[];
  title: string;
  icon: React.ReactNode;
  emptyMessage: string;
}

export function AnomalyList({
  anomalies,
  title,
  icon,
  emptyMessage,
}: AnomalyListProps) {
  const { i18n } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {anomalies.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="space-y-2" dir={i18n.dir()}>
            {anomalies.map((anomaly, index) => {
              const colors = statusColors[anomaly.severity];
              return (
                <li
                  key={index}
                  className={`flex items-start gap-2 p-2 rounded-md ${colors.bg} ${colors.border} border`}
                >
                  <StatusIcon status={anomaly.severity} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{anomaly.message}</p>
                    {anomaly.value !== undefined &&
                      anomaly.threshold !== undefined && (
                        <p className="text-xs text-muted-foreground">
                          Value: {anomaly.value} (Threshold: {anomaly.threshold}
                          )
                        </p>
                      )}
                  </div>
                  <Badge className={colors.badge}>{anomaly.type}</Badge>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

interface AdvisoryListProps {
  advisories: Advisory[];
  title: string;
  icon: React.ReactNode;
  emptyMessage: string;
}

export function AdvisoryList({
  advisories,
  title,
  icon,
  emptyMessage,
}: AdvisoryListProps) {
  const { i18n } = useTranslation();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {advisories.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyMessage}</p>
        ) : (
          <ul className="space-y-2" dir={i18n.dir()}>
            {advisories.map((advisory, index) => {
              const colors = statusColors[advisory.severity];
              return (
                <li
                  key={index}
                  className={`flex items-start gap-2 p-2 rounded-md ${colors.bg} ${colors.border} border`}
                >
                  {advisory.type === "security" ? (
                    <Lock className={`h-4 w-4 ${colors.icon} mt-0.5`} />
                  ) : (
                    <TrendingUp className={`h-4 w-4 ${colors.icon} mt-0.5`} />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm">{advisory.message}</p>
                    {advisory.table && (
                      <code className="text-xs bg-muted px-1 py-0.5 rounded">
                        {advisory.table}
                      </code>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
