import { Users, UserCheck, UserPlus, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AdminUserStats } from "@/lib/data-layer/admin.service";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

interface AdminUsersSectionProps {
  stats: AdminUserStats;
}

export function AdminUsersSection({ stats }: AdminUsersSectionProps) {
  const { t, i18n } = useTranslation("admin");
  const activePercentage =
    stats.total > 0
      ? ((stats.active_30d / stats.total) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-4" dir={i18n.dir()}>
      <h2 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
        <Users className="h-6 w-6 text-primary" />
        {t("users.title")}
      </h2>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <AdminMetricCard
          title={t("users.total")}
          tooltip={t("users.tooltips.total")}
          value={stats.total}
          icon={Users}
        />
        <AdminMetricCard
          title={t("users.active30d")}
          tooltip={t("users.tooltips.active30d")}
          value={stats.active_30d}
          icon={UserCheck}
          subtitle={t("users.activePercentage", {
            percentage: activePercentage,
          })}
        />
        <AdminMetricCard
          title={t("users.new30d")}
          tooltip={t("users.tooltips.new30d")}
          value={stats.new_30d}
          icon={UserPlus}
        />
        <AdminMetricCard
          title={t("users.new7d")}
          tooltip={t("users.tooltips.new7d")}
          value={stats.new_7d}
          icon={Clock}
        />
      </div>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>{t("users.activeNote")}</AlertDescription>
      </Alert>
    </div>
  );
}
