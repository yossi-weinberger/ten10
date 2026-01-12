import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Database,
  Shield,
  Zap,
  Mail,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ChevronDown,
  Activity,
  Users,
  Lock,
  TrendingUp,
  Server,
  HelpCircle,
  Cloud,
  Rocket,
  GitCommit,
} from "lucide-react";
import { MagicStatCard } from "@/components/dashboard/StatCards/MagicStatCard";
import {
  fetchMonitoringData,
  calculateSystemHealth,
  getRecentErrors,
  getWarnings,
  getSecurityAdvisories,
  getPerformanceAdvisories,
  formatTimestamp,
  formatDuration,
  MonitoringData,
  SystemHealthOverview,
  ServiceHealthStatus,
  Anomaly,
  Advisory,
  EmailStats,
  CloudflareStats,
  VercelStats,
} from "@/lib/data-layer/monitoring.service";

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

// Tooltip descriptions - uses i18n via getTooltipDescriptions function
const getTooltipDescriptions = (
  t: (key: string, defaultValue?: string) => string
) => ({
  // Service Health
  database: t("monitoring.tooltips.database"),
  auth: t("monitoring.tooltips.auth"),
  edgeFunctions: t("monitoring.tooltips.edgeFunctions"),
  email: t("monitoring.tooltips.email"),

  // Database Stats
  activeConnections: t("monitoring.tooltips.activeConnections"),
  slowQueries: t("monitoring.tooltips.slowQueries"),
  seqScans: t("monitoring.tooltips.seqScans"),
  indexScans: t("monitoring.tooltips.indexScans"),
  deadTuples: t("monitoring.tooltips.deadTuples"),
  rowCount: t("monitoring.tooltips.rowCount"),

  // Auth Stats
  failedLogins: t("monitoring.tooltips.failedLogins"),
  signups: t("monitoring.tooltips.signups"),
  passwordResets: t("monitoring.tooltips.passwordResets"),

  // Edge Functions
  invocations: t("monitoring.tooltips.invocations"),
  errors: t("monitoring.tooltips.errors"),
  errorRate: t("monitoring.tooltips.errorRate"),

  // Advisories
  securityAdvisory: t("monitoring.tooltips.securityAdvisory"),
  performanceAdvisory: t("monitoring.tooltips.performanceAdvisory"),

  // Email Stats
  emailSends: t("monitoring.tooltips.emailSends"),
  emailDeliveries: t("monitoring.tooltips.emailDeliveries"),
  emailBounces: t("monitoring.tooltips.emailBounces"),
  emailComplaints: t("monitoring.tooltips.emailComplaints"),
  emailDeliveryRate: t("monitoring.tooltips.emailDeliveryRate"),
  emailBounceRate: t("monitoring.tooltips.emailBounceRate"),

  // Cloudflare Stats
  cloudflare: t("monitoring.tooltips.cloudflare"),
  cfRequests: t("monitoring.tooltips.cfRequests"),
  cfErrors: t("monitoring.tooltips.cfErrors"),
  cfErrorRate: t("monitoring.tooltips.cfErrorRate"),

  // Vercel Stats
  vercel: t("monitoring.tooltips.vercel"),
  vercelDeployments: t("monitoring.tooltips.vercelDeployments"),
});

