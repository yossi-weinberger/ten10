import { CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, RefreshCw, BarChart3, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  AdminEngagementStats,
  AdminSystemStats,
} from "@/lib/data-layer/admin.service";
import { MagicStatCard } from "@/components/dashboard/StatCards/MagicStatCard";

interface AdminEngagementSectionProps {
  engagement: AdminEngagementStats;
  system: AdminSystemStats;
}

export function AdminEngagementSection({
  engagement,
  system,
}: AdminEngagementSectionProps) {
  const { t, i18n } = useTranslation("admin");

  const colorStyles = {
    purple: {
      bg: "bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950 dark:to-purple-900",
      shadow: "hover:shadow-purple-200/50 dark:hover:shadow-purple-900/50",
      icon: "text-purple-600 dark:text-purple-400",
      text: "bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent dark:from-purple-400 dark:to-violet-400",
      gradient: "rgba(147, 51, 234, 0.3)",
    },
    blue: {
      bg: "bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900",
      shadow: "hover:shadow-blue-200/50 dark:hover:shadow-blue-900/50",
      icon: "text-blue-600 dark:text-blue-400",
      text: "bg-gradient-to-r from-blue-600 to-sky-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-sky-400",
      gradient: "rgba(59, 130, 246, 0.3)",
    },
    green: {
      bg: "bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900",
      shadow: "hover:shadow-green-200/50 dark:hover:shadow-green-900/50",
      icon: "text-green-600 dark:text-green-400",
      text: "bg-gradient-to-r from-green-600 to-teal-600 bg-clip-text text-transparent dark:from-green-400 dark:to-teal-400",
      gradient: "rgba(34, 197, 94, 0.3)",
    },
    orange: {
      bg: "bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950 dark:to-orange-900",
      shadow: "hover:shadow-orange-200/50 dark:hover:shadow-orange-900/50",
      icon: "text-orange-600 dark:text-orange-400",
      text: "bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent dark:from-orange-400 dark:to-amber-400",
      gradient: "rgba(249, 115, 22, 0.3)",
    },
  };

  const StatCardNumber = ({
    title,
    value,
    icon: Icon,
    colorScheme,
  }: {
    title: string;
    value: number;
    icon: any;
    colorScheme: keyof typeof colorStyles;
  }) => {
    const styles = colorStyles[colorScheme];

    return (
      <MagicStatCard
        className={`${styles.bg} ${styles.shadow} transition-all duration-300 h-[175px]`}
        gradientColor={styles.gradient}
      >
        <div className="relative h-full">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Icon className={`h-4 w-4 ${styles.icon}`} />
              {title}
            </CardTitle>
            <Icon className={`h-5 w-5 ${styles.icon}`} />
          </CardHeader>
          <CardContent>
            <div
              className={`${
                i18n.dir() === "rtl" ? "text-right" : "text-left"
              } h-12`}
            >
              <span className={`text-4xl sm:text-5xl font-bold ${styles.text}`}>
                {value.toLocaleString()}
              </span>
            </div>
          </CardContent>
        </div>
      </MagicStatCard>
    );
  };

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      {/* Engagement Metrics */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <Activity className="h-6 w-6" />
          {t("engagement.title")}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Average Transactions per User */}
          <StatCardNumber
            title={t("engagement.avgTransactions")}
            value={parseFloat(engagement.avg_transactions_per_user.toFixed(1))}
            icon={BarChart3}
            colorScheme="purple"
          />

          {/* Total Transactions */}
          <StatCardNumber
            title={t("engagement.totalTransactions")}
            value={engagement.total_transactions}
            icon={Activity}
            colorScheme="blue"
          />

          {/* Users with Transactions */}
          <StatCardNumber
            title={t("engagement.usersWithTransactions")}
            value={engagement.users_with_transactions}
            icon={Users}
            colorScheme="green"
          />
        </div>
      </div>

      {/* System Info */}
      <div className="space-y-4">
        <h2 className="text-2xl font-semibold flex items-center gap-2">
          <RefreshCw className="h-6 w-6" />
          {t("system.title")}
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
          <StatCardNumber
            title={t("system.totalRecurring")}
            value={system.total_recurring_transactions}
            icon={RefreshCw}
            colorScheme="orange"
          />

          <StatCardNumber
            title={t("system.activeRecurring")}
            value={system.active_recurring_transactions}
            icon={RefreshCw}
            colorScheme="green"
          />
        </div>
      </div>
    </div>
  );
}
