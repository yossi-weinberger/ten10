import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "@tanstack/react-router";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertCircle,
  Users,
  DollarSign,
  TrendingUp,
  Activity,
  Gauge,
} from "lucide-react";
import { usePlatform } from "@/contexts/PlatformContext";
import {
  fetchAdminDashboardStats,
  fetchAdminMonthlyTrends,
  fetchEarliestSystemDate,
  AdminDashboardStats,
  MonthlyTrend,
} from "@/lib/data-layer/admin.service";
import { AdminUsersSection } from "@/components/admin/AdminUsersSection";
import { AdminFinanceSection } from "@/components/admin/AdminFinanceSection";
import { AdminDownloadsSection } from "@/components/admin/AdminDownloadsSection";
import { AdminEngagementSection } from "@/components/admin/AdminEngagementSection";
import { AdminTrendsChart } from "@/components/admin/AdminTrendsChart";
import { AdminMonitoringSection } from "@/components/admin/AdminMonitoringSection";

export function AdminDashboardPage() {
  const { t, i18n } = useTranslation("admin");
  const { platform } = usePlatform();
  const navigate = useNavigate();
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [trends, setTrends] = useState<MonthlyTrend[] | null>(null);
  const [earliestDate, setEarliestDate] = useState<string>("2008-01-01");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Redirect if on desktop platform
  useEffect(() => {
    if (platform === "desktop") {
      navigate({ to: "/" });
    }
  }, [platform, navigate]);

  useEffect(() => {
    // Only load data if on web platform
    if (platform !== "web") {
      return;
    }

    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [statsData, trendsData, earliestDateData] = await Promise.all([
          fetchAdminDashboardStats(),
          fetchAdminMonthlyTrends(), // Will use default 12 months
          fetchEarliestSystemDate(),
        ]);

        if (!statsData) {
          throw new Error(t("errors.loadFailed"));
        }

        setStats(statsData);
        setTrends(trendsData);
        setEarliestDate(earliestDateData);
      } catch (err) {
        setError(err instanceof Error ? err.message : t("errors.loadFailed"));
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [platform, t]);

  // Don't render anything on desktop
  if (platform === "desktop") {
    return null;
  }

  if (loading) {
    return (
      <div className="container mx-auto p-4 sm:p-6 space-y-6">
        <Skeleton className="h-12 w-64" />
        <Skeleton className="h-10 w-full max-w-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="container mx-auto p-4 sm:p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error || t("errors.loadFailed")}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 sm:p-6 space-y-6" dir={i18n.dir()}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl sm:text-4xl font-bold flex items-center gap-3">
            <Activity className="h-8 w-8 sm:h-10 sm:w-10" />
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-2">{t("subtitle")}</p>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 lg:w-auto lg:inline-flex">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.users")}</span>
            <span className="sm:hidden">{t("tabs.usersShort")}</span>
          </TabsTrigger>
          <TabsTrigger value="finance" className="gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.finance")}</span>
            <span className="sm:hidden">{t("tabs.financeShort")}</span>
          </TabsTrigger>
          <TabsTrigger value="trends" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.trends")}</span>
            <span className="sm:hidden">{t("tabs.trendsShort")}</span>
          </TabsTrigger>
          <TabsTrigger value="downloads" className="gap-2">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">{t("tabs.downloads")}</span>
            <span className="sm:hidden">{t("tabs.downloadsShort")}</span>
          </TabsTrigger>
          <TabsTrigger value="monitoring" className="gap-2">
            <Gauge className="h-4 w-4" />
            <span className="hidden sm:inline">
              {t("tabs.monitoring", "Monitoring")}
            </span>
            <span className="sm:hidden">
              {t("tabs.monitoringShort", "Monitor")}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <AdminUsersSection stats={stats.users} />
          <AdminEngagementSection
            engagement={stats.engagement}
            system={stats.system}
          />
        </TabsContent>

        {/* Finance Tab */}
        <TabsContent value="finance" className="space-y-6">
          <AdminFinanceSection finance={stats.finance} />
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-6">
          {trends && trends.length > 0 ? (
            <AdminTrendsChart
              initialTrends={trends}
              earliestDate={earliestDate}
            />
          ) : (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{t("trends.noData")}</AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Downloads Tab */}
        <TabsContent value="downloads" className="space-y-6">
          <AdminDownloadsSection downloads={stats.downloads} />
        </TabsContent>

        {/* Monitoring Tab */}
        <TabsContent value="monitoring" className="space-y-6">
          <AdminMonitoringSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}
