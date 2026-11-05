import { HandCoins, Search } from "lucide-react";
import { BASE_TYPE_ICON, BASE_TYPE_TINT } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import { useTranslation } from "react-i18next";
import CountUp from "react-countup";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import { formatDataAnswer } from "@/lib/ai/format-data-answer";
import { periodLabel } from "@/lib/ai/classify-intake";
import { useDonationStore } from "@/lib/store";
import type { CurrencyCode } from "@/lib/currencies";
import { currencyFractionDigits, formatCurrency } from "@/lib/utils/currency";
import type { ReadyDataReply, StatusKey } from "../assistant-reply-view";
import type { BalanceAnswer, StandingOrderRow } from "@/lib/ai/assistant-extras";
import { Link } from "@tanstack/react-router";
import { StatusNote } from "./StatusNote";

function hebrewPeriodPhrase(label: string, language: string): string {
  if (language.toLowerCase().startsWith("en")) return label;
  return /^\d/.test(label) ? `ב-${label}` : `ב${label}`;
}

const DATA_NOTICE_STATUS = {
  unsupported: "dataUnsupported",
  mixed: "dataMixed",
  failed: "dataFailed",
  period_missing: "askPeriod",
} as const satisfies Record<"unsupported" | "mixed" | "failed" | "period_missing", StatusKey>;

export function DataAnswer({
  reply,
  questionCalendar,
}: {
  reply: ReadyDataReply;
  questionCalendar: "hebrew" | "gregorian";
}) {
  const { i18n } = useTranslation("navigation");
  const formatDisplayDate = useDisplayDate();
  const defaultCurrency = useDonationStore((state) => state.settings.defaultCurrency);
  const language = i18n.language.toLowerCase().startsWith("en") ? "en" : "he";
  const from = formatDisplayDate(reply.from).primary;
  const to = formatDisplayDate(reply.to).primary;

  const reduce = useReducedMotion();
  const amountLabel = formatCurrency(reply.total, (reply.currency ?? defaultCurrency) as CurrencyCode, language);
  const symbol = amountLabel.replace(/[0-9.,\s]/g, "");
  // The same decimals as the sentence below, which formatCurrency writes (6,289.1, not 6,289.10).
  const digits = currencyFractionDigits(reply.total);
  const Icon = BASE_TYPE_ICON[reply.type];

  return (
    <Card className="flex flex-col gap-1 p-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`inline-flex size-6 items-center justify-center rounded-full text-foreground ${BASE_TYPE_TINT[reply.type]}`}>
          <Icon className="size-3.5" aria-hidden />
        </span>
        <span dir="auto">{from} – {to}</span>
      </p>
      {/* The number reads left to right but sits at the start of the card in either language. */}
      <p className="text-3xl font-semibold tabular-nums">
        <span dir="ltr">
        {reply.measure === "count" ? (
          reduce ? reply.count : <CountUp end={reply.count} duration={0.6} preserveValue />
        ) : (
          <>
            {reduce ? new Intl.NumberFormat("en", {
              minimumFractionDigits: digits,
              maximumFractionDigits: digits,
            }).format(reply.total) : (
              <CountUp
                end={reply.total}
                duration={0.6}
                preserveValue
                decimals={digits}
              />
            )}
            {symbol ? ` ${symbol}` : ""}
          </>
        )}
        </span>
      </p>
      <p className="text-sm leading-relaxed text-muted-foreground">
        {formatDataAnswer({
          measure: reply.measure,
          count: reply.count,
          year: hebrewPeriodPhrase(periodLabel(reply, questionCalendar, i18n.language), i18n.language),
          type: reply.type,
          amount: amountLabel,
          paymentMethod: reply.paymentMethod,
          recipient: reply.recipient,
          category: reply.category,
          language: i18n.language,
        })}
      </p>
    </Card>
  );
}

export function NameMissing({
  nameKind,
  topic,
  family,
  suggestions,
  interactive,
  onSearch,
  onChooseName,
  onAllInPeriod,
}: {
  nameKind: "category" | "recipient";
  topic: string;
  family: "donation" | "expense" | "income";
  suggestions: string[];
  interactive: boolean;
  onSearch: () => void;
  onChooseName: (name: string) => void;
  onAllInPeriod: () => void;
}) {
  const { t } = useTranslation("navigation");
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm">
        {t(nameKind === "recipient" ? "aiIntake.recipientMissing" : "aiIntake.categoryMissing", { topic })}
      </p>
      {interactive ? (
        <div className="flex flex-col items-start gap-2">
          {suggestions.map((name) => (
            <Button key={name} type="button" variant="outline" size="sm" className="h-auto min-h-8 max-w-full whitespace-normal break-words py-1.5 text-start" onClick={() => onChooseName(name)}>
              {name}
            </Button>
          ))}
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onAllInPeriod}>
            {t(`aiIntake.allInPeriod.${family}`)}
          </Button>
          <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onSearch}>
            <Search aria-hidden />
            {t("aiIntake.categorySearch")}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export function DataNotice({ status }: { status: "unsupported" | "mixed" | "failed" | "period_missing" }) {
  return <StatusNote status={DATA_NOTICE_STATUS[status]} />;
}

/** The dashboard's tithe balance, in the default currency. */
export function BalanceAnswerCard({ balance }: { balance: BalanceAnswer }) {
  const { t, i18n } = useTranslation("navigation");
  const defaultCurrency = useDonationStore((state) => state.settings.defaultCurrency);
  const money = (value: number) => formatCurrency(value, defaultCurrency as CurrencyCode, i18n.language);
  return (
    <Card className="grid gap-1 p-3">
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={`inline-flex size-6 items-center justify-center rounded-full text-foreground ${BASE_TYPE_TINT.donation}`}>
          <HandCoins className="size-3.5" aria-hidden />
        </span>
        {t("aiIntake.balance.title")}
      </p>
      {balance.total > 0 ? (
        <p className="text-3xl font-semibold tabular-nums">{money(balance.total)}</p>
      ) : (
        <p className="text-sm">{t("aiIntake.balance.done")}</p>
      )}
      {balance.chomesh !== 0 ? (
        <p className="text-xs text-muted-foreground">
          {t("aiIntake.balance.maaser")}: {money(balance.maaser)} · {t("aiIntake.balance.chomesh")}: {money(balance.chomesh)}
        </p>
      ) : null}
    </Card>
  );
}

/** Active standing orders, with a link to the table. */
export function StandingOrdersCard({ rows }: { rows: StandingOrderRow[] }) {
  const { t, i18n } = useTranslation("navigation");
  return (
    <Card className="grid gap-2 p-3">
      <p className="text-sm">
        {rows.length === 0 ? t("aiIntake.standingOrders.none") : t("aiIntake.standingOrders.count", { count: rows.length })}
      </p>
      {rows.length > 0 ? (
        <ul className="grid divide-y text-sm">
          {rows.slice(0, 5).map((row) => (
            <li key={row.id} className="flex justify-between gap-2 py-1.5">
              <span className="truncate">{row.description}</span>
              <span className="tabular-nums">{formatCurrency(row.amount, row.currency as CurrencyCode, i18n.language)}</span>
            </li>
          ))}
        </ul>
      ) : null}
      <Button asChild variant="outline" size="sm" className="w-fit">
        <Link to="/transactions-table/recurring-transactions">{t("aiIntake.standingOrders.open")}</Link>
      </Button>
    </Card>
  );
}
