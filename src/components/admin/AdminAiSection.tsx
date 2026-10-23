import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import {
  fetchAdminAiCounts,
  fetchAdminAiSpend,
  type AdminAiCounts,
  type AdminAiSpend,
} from "@/lib/data-layer/aiAdmin.service";

function money(value: number): string {
  return `$${value.toFixed(3)}`;
}

export function AdminAiSection() {
  const { t, i18n } = useTranslation("admin");
  const [counts, setCounts] = useState<AdminAiCounts | null>(null);
  const [countsFailed, setCountsFailed] = useState(false);
  const [spend, setSpend] = useState<AdminAiSpend | null>(null);
  const [spendReady, setSpendReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetchAdminAiCounts()
      .then((next) => {
        if (cancelled) return;
        if (next) setCounts(next);
        else setCountsFailed(true);
      })
      .catch(() => {
        if (!cancelled) setCountsFailed(true);
      });
    void fetchAdminAiSpend()
      .then((next) => {
        if (!cancelled) setSpend(next);
      })
      .catch(() => {
        if (!cancelled) setSpend(null);
      })
      .finally(() => {
        if (!cancelled) setSpendReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      <div>
        <h2 className="flex items-center gap-2 text-2xl font-semibold">
          <Sparkles className="h-6 w-6 text-primary" />
          {t("ai.title")}
        </h2>
        {counts ? (
          <p className="text-sm text-muted-foreground">{t("ai.range", { from: counts.from, to: counts.to })}</p>
        ) : null}
      </div>
      {counts ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <AdminMetricCard title={t("ai.committed")} value={counts.drafts.committed} icon={Sparkles} />
          <AdminMetricCard title={t("ai.rejected")} value={counts.drafts.rejected} icon={Sparkles} />
          <AdminMetricCard title={t("ai.reverted")} value={counts.drafts.reverted} icon={Sparkles} />
          <AdminMetricCard title={t("ai.questions")} value={counts.questions} icon={Sparkles} />
          <AdminMetricCard title={t("ai.receipts")} value={counts.receipt_links} icon={Sparkles} />
          <AdminMetricCard title={t("ai.rules")} value={counts.rules_active} icon={Sparkles} />
          <AdminMetricCard title={t("ai.originAi")} value={counts.origins.ai} icon={Sparkles} />
          <AdminMetricCard title={t("ai.originAuto")} value={counts.origins.ai_auto} icon={Sparkles} />
        </div>
      ) : countsFailed ? (
        <Alert variant="destructive">
          <AlertDescription>{t("ai.loadFailed")}</AlertDescription>
        </Alert>
      ) : (
        <Skeleton className="h-40" />
      )}
      <div>
        <h3 className="text-lg font-medium">{t("ai.spendTitle")}</h3>
        <p className="text-sm text-muted-foreground">{t("ai.spendMixed")}</p>
        {spendReady && spend?.available ? (
          <ul className="mt-2 space-y-1 text-sm">
            {spend.models.map((row) => (
              <li key={row.label}>
                {row.label}: {money(row.totalCost)} · {row.requestCount}
              </li>
            ))}
          </ul>
        ) : spendReady ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("ai.spendUnavailable")}</p>
        ) : (
          <Skeleton className="mt-2 h-8" />
        )}
      </div>
      {counts ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start">
                <th className="py-2">{t("ai.user")}</th>
                <th>{t("ai.drafts")}</th>
                <th>{t("ai.committed")}</th>
                <th>{t("ai.questions")}</th>
              </tr>
            </thead>
            <tbody>
              {counts.users.map((row) => (
                <tr key={row.email} className="border-t">
                  <td className="py-2">{row.email}</td>
                  <td>{row.drafts}</td>
                  <td>{row.committed}</td>
                  <td>{row.questions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}
