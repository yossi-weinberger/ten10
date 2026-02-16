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
import { Download, Info, Github } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AdminDownloadStats } from "@/lib/data-layer/admin.service";
import { useGitHubReleaseDownloadStats } from "@/hooks/useGitHubReleaseDownloadStats";
import { Skeleton } from "@/components/ui/skeleton";

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

  const hasDownloadData =
    downloads.total > 0 ||
    (downloads.by_platform && Object.keys(downloads.by_platform).length > 0);

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      {/* Email Download Requests */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Download className="h-6 w-6" />
          {t("downloads.title")}
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Total Requests */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("downloads.total")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {hasDownloadData ? downloads.total : "N/A"}
              </div>
            </CardContent>
          </Card>

          {/* Requests Last 7 Days */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("downloads.last7d")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {hasDownloadData ? downloads.last_7d : "N/A"}
              </div>
            </CardContent>
          </Card>

          {/* Requests Last 30 Days */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("downloads.last30d")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                {hasDownloadData ? downloads.last_30d : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>

        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>{t("downloads.note")}</AlertDescription>
        </Alert>
      </div>

      {/* GitHub Release Downloads */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <Github className="h-5 w-5" />
          {t("downloads.githubSection")}
        </h3>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* GitHub Installer Downloads - all versions */}
          <Card>
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
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {githubStats?.installerDownloads ?? "—"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* GitHub Installer Downloads - last 3 releases */}
          <Card>
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
                <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                  {githubStats?.installerDownloadsLast3 ?? "—"}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Update Checks - secondary, less prominent */}
          <Card>
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
                <div className="text-2xl font-medium text-muted-foreground">
                  {githubStats?.updateChecks ?? "—"}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Per-release breakdown table */}
        {githubStats?.byRelease && githubStats.byRelease.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {t("downloads.byVersionTable")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t("downloads.tableVersion")}</TableHead>
                      <TableHead className="text-right">
                        {t("downloads.tableInstallers")}
                      </TableHead>
                      <TableHead className="text-right">
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
                        <TableCell className="text-right">
                          {row.installerDownloads}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
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
