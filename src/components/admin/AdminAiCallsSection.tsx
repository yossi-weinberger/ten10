import { useTranslation } from "react-i18next";
import { MetricWithTooltip } from "@/components/admin/monitoring/AdminMonitoringComponents";
import { compareDailyCost } from "@/lib/admin/ai-cost-compare";
import type { AdminAiCalls, AdminAiSpend } from "@/lib/data-layer/aiAdmin.service";

const OPERATIONS = ["intent", "question_slots", "receipt", "speech", "duplicates", "shadow"] as const;

function dollars(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 5,
    maximumFractionDigits: 5,
  }).format(value);
}

function percent(part: number, whole: number): string {
  return whole > 0 ? `${Math.round((part / whole) * 100)}%` : "0%";
}

export function AdminAiCallsSection({
  calls,
  spend,
}: {
  calls: AdminAiCalls;
  spend: AdminAiSpend | null;
}) {
  const { t } = useTranslation("admin");
  const operationLabel = (operation: string) => (
    (OPERATIONS as readonly string[]).includes(operation) ? t(`ai.calls.operations.${operation}`) : operation
  );
  const comparison = spend?.available
    ? compareDailyCost(spend.appDays, calls.days, calls.first_on)
    : [];

  return (
    <section className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">{t("ai.calls.title")}</h3>
        <p className="text-sm text-muted-foreground">
          {calls.first_on ? t("ai.calls.hint", { from: calls.first_on }) : t("ai.calls.none")}
        </p>
      </div>
      {calls.operations.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start">
                <th className="py-2">{t("ai.calls.operation")}</th>
                <th>{t("ai.calls.count")}</th>
                <th><MetricWithTooltip label={t("ai.calls.failed")} tooltip={t("ai.calls.tips.failed")} /></th>
                <th>p50</th>
                <th>p95</th>
                <th>{t("ai.calls.tokens")}</th>
                <th>{t("ai.calls.cost")}</th>
              </tr>
            </thead>
            <tbody>
              {calls.operations.map((row) => (
                <tr key={row.operation} className="border-t">
                  <td className="py-2">{operationLabel(row.operation)}</td>
                  <td className="tabular-nums">{row.calls}</td>
                  <td className="tabular-nums">
                    {percent(row.failed, row.calls)}
                    {row.top_error ? <span className="ms-1 text-xs text-muted-foreground">({row.top_error})</span> : null}
                  </td>
                  <td className="tabular-nums">{t("ai.calls.ms", { value: row.p50_ms })}</td>
                  <td className="tabular-nums">{t("ai.calls.ms", { value: row.p95_ms })}</td>
                  <td className="tabular-nums">{row.input_tokens + row.output_tokens}</td>
                  <td className="tabular-nums">{dollars(Number(row.cost_usd))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
      {comparison.length > 0 ? (
        <div className="space-y-2">
          <h4 className="font-medium">
            <MetricWithTooltip label={t("ai.calls.compareTitle")} tooltip={t("ai.calls.tips.compare")} />
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-start">
                  <th className="py-2">{t("ai.calls.day")}</th>
                  <th>{t("ai.calls.gateway")}</th>
                  <th>{t("ai.calls.recorded")}</th>
                  <th>{t("ai.calls.diff")}</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((row) => (
                  <tr key={row.day} className="border-t">
                    <td className="py-2 tabular-nums">{row.day}</td>
                    <td className="tabular-nums">{dollars(row.gateway)}</td>
                    <td className="tabular-nums">{dollars(row.recorded)}</td>
                    <td className="tabular-nums">{dollars(row.diff)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
      {calls.users.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-start">
                <th className="py-2">{t("ai.user")}</th>
                <th>{t("ai.calls.count")}</th>
                <th>{t("ai.calls.failed")}</th>
                <th>{t("ai.calls.cost")}</th>
              </tr>
            </thead>
            <tbody>
              {calls.users.map((row) => (
                <tr key={row.email} className="border-t">
                  <td className="py-2">{row.email}</td>
                  <td className="tabular-nums">{row.calls}</td>
                  <td className="tabular-nums">{row.failed}</td>
                  <td className="tabular-nums">{dollars(Number(row.cost_usd))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
