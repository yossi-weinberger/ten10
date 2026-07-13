import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, Info, GitBranch } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AdminDownloadStats } from "@/lib/data-layer/admin.service";
import { useGitHubReleaseDownloadStats } from "@/hooks/useGitHubReleaseDownloadStats";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";

interface AdminDownloadsSectionProps {
  downloads: AdminDownloadStats;
}

export function AdminDownloadsSection({
  downloads,
}: AdminDownloadsSectionProps) {
  const { t, i18n } = useTranslation("admin");
  const {
    stats: githubStats,
    loading: githubLoading,
    error: githubError,
  } = useGitHubReleaseDownloadStats();

  const platformEntries = Object.entries(downloads.by_platform ?? {});

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
          <Download className="h-6 w-6 text-primary" />
          {t("downloads.title")}
        </h2>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <AdminMetricCard
            title={t("downloads.total")}
            value={downloads.total}
            icon={Download}
          />
          <AdminMetricCard
            title={t("downloads.last7d")}
            value={downloads.last_7d}
            icon={Download}
          />
          <AdminMetricCard
            title={t("downloads.last30d")}
            value={downloads.last_30d}
            icon={Download}
          />
        </div>

        {platformEntries.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("downloads.byPlatform")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {platformEntries.map(([platform, count]) => (
                <div
                  key={platform}
                  className="flex items-center justify-between text-sm"
                >
                  <span>
                    {t(`downloads.platforms.${platform}`, {
                      defaultValue: platform,
                    })}
                  </span>
                  <span className="tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>{t("downloads.note")}</AlertDescription>
        </Alert>
      </div>

      <div className="space-y-4">
        <h3 className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <GitBranch className="h-5 w-5 text-primary" />
          {t("downloads.githubSection")}
        </h3>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("downloads.githubInstallerDownloads")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {githubLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : githubError ? (
                <div className="text-2xl text-muted-foreground">
                  {t("downloads.unavailable")}
                </div>
              ) : (
                <div className="text-3xl font-bold tabular-nums text-foreground">
                  {githubStats?.installerDownloads ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("downloads.githubInstallerDownloadsLast3")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {githubLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : githubError ? (
                <div className="text-2xl text-muted-foreground">
                  {t("downloads.unavailable")}
                </div>
              ) : (
                <div className="text-3xl font-bold tabular-nums text-foreground">
                  {githubStats?.installerDownloadsLast3 ?? 0}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("downloads.githubUpdateChecks")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {githubLoading ? (
                <Skeleton className="h-9 w-16" />
              ) : githubError ? (
                <div className="text-2xl text-muted-foreground">
                  {t("downloads.unavailable")}
                </div>
              ) : (
                <div className="text-2xl font-medium tabular-nums text-muted-foreground">
                  {githubStats?.updateChecks ?? 0}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {githubStats?.byRelease && githubStats.byRelease.length > 0 && (
          <Card className="border-border bg-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("downloads.byVersionTable")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border border-border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("downloads.tableVersion")}</TableHead>
                      <TableHead className="text-end">
                        {t("downloads.tableInstallers")}
                      </TableHead>
                      <TableHead className="text-end">
                        {t("downloads.tableUpdateChecks")}
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {githubStats.byRelease.map((row) => (
                      <TableRow key={row.tagName}>
                        <TableCell className="font-medium">
                          {row.tagName}
                        </TableCell>
                        <TableCell className="text-end tabular-nums">
                          {row.installerDownloads}
                        </TableCell>
                        <TableCell className="text-end tabular-nums text-muted-foreground">
                          {row.updateChecks}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
