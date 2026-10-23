import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon, Sparkles } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminAiCharts } from "@/components/admin/AdminAiCharts";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { useDateControls, type DateRangeSelectionType } from "@/hooks/useDateControls";
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
  const {
    dateRangeSelection,
    setDateRangeSelection,
    activeDateRangeObject,
    dateRangeLabels,
    customDateRange,
    setCustomDateRange,
  } = useDateControls();
  const [firstOn, setFirstOn] = useState<string | null>(null);
  const [counts, setCounts] = useState<AdminAiCounts | null>(null);
  const [countsFailed, setCountsFailed] = useState(false);
  const [countsKey, setCountsKey] = useState("");
  const [spend, setSpend] = useState<AdminAiSpend | null>(null);
  const [spendKey, setSpendKey] = useState("");

  const startDate = dateRangeSelection === "all" ? firstOn : activeDateRangeObject.startDate;
  const endDate = activeDateRangeObject.endDate;
  const rangeKey = startDate ? `${startDate}|${endDate}` : "";
  const countsCurrent = countsKey === rangeKey;
  const spendCurrent = spendKey === rangeKey;

  useEffect(() => {
    if (!startDate) return;
    const key = `${startDate}|${endDate}`;
    let cancelled = false;
    void fetchAdminAiCounts(startDate, endDate)
      .then((next) => {
        if (cancelled) return;
        setCountsKey(key);
        if (next) {
          setCounts(next);
          setCountsFailed(false);
          if (next.first_on) setFirstOn(next.first_on);
        } else {
          setCounts(null);
          setCountsFailed(true);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setCountsKey(key);
        setCounts(null);
        setCountsFailed(true);
      });
    void fetchAdminAiSpend(startDate, endDate)
      .then((next) => {
        if (cancelled) return;
        setSpend(next);
        setSpendKey(key);
      })
      .catch(() => {
        if (cancelled) return;
        setSpend(null);
        setSpendKey(key);
      });
    return () => {
      cancelled = true;
    };
  }, [startDate, endDate]);

  return (
    <div className="space-y-6" dir={i18n.dir()}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-2xl font-semibold">
            <Sparkles className="h-6 w-6 text-primary" />
            {t("ai.title")}
          </h2>
          <p className="text-sm text-muted-foreground">{t("ai.utc")}</p>
          {countsCurrent && counts ? (
            <p className="text-sm text-muted-foreground">{t("ai.range", { from: counts.from, to: counts.to })}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(["month", "year", "all"] as DateRangeSelectionType[]).map((type) => (
            <Button
              key={type}
              variant={dateRangeSelection === type ? "default" : "outline"}
              size="sm"
              onClick={() => setDateRangeSelection(type)}
              disabled={type === "all" && !firstOn}
            >
              {dateRangeLabels[type]}
            </Button>
          ))}
          <DatePickerWithRange
            align="end"
            date={customDateRange}
            onDateChange={(range) => {
              setCustomDateRange(range);
              if (range?.from) setDateRangeSelection("custom");
            }}
            triggerButton={
              <Button
                variant={dateRangeSelection === "custom" ? "default" : "outline"}
                size="sm"
                className="whitespace-nowrap"
              >
                <CalendarIcon className="h-4 w-4" />
                <span className="ms-2 hidden md:inline">{dateRangeLabels.custom}</span>
              </Button>
            }
          />
        </div>
      </div>
      {countsCurrent && counts ? (
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
      ) : countsCurrent && countsFailed ? (
        <Alert variant="destructive">
          <AlertDescription>{t("ai.loadFailed")}</AlertDescription>
        </Alert>
      ) : (
        <Skeleton className="h-40" />
      )}
      <div>
        <h3 className="text-lg font-medium">{t("ai.spendTitle")}</h3>
        {spendCurrent && spend?.available ? (
          <p className="text-sm text-muted-foreground">
            {spend.mixed ? t("ai.spendMixed") : t("ai.spendSplit", {
              app: money(spend.sources.app),
              eval: money(spend.sources.eval),
            })}
          </p>
        ) : null}
        {spendCurrent && spend?.available ? (
          <ul className="mt-2 space-y-1 text-sm">
            {spend.models.map((row) => (
              <li key={row.label}>
                {row.label}: {money(row.totalCost)} · {row.requestCount}
              </li>
            ))}
          </ul>
        ) : spendCurrent ? (
          <p className="mt-2 text-sm text-muted-foreground">{t("ai.spendUnavailable")}</p>
        ) : (
          <Skeleton className="mt-2 h-8" />
        )}
      </div>
      <AdminAiCharts counts={countsCurrent ? counts : null} spend={spendCurrent ? spend : null} />
      {countsCurrent && counts ? (
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
