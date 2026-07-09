import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { ImportSummary, ImportIssueCode } from "@/lib/import/import-session.types";
import { useDonationStore } from "@/lib/store";

function fmtAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("he-IL", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
      minimumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${currency} ${amount}`;
  }
}

function fmtDate(isoDate: string | null): string {
  if (!isoDate) return "";
  const parts = isoDate.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return isoDate;
}

interface ImportReviewSummaryProps {
  summary: ImportSummary;
}

export function ImportReviewSummary({ summary }: ImportReviewSummaryProps) {
  const { t } = useTranslation("import");
  const defaultCurrency = useDonationStore((s) => s.settings.defaultCurrency);

  const fmt = (amount: number) => fmtAmount(amount, defaultCurrency);

  // All issue codes that have at least one occurrence
  const issueCodesToShow = (Object.entries(summary.issueCounts) as [ImportIssueCode, number][])
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {/* Row counts */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("review.summary.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-1.5 text-sm">
            <SummaryRow label={t("review.summary.totalRows")} value={summary.total} />
            <SummaryRow
              label={t("review.summary.readyRows")}
              value={summary.ready}
              badge="default"
            />
            {summary.needsReview > 0 && (
              <>
                <SummaryRow
                  label={t("review.summary.needsReviewRows")}
                  value={summary.needsReview}
                  badge="secondary"
                />
                {issueCodesToShow.length > 0 && (
                  <div className="ps-4 text-xs text-muted-foreground space-y-0.5 border-s-2 border-border ms-1">
                    {issueCodesToShow.map(([code, count]) => (
                      <div key={code} className="flex justify-between gap-2">
                        <span className="truncate">
                          ↳ {t(`issues.${code}`, { field: "", currency: "", defaultValue: code })}
                        </span>
                        <span className="tabular-nums shrink-0">{count}</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {summary.invalid > 0 && (
              <SummaryRow
                label={t("review.summary.invalidRows")}
                value={summary.invalid}
                badge="destructive"
              />
            )}
            <div className="border-t border-border pt-1.5 mt-1.5">
              <SummaryRow
                label={t("review.summary.approvedRows")}
                value={summary.approved}
                bold
              />
            </div>
          </dl>
        </CardContent>
      </Card>

      {/* Financial impact */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t("review.financial.title")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="space-y-1.5 text-sm">
            {summary.dateRangeMin && summary.dateRangeMax && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t("review.financial.dateRange")}</dt>
                <dd className="font-medium text-end" dir="ltr">
                  {summary.dateRangeMin === summary.dateRangeMax
                    ? fmtDate(summary.dateRangeMin)
                    : `${fmtDate(summary.dateRangeMin)} – ${fmtDate(summary.dateRangeMax)}`}
                </dd>
              </div>
            )}
            {summary.approvedIncome > 0 && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t("review.financial.totalIncome")}</dt>
                <dd
                  className="ph-mask font-medium text-green-600 dark:text-green-400 text-end"
                  data-ph-mask
                  dir="ltr"
                >
                  {fmt(summary.approvedIncome)}
                </dd>
              </div>
            )}
            {summary.approvedExpenses > 0 && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t("review.financial.totalExpenses")}</dt>
                <dd
                  className="ph-mask font-medium text-red-600 dark:text-red-400 text-end"
                  data-ph-mask
                  dir="ltr"
                >
                  {fmt(summary.approvedExpenses)}
                </dd>
              </div>
            )}
            {summary.approvedDonations > 0 && (
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{t("review.financial.totalDonations")}</dt>
                <dd className="ph-mask font-medium text-end" data-ph-mask dir="ltr">
                  {fmt(summary.approvedDonations)}
                </dd>
              </div>
            )}
            {summary.approved === 0 && (
              <p className="text-muted-foreground text-sm">{t("review.noRows")}</p>
            )}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

interface SummaryRowProps {
  label: string;
  value: number;
  badge?: "default" | "secondary" | "destructive";
  bold?: boolean;
}

function SummaryRow({ label, value, badge, bold }: SummaryRowProps) {
  return (
    <div className="flex justify-between items-center gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>
        {badge ? (
          <Badge variant={badge} className="tabular-nums">
            {value}
          </Badge>
        ) : (
          <span className={bold ? "font-semibold" : "font-medium"}>{value}</span>
        )}
      </dd>
    </div>
  );
}
