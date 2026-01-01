import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AdminDownloadStats } from "@/lib/data-layer/admin.service";

interface AdminDownloadsSectionProps {
  downloads: AdminDownloadStats;
}

export function AdminDownloadsSection({
  downloads,
}: AdminDownloadsSectionProps) {
  const { t, i18n } = useTranslation("admin");

  const hasDownloadData =
    downloads.total > 0 ||
    (downloads.by_platform && Object.keys(downloads.by_platform).length > 0);

  return (
    <div className="space-y-4" dir={i18n.dir()}>
      <h2 className="text-2xl font-semibold flex items-center gap-2">
        <Download className="h-6 w-6" />
        {t("downloads.title")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Total Downloads */}
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

        {/* Downloads Last 7 Days */}
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

        {/* Downloads Last 30 Days */}
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

      {/* Info Alert */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{t("downloads.note")}</AlertDescription>
      </Alert>
    </div>
  );
}
