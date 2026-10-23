import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Calendar as CalendarIcon, Check, FileText, Image, MessageSquare, MessagesSquare, Mic, Sparkles, Undo2, Wallet, X, Zap } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { DatePickerWithRange } from "@/components/ui/date-range-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminAiCharts } from "@/components/admin/AdminAiCharts";
import { AdminAiSourceSplit, AdminAiSpendCards } from "@/components/admin/AdminAiSpendCards";
import { AdminMetricCard } from "@/components/admin/AdminMetricCard";
import { MetricWithTooltip } from "@/components/admin/monitoring/AdminMonitoringComponents";
import { useDateControls, type DateRangeSelectionType } from "@/hooks/useDateControls";
import { intakeFunnel, shareOfCreated } from "@/lib/admin/ai-intake-funnel";
import {
  fetchAdminAiCounts,
  fetchAdminAiSpend,
  type AdminAiCounts,
  type AdminAiSpend,
} from "@/lib/data-layer/aiAdmin.service";

function kindCount(counts: AdminAiCounts, kind: string): number {
  return Number(counts.messages_by_kind[kind] ?? 0);
}

function CountGroup({
  title,
  hint,
  children,
  stacked = false,
}: {
  title: string;
  hint: string;
  children: ReactNode;
  stacked?: boolean;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-medium">{title}</h3>
        <p className="text-sm text-muted-foreground">{hint}</p>
      </div>
      <div className={stacked ? "grid max-w-xl grid-cols-1 gap-3" : "grid grid-cols-2 gap-4 lg:grid-cols-4"}>
        {children}
      </div>
    </section>
  );
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
  const funnel = countsCurrent && counts ? intakeFunnel(counts.drafts, counts.origins) : null;

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
        <div className="space-y-8">
          {funnel ? (
            <CountGroup title={t("ai.transactionsTitle")} hint={t("ai.transactionsHint")} stacked>
              <AdminMetricCard title={t("ai.funnelCreated")} value={funnel.created} icon={Sparkles} subtitle={t("ai.share", { percent: shareOfCreated(funnel.created, funnel.created) })} />
              <AdminMetricCard title={t("ai.funnelOpen")} value={funnel.open} icon={FileText} subtitle={t("ai.share", { percent: shareOfCreated(funnel.open, funnel.created) })} tooltip={t("ai.tips.funnelOpen")} />
              <AdminMetricCard title={t("ai.funnelRejected")} value={funnel.rejected} icon={X} subtitle={t("ai.share", { percent: shareOfCreated(funnel.rejected, funnel.created) })} tooltip={t("ai.tips.rejected")} />
              <AdminMetricCard title={t("ai.funnelSaved")} value={funnel.saved} icon={Check} subtitle={t("ai.share", { percent: shareOfCreated(funnel.saved, funnel.created) })} tooltip={t("ai.tips.funnelSaved")} />
              <AdminMetricCard title={t("ai.funnelUndone")} value={funnel.undone} icon={Undo2} subtitle={t("ai.share", { percent: shareOfCreated(funnel.undone, funnel.created) })} tooltip={t("ai.tips.reverted")} />
              <AdminMetricCard title={t("ai.funnelKept")} value={funnel.kept} icon={Wallet} subtitle={t("ai.share", { percent: shareOfCreated(funnel.kept, funnel.created) })} />
              <AdminMetricCard title={t("ai.funnelExisting")} value={funnel.existing} icon={Wallet} subtitle={t("ai.share", { percent: shareOfCreated(funnel.existing, funnel.created) })} tooltip={t("ai.tips.funnelExisting")} />
              <AdminMetricCard title={t("ai.funnelAuto")} value={funnel.auto} icon={Zap} subtitle={t("ai.share", { percent: shareOfCreated(funnel.auto, funnel.created) })} tooltip={t("ai.tips.originAuto")} />
            </CountGroup>
          ) : null}
          <CountGroup title={t("ai.messagesTitle")} hint={t("ai.messagesHint")}>
            <AdminMetricCard
              title={t("ai.messagesTotal")}
              value={Object.values(counts.messages_by_kind).reduce((sum, count) => sum + Number(count), 0)}
              icon={MessagesSquare}
              tooltip={t("ai.tips.messagesTotal")}
            />
            <AdminMetricCard title={t("ai.inputText")} value={kindCount(counts, "text")} icon={MessageSquare} tooltip={t("ai.tips.inputText")} />
            <AdminMetricCard title={t("ai.inputImage")} value={kindCount(counts, "image")} icon={Image} tooltip={t("ai.tips.inputImage")} />
            <AdminMetricCard title={t("ai.inputPdf")} value={kindCount(counts, "pdf")} icon={FileText} tooltip={t("ai.tips.inputPdf")} />
            <AdminMetricCard title={t("ai.inputSpeech")} value={kindCount(counts, "audio")} icon={Mic} tooltip={t("ai.tips.inputSpeech")} />
          </CountGroup>
          <CountGroup title={t("ai.otherTitle")} hint={t("ai.range", { from: counts.from, to: counts.to })}>
            <AdminMetricCard title={t("ai.questions")} value={counts.questions} icon={Sparkles} tooltip={t("ai.tips.questions")} />
            <AdminMetricCard title={t("ai.receipts")} value={counts.receipt_links} icon={FileText} tooltip={t("ai.tips.receipts")} />
            <AdminMetricCard title={t("ai.rules")} value={counts.rules_active} icon={Check} tooltip={t("ai.tips.rules")} />
          </CountGroup>
        </div>
      ) : countsCurrent && countsFailed ? (
        <Alert variant="destructive">
          <AlertDescription>{t("ai.loadFailed")}</AlertDescription>
        </Alert>
      ) : (
        <Skeleton className="h-40" />
      )}
      <section className="space-y-3">
        <h3 className="text-lg font-medium">{t("ai.spendTitle")}</h3>
        {spendCurrent && spend?.available ? (
          <div className="space-y-3">
            {spend.mixed ? (
              <p className="text-sm text-muted-foreground">{t("ai.spendMixed")}</p>
            ) : (
              <AdminAiSourceSplit
                app={spend.sources.app}
                evalCost={spend.sources.eval}
                appLabel={t("ai.spendApp")}
                evalLabel={t("ai.spendEval")}
                appTooltip={t("ai.tips.app")}
                evalTooltip={t("ai.tips.eval")}
              />
            )}
            <AdminAiSpendCards
              models={spend.models}
              requestsLabel={(count) => count === 1 ? t("ai.requestOne") : t("ai.requestMany", { count })}
            />
          </div>
        ) : spendCurrent ? (
          <p className="text-sm text-muted-foreground">{t("ai.spendUnavailable")}</p>
        ) : (
          <Skeleton className="h-24" />
        )}
      </section>
      <AdminAiCharts counts={countsCurrent ? counts : null} spend={spendCurrent ? spend : null} />
      {countsCurrent && counts ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start">
                <th className="py-2">{t("ai.user")}</th>
                <th><MetricWithTooltip label={t("ai.drafts")} tooltip={t("ai.tips.drafts")} /></th>
                <th><MetricWithTooltip label={t("ai.committed")} tooltip={t("ai.tips.committed")} /></th>
                <th><MetricWithTooltip label={t("ai.questions")} tooltip={t("ai.tips.questions")} /></th>
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
