import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Activity,
  AlertCircle,
  BarChart3,
  ExternalLink,
  RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  fetchPostHogAdminAnalytics,
  type PostHogAdminAnalytics,
} from "@/lib/data-layer/posthogAdmin.service";
import { MetricWithTooltip } from "@/components/admin/monitoring/AdminMonitoringComponents";

function MetricCard({
  label,
  tooltip,
  value,
  suffix,
}: {
  label: string;
  tooltip: string;
  value: number | null | undefined;
  suffix?: string;
}) {
  const display =
    value == null || Number.isNaN(value)
      ? "—"
      : suffix
        ? `${value}${suffix}`
        : value.toLocaleString();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          <MetricWithTooltip label={label} tooltip={tooltip} />
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold tabular-nums">{display}</p>
      </CardContent>
    </Card>
  );
}

export function AdminPostHogSection() {
  const { t, i18n } = useTranslation("admin");
  const [data, setData] = useState<PostHogAdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const analytics = await fetchPostHogAdminAnalytics();
      if (!analytics) {
        throw new Error(t("posthog.loadFailed"));
      }
      setData(analytics);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("posthog.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading && !data) {
    return (
      <div className="space-y-4" dir={i18n.dir()}>
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <Alert variant="destructive" dir={i18n.dir()}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription className="flex items-center justify-between gap-4">
          <span>{error}</span>
          <Button variant="outline" size="sm" onClick={() => void loadData()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-xl font-semibold">
            <BarChart3 className="h-5 w-5" />
            {t("posthog.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("posthog.subtitle")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={() => void loadData()}>
            <RefreshCw className="me-2 h-4 w-4" />
            {t("posthog.refresh")}
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href={data.links.project} target="_blank" rel="noreferrer">
              <ExternalLink className="me-2 h-4 w-4" />
              {t("posthog.openProject")}
            </a>
          </Button>
        </div>
      </div>

      {!data.available && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {data.error || t("posthog.unavailable")}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t("posthog.dau7d")}
          tooltip={t("posthog.tooltips.dau7d")}
          value={data.dau7d}
        />
        <MetricCard
          label={t("posthog.wau30d")}
          tooltip={t("posthog.tooltips.wau30d")}
          value={data.wau30d}
        />
        <MetricCard
          label={t("posthog.pageviews7d")}
          tooltip={t("posthog.tooltips.pageviews7d")}
          value={data.pageviews7d}
        />
        <MetricCard
          label={t("posthog.importSuccess")}
          tooltip={t("posthog.tooltips.importSuccess")}
          value={data.importSuccessRate7d}
          suffix="%"
        />
        <MetricCard
          label={t("posthog.signups7d")}
          tooltip={t("posthog.tooltips.signups7d")}
          value={data.signupCompleted7d}
        />
        <MetricCard
          label={t("posthog.transactions7d")}
          tooltip={t("posthog.tooltips.transactions7d")}
          value={data.transactionCreated7d}
        />
        <MetricCard
          label={t("posthog.exceptions7d")}
          tooltip={t("posthog.tooltips.exceptions7d")}
          value={data.exceptions7d}
        />
        <MetricCard
          label={t("posthog.surveys30d")}
          tooltip={t("posthog.tooltips.surveys30d")}
          value={data.surveyResponses30d}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" asChild>
          <a href={data.links.webAnalytics} target="_blank" rel="noreferrer">
            <Activity className="me-2 h-4 w-4" />
            {t("posthog.webAnalytics")}
          </a>
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <a href={data.links.surveys} target="_blank" rel="noreferrer">
            {t("posthog.surveys")}
          </a>
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <a href={data.links.errorTracking} target="_blank" rel="noreferrer">
            {t("posthog.errorTracking")}
          </a>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <MetricWithTooltip
                label={t("posthog.topPaths")}
                tooltip={t("posthog.tooltips.topPaths")}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.topPaths7d.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("posthog.noData")}</p>
            ) : (
              data.topPaths7d.map((row) => (
                <div
                  key={row.path}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate font-mono">{row.path || "/"}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.views}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              <MetricWithTooltip
                label={t("posthog.eventCounts")}
                tooltip={t("posthog.tooltips.eventCounts")}
              />
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.eventCounts7d.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("posthog.noData")}</p>
            ) : (
              data.eventCounts7d.map((row) => (
                <div
                  key={row.event}
                  className="flex items-center justify-between gap-3 text-sm"
                >
                  <span className="truncate font-mono">{row.event}</span>
                  <span className="tabular-nums text-muted-foreground">
                    {row.count}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
