import { Activity, RefreshCw, BarChart3, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  AdminEngagementStats,
  AdminSystemStats,
} from "@/lib/data-layer/admin.service";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { Separator } from "@/components/ui/separator";

interface AdminEngagementSectionProps {
  engagement: AdminEngagementStats;
  system: AdminSystemStats;
}

export function AdminEngagementSection({
  engagement,
  system,
}: AdminEngagementSectionProps) {
  const { t, i18n } = useTranslation("admin");

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      <Separator />

      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
          <Activity className="h-6 w-6 text-primary" />
          {t("engagement.title")}
        </h2>

        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <AdminMetricCard
            title={t("engagement.avgTransactions")}
            tooltip={t("engagement.tooltips.avgTransactions")}
            value={Number(engagement.avg_transactions_per_user.toFixed(1))}
            icon={BarChart3}
          />
          <AdminMetricCard
            title={t("engagement.totalTransactions")}
            tooltip={t("engagement.tooltips.totalTransactions")}
            value={engagement.total_transactions}
            icon={Activity}
          />
          <AdminMetricCard
            title={t("engagement.usersWithTransactions")}
            tooltip={t("engagement.tooltips.usersWithTransactions")}
            value={engagement.users_with_transactions}
            icon={Users}
          />
        </div>
      </div>

      <Separator />

      <div className="space-y-4">
        <h2 className="flex items-center gap-2 text-2xl font-semibold text-foreground">
          <RefreshCw className="h-6 w-6 text-primary" />
          {t("system.title")}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <AdminMetricCard
            title={t("system.totalRecurring")}
            tooltip={t("system.tooltips.totalRecurring")}
            value={system.total_recurring_transactions}
            icon={RefreshCw}
          />
          <AdminMetricCard
            title={t("system.activeRecurring")}
            tooltip={t("system.tooltips.activeRecurring")}
            value={system.active_recurring_transactions}
            icon={RefreshCw}
          />
        </div>
      </div>
    </div>
  );
}
