import { useEffect, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  RefreshCw,
  Lock,
  TrendingUp,
  Mail,
} from "lucide-react";
import {
  fetchMonitoringData,
  calculateSystemHealth,
  getRecentErrors,
  getWarnings,
  getSecurityAdvisories,
  getPerformanceAdvisories,
  formatTimestamp,
  type MonitoringData,
  type SystemHealthOverview,
} from "@/lib/data-layer/monitoring.service";
import { getTooltipDescriptions } from "./monitoring/monitoringUtils";
import {
  ServiceHealthCard,
  AnomalyList,
  AdvisoryList,
} from "./monitoring/AdminMonitoringComponents";
import {
  DatabaseStats,
  AuthStats,
  EdgeFunctionStats,
  EmailStatsDisplay,
  CloudflareStatsDisplay,
  VercelStatsDisplay,
} from "./monitoring/stats";

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