// Helper component for metric with tooltip
function MetricWithTooltip({
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

function StatusIcon({ status }: { status: ServiceHealthStatus }) {
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

function ServiceHealthCard({
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

function AnomalyList({
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

function AdvisoryList({
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

interface DatabaseStatsProps {
  data: MonitoringData;
}

function DatabaseStats({ data }: DatabaseStatsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t, i18n } = useTranslation("admin");
  const tooltipDescriptions = getTooltipDescriptions(t);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Database Statistics
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4" dir={i18n.dir()}>
            {/* Active Connections */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
              <MetricWithTooltip
                label="Active Connections"
                tooltip={tooltipDescriptions.activeConnections}
              />
              <Badge variant="secondary">
                {data.database.activeConnections}
              </Badge>
            </div>

            {/* Slow Queries */}
            {data.database.slowQueries.length > 0 && (
              <div className="space-y-2">
                <MetricWithTooltip
                  label={`Slow Queries (${data.database.slowQueries.length})`}
                  tooltip={tooltipDescriptions.slowQueries}
                />
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {data.database.slowQueries.map((query, index) => (
                    <div
                      key={index}
                      className="p-2 rounded border bg-card text-card-foreground"
                    >
                      <code className="text-xs block truncate">
                        {query.query}
                      </code>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                        <span>Calls: {query.calls}</span>
                        <span>Mean: {formatDuration(query.meanTime)}</span>
                        <span>Total: {formatDuration(query.totalTime)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Table Stats */}
            {data.database.tableStats.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Table Statistics
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b">
                        <th className="text-start p-2">Table</th>
                        <th className="text-end p-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help inline-flex items-center gap-1">
                                Rows
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-xs text-right"
                              dir="rtl"
                            >
                              <p>{tooltipDescriptions.rowCount}</p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="text-end p-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help inline-flex items-center gap-1">
                                Seq Scans
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-xs text-right"
                              dir="rtl"
                            >
                              <p>{tooltipDescriptions.seqScans}</p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="text-end p-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help inline-flex items-center gap-1">
                                Index Scans
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-xs text-right"
                              dir="rtl"
                            >
                              <p>{tooltipDescriptions.indexScans}</p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="text-end p-2">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help inline-flex items-center gap-1">
                                Dead Tuples
                                <HelpCircle className="h-3 w-3 text-muted-foreground" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="max-w-xs text-right"
                              dir="rtl"
                            >
                              <p>{tooltipDescriptions.deadTuples}</p>
                            </TooltipContent>
                          </Tooltip>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.database.tableStats
                        .slice(0, 10)
                        .map((table, index) => {
                          // Calculate health indicators
                          const isLargeTable = table.rowCount > 1000;
                          const seqScanRatio =
                            table.seqScans + table.indexScans > 0
                              ? table.seqScans /
                                (table.seqScans + table.indexScans)
                              : 0;
                          const hasIndexProblem =
                            isLargeTable &&
                            seqScanRatio > 0.8 &&
                            table.seqScans > 100;
                          const hasDeadTuplesProblem = table.deadTuples > 1000;
                          const hasRowWarning = table.rowCount > 100000;

                          return (
                            <tr
                              key={index}
                              className={`border-b last:border-0 ${
                                hasIndexProblem
                                  ? "bg-red-50 dark:bg-red-950/30"
                                  : hasDeadTuplesProblem
                                  ? "bg-yellow-50 dark:bg-yellow-950/30"
                                  : ""
                              }`}
                            >
                              <td className="p-2 font-mono text-xs">
                                {table.tableName}
                                {hasIndexProblem && (
                                  <span
                                    className="ml-1 text-red-500"
                                    title="Missing index - high seq scan ratio"
                                  >
                                    ⚠️
                                  </span>
                                )}
                              </td>
                              <td className="text-end p-2">
                                <span
                                  className={
                                    hasRowWarning
                                      ? "text-blue-600 font-medium"
                                      : ""
                                  }
                                >
                                  {table.rowCount.toLocaleString()}
                                </span>
                              </td>
                              <td className="text-end p-2">
                                <span
                                  className={
                                    hasIndexProblem
                                      ? "text-red-600 font-medium"
                                      : ""
                                  }
                                >
                                  {table.seqScans.toLocaleString()}
                                </span>
                              </td>
                              <td className="text-end p-2">
                                <span
                                  className={
                                    table.indexScans > table.seqScans
                                      ? "text-green-600"
                                      : ""
                                  }
                                >
                                  {table.indexScans.toLocaleString()}
                                </span>
                              </td>
                              <td className="text-end p-2">
                                <span
                                  className={
                                    table.deadTuples > 5000
                                      ? "text-red-600 font-medium"
                                      : table.deadTuples > 1000
                                      ? "text-yellow-600"
                                      : ""
                                  }
                                >
                                  {table.deadTuples.toLocaleString()}
                                  {table.deadTuples > 5000 && " 🔴"}
                                  {table.deadTuples > 1000 &&
                                    table.deadTuples <= 5000 &&
                                    " 🟡"}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
                {/* Legend */}
                <div className="mt-3 p-2 bg-muted/30 rounded text-xs space-y-1">
                  <p className="font-medium">{t("monitoring.legend.title")}</p>
                  <div className="flex flex-wrap gap-4">
                    <span>
                      <span className="text-red-600">■</span>{" "}
                      {t("monitoring.legend.highSeqScans")}
                    </span>
                    <span>
                      <span className="text-green-600">■</span> Index Scans &gt;{" "}
                      {t("monitoring.legend.lowSeqScans")}
                    </span>
                    <span>
                      <span className="text-yellow-600">■</span> Dead Tuples{" "}
                      {t("monitoring.legend.highDeadTuples")}
                    </span>
                    <span>
                      <span className="text-blue-600">■</span> Rows &gt; 100K ={" "}
                      {t("monitoring.legend.largeTable")}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface AuthStatsProps {
  data: MonitoringData;
}

function AuthStats({ data }: AuthStatsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t, i18n } = useTranslation("admin");
  const tooltipDescriptions = getTooltipDescriptions(t);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Authentication Events
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4" dir={i18n.dir()}>
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help border border-dashed border-muted-foreground/30">
                    <p className="text-2xl font-bold text-muted-foreground">
                      N/A
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Failed Logins (24h)
                      <HelpCircle className="h-3 w-3 text-yellow-500" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.failedLogins}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p className="text-2xl font-bold">{data.auth.signups24h}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Signups (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.signups}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p className="text-2xl font-bold">
                      {data.auth.passwordResets24h}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Password Resets (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.passwordResets}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Recent Events */}
            {data.auth.recentEvents.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Recent Events
                </h4>
                <div className="space-y-1 max-h-60 overflow-y-auto">
                  {data.auth.recentEvents.slice(0, 10).map((event) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-2 rounded border bg-card"
                    >
                      <span className="text-sm font-medium">
                        {event.action}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(event.createdAt)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface EdgeFunctionStatsProps {
  data: MonitoringData;
}

function EdgeFunctionStats({ data }: EdgeFunctionStatsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t, i18n } = useTranslation("admin");
  const tooltipDescriptions = getTooltipDescriptions(t);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Edge Functions
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4" dir={i18n.dir()}>
            <div className="grid grid-cols-3 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p className="text-2xl font-bold">
                      {data.edgeFunctions.invocations24h}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Invocations (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.invocations}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p className="text-2xl font-bold">
                      {data.edgeFunctions.errors24h}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Errors (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.errors}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p
                      className={`text-2xl font-bold ${
                        data.edgeFunctions.errorRate > 5
                          ? "text-yellow-600"
                          : ""
                      }`}
                    >
                      {data.edgeFunctions.errorRate}%
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Error Rate
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.errorRate}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface EmailStatsDisplayProps {
  emailStats: EmailStats;
}

function EmailStatsDisplay({ emailStats }: EmailStatsDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t, i18n } = useTranslation("admin");
  const tooltipDescriptions = getTooltipDescriptions(t);

  if (!emailStats.available) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Mail className="h-5 w-5" />
            Email Statistics
            <Badge variant="outline" className="ml-2">
              Not Configured
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {emailStats.error || "AWS credentials not configured"}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {t("monitoring.addAwsKeys")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Email Statistics (SES)
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4" dir={i18n.dir()}>
            {/* Main Stats */}
            <div className="grid grid-cols-3 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p className="text-2xl font-bold">{emailStats.sends24h}</p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Sends (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.emailSends}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p className="text-2xl font-bold text-green-600">
                      {emailStats.deliveries24h}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Delivered (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.emailDeliveries}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p
                      className={`text-2xl font-bold ${
                        emailStats.bounces24h > 0 ? "text-red-600" : ""
                      }`}
                    >
                      {emailStats.bounces24h}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Bounces (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.emailBounces}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Rates & Complaints */}
            <div className="grid grid-cols-3 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p
                      className={`text-2xl font-bold ${
                        emailStats.deliveryRate >= 95
                          ? "text-green-600"
                          : emailStats.deliveryRate >= 90
                          ? "text-yellow-600"
                          : "text-red-600"
                      }`}
                    >
                      {emailStats.deliveryRate}%
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Delivery Rate
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.emailDeliveryRate}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p
                      className={`text-2xl font-bold ${
                        emailStats.bounceRate > 5
                          ? "text-red-600"
                          : emailStats.bounceRate > 2
                          ? "text-yellow-600"
                          : ""
                      }`}
                    >
                      {emailStats.bounceRate}%
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Bounce Rate
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.emailBounceRate}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`p-3 rounded-lg text-center cursor-help ${
                      emailStats.complaints24h > 0
                        ? "bg-red-100 dark:bg-red-950/50 border border-red-200 dark:border-red-800"
                        : "bg-muted/50"
                    }`}
                  >
                    <p
                      className={`text-2xl font-bold ${
                        emailStats.complaints24h > 0 ? "text-red-600" : ""
                      }`}
                    >
                      {emailStats.complaints24h}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Complaints (24h)
                      <HelpCircle className="h-3 w-3 text-yellow-500" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.emailComplaints}</p>
                </TooltipContent>
              </Tooltip>
            </div>

            {/* Legend */}
            <div className="p-2 bg-muted/30 rounded text-xs space-y-1">
              <p className="font-medium">{t("monitoring.legend.emailTitle")}</p>
              <div className="flex flex-wrap gap-4">
                <span>
                  <span className="text-green-600">■</span> Delivery Rate ≥95% ={" "}
                  {t("monitoring.legend.excellent")}
                </span>
                <span>
                  <span className="text-yellow-600">■</span> Bounce Rate 2-5% ={" "}
                  {t("monitoring.legend.check")}
                </span>
                <span>
                  <span className="text-red-600">■</span> Bounce Rate &gt;5% ={" "}
                  {t("monitoring.legend.problematic")}
                </span>
              </div>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface CloudflareStatsDisplayProps {
  stats?: CloudflareStats;
}

function CloudflareStatsDisplay({ stats }: CloudflareStatsDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { t, i18n } = useTranslation("admin");
  const tooltipDescriptions = getTooltipDescriptions(t);

  if (!stats) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Cloud className="h-5 w-5" />
            Cloudflare Workers
            <Badge variant="outline" className="ml-2">
              Requires Deployment
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!stats.available) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Cloud className="h-5 w-5" />
            Cloudflare Workers
            <Badge variant="outline" className="ml-2">
              Not Configured
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{stats.error}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Cloud className="h-5 w-5 text-orange-500" />
                Cloudflare Workers
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4" dir={i18n.dir()}>
            <div className="grid grid-cols-3 gap-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p className="text-2xl font-bold">
                      {stats.requests24h.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Requests (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.cfRequests}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p
                      className={`text-2xl font-bold ${
                        stats.errors24h > 0 ? "text-red-600" : ""
                      }`}
                    >
                      {stats.errors24h.toLocaleString()}
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Errors (24h)
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.cfErrors}</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="p-3 rounded-lg bg-muted/50 text-center cursor-help">
                    <p
                      className={`text-2xl font-bold ${
                        stats.errorRate > 5
                          ? "text-red-600"
                          : stats.errorRate > 2
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {stats.errorRate}%
                    </p>
                    <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                      Error Rate
                      <HelpCircle className="h-3 w-3" />
                    </p>
                  </div>
                </TooltipTrigger>
                <TooltipContent
                  side="bottom"
                  className="max-w-xs text-right"
                  dir="rtl"
                >
                  <p>{tooltipDescriptions.cfErrorRate}</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

interface VercelStatsDisplayProps {
  stats?: VercelStats;
}

function VercelStatsDisplay({ stats }: VercelStatsDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { i18n } = useTranslation("admin");

  if (!stats) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Rocket className="h-5 w-5" />
            Vercel Deployments
            <Badge variant="outline" className="ml-2">
              Requires Deployment
            </Badge>
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!stats.available) {
    return (
      <Card className="border-dashed border-muted-foreground/30">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-muted-foreground">
            <Rocket className="h-5 w-5" />
            Vercel Deployments
            <Badge variant="outline" className="ml-2">
              Not Configured
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{stats.error}</p>
        </CardContent>
      </Card>
    );
  }

  const getStateColor = (state: string) => {
    switch (state.toLowerCase()) {
      case "ready":
        return "text-green-600";
      case "building":
        return "text-yellow-600";
      case "error":
      case "failed":
        return "text-red-600";
      case "canceled":
        return "text-gray-500";
      default:
        return "text-muted-foreground";
    }
  };

  const getStateBadge = (state: string) => {
    switch (state.toLowerCase()) {
      case "ready":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
      case "building":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
      case "error":
      case "failed":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Rocket className="h-5 w-5" />
                Vercel Deployments
                {stats.lastDeployment && (
                  <Badge className={getStateBadge(stats.lastDeployment.state)}>
                    {stats.lastDeployment.state}
                  </Badge>
                )}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </CardTitle>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4" dir={i18n.dir()}>
            {stats.deployments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent deployments
              </p>
            ) : (
              <div className="space-y-2">
                {stats.deployments.map((deployment) => (
                  <div
                    key={deployment.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      <GitCommit
                        className={`h-4 w-4 ${getStateColor(deployment.state)}`}
                      />
                      <div>
                        <p className="text-sm font-medium truncate max-w-[200px]">
                          {deployment.meta?.githubCommitMessage ||
                            deployment.id}
                        </p>
                        {deployment.meta?.githubCommitRef && (
                          <p className="text-xs text-muted-foreground">
                            {deployment.meta.githubCommitRef}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={getStateBadge(deployment.state)}>
                        {deployment.state}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatTimestamp(deployment.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

export function AdminMonitoringSection() {
  const { t, i18n } = useTranslation("admin");
  const tooltipDescriptions = getTooltipDescriptions(t);
  const [data, setData] = useState<MonitoringData | null>(null);
  const [health, setHealth] = useState<SystemHealthOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const monitoringData = await fetchMonitoringData();

      if (!monitoringData) {
        throw new Error("Failed to fetch monitoring data");
      }

      setData(monitoringData);
      setHealth(calculateSystemHealth(monitoringData));
      setLastRefresh(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading && !data) {
    return (
      <div className="space-y-6" dir={i18n.dir()}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6" dir={i18n.dir()}>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
        <Button onClick={loadData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  if (!data || !health) {
    return null;
  }

  const errors = getRecentErrors(data);
  const warnings = getWarnings(data);
  const securityAdvisories = getSecurityAdvisories(data);
  const performanceAdvisories = getPerformanceAdvisories(data);

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            {t("monitoring.title", "System Monitoring")}
          </h2>
          {lastRefresh && (
            <p className="text-sm text-muted-foreground">
              {t("monitoring.lastRefresh", "Last updated")}:{" "}
              {formatTimestamp(lastRefresh.toISOString(), i18n.language)}
            </p>
          )}
        </div>
        <Button onClick={loadData} variant="outline" disabled={loading}>
          <RefreshCw
            className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`}
          />
          {t("monitoring.refresh", "Refresh")}
        </Button>
      </div>

      {/* System Health Overview */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">
          {t("monitoring.healthOverview", "System Health")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ServiceHealthCard
            name={health.database.name}
            status={health.database.status}
            message={health.database.message}
            tooltip={tooltipDescriptions.database}
          />
          <ServiceHealthCard
            name={health.auth.name}
            status={health.auth.status}
            message={health.auth.message}
            tooltip={tooltipDescriptions.auth}
          />
          <ServiceHealthCard
            name={health.edgeFunctions.name}
            status={health.edgeFunctions.status}
            message={health.edgeFunctions.message}
            tooltip={tooltipDescriptions.edgeFunctions}
          />
          <ServiceHealthCard
            name={health.email.name}
            status={health.email.status}
            message={health.email.message}
            tooltip={tooltipDescriptions.email}
          />
        </div>
      </div>

      {/* Errors and Warnings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AnomalyList
          anomalies={errors}
          title={t("monitoring.recentErrors", "Recent Errors")}
          icon={<AlertCircle className="h-5 w-5 text-red-500" />}
          emptyMessage={t("monitoring.noErrors", "No errors detected")}
        />
        <AnomalyList
          anomalies={warnings}
          title={t("monitoring.warnings", "Warnings")}
          icon={<AlertTriangle className="h-5 w-5 text-yellow-500" />}
          emptyMessage={t("monitoring.noWarnings", "No warnings")}
        />
      </div>

      {/* Advisories */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <AdvisoryList
          advisories={securityAdvisories}
          title={t("monitoring.securityAdvisories", "Security Advisories")}
          icon={<Lock className="h-5 w-5 text-purple-500" />}
          emptyMessage={t(
            "monitoring.noSecurityIssues",
            "No security issues detected"
          )}
        />
        <AdvisoryList
          advisories={performanceAdvisories}
          title={t(
            "monitoring.performanceAdvisories",
            "Performance Advisories"
          )}
          icon={<TrendingUp className="h-5 w-5 text-blue-500" />}
          emptyMessage={t(
            "monitoring.noPerformanceIssues",
            "No performance issues detected"
          )}
        />
      </div>

      {/* Detailed Stats (Collapsible) */}
      <div className="space-y-4">
        <h3 className="text-lg font-medium">
          {t("monitoring.detailedStats", "Detailed Statistics")}
        </h3>
        <div className="space-y-4">
          <DatabaseStats data={data} />
          <AuthStats data={data} />
          <EdgeFunctionStats data={data} />
          {data.email.available ? (
            <EmailStatsDisplay emailStats={data.email} />
          ) : (
            <Card className="border-dashed border-muted-foreground/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-muted-foreground">
                  <Mail className="h-5 w-5" />
                  Email Statistics
                  <Badge variant="outline" className="ml-2">
                    {data.email.error
                      ? "Not Configured"
                      : "Requires Deployment"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  {data.email.error || t("monitoring.requiresDeployment")}
                </p>
                {!data.email.error && (
                  <code className="text-xs bg-muted p-2 rounded block mt-2">
                    npx supabase functions deploy get-monitoring-data
                  </code>
                )}
              </CardContent>
            </Card>
          )}
          <CloudflareStatsDisplay stats={data.cloudflare} />
          <VercelStatsDisplay stats={data.vercel} />
        </div>
      </div>
    </div>
  );
}
