import { HandCoins, Repeat, Search } from "lucide-react";
import {
  BASE_TYPE_ICON,
  BASE_TYPE_SURFACE,
  BASE_TYPE_TINT,
  baseTypeOf,
} from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import { cn } from "@/lib/utils";
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
import { KIND_TINT } from "./card-style";
import { KindTag } from "./KindTag";
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
  const { t, i18n } = useTranslation("navigation");
  const formatDisplayDate = useDisplayDate();
  const defaultCurrency = useDonationStore((state) => state.settings.defaultCurrency);
  const language = i18n.language.toLowerCase().startsWith("en") ? "en" : "he";
  const from = formatDisplayDate(reply.from).primary;
  const to = formatDisplayDate(reply.to).primary;

  const reduce = useReducedMotion();
  const amountLabel = formatCurrency(reply.total, (reply.currency ?? defaultCurrency) as CurrencyCode, language);
  const symbol = amountLabel.replace(/[0-9.,\s]/g, "");
  // The same decimals as the sentence below, which formatCurrency writes (6,289.10, not 6,289.1).
  const digits = currencyFractionDigits(reply.total);
  const Icon = BASE_TYPE_ICON[reply.type];

  return (
    <Card className="grid gap-1 p-2.5 ph-mask ph-sensitive" data-ph-mask="">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <KindTag icon={Icon} tint={BASE_TYPE_TINT[reply.type]}>{t(`aiIntake.typesPlural.${reply.type}`)}</KindTag>
        <span className="ms-auto text-xs text-muted-foreground" dir="auto">{from} – {to}</span>
      </div>
      {/* The number reads left to right but sits at the start of the card in either language. */}
      <p className="text-2xl font-semibold leading-tight tabular-nums">
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
      <p className="text-xs leading-relaxed text-muted-foreground">
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
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">
        {t(nameKind === "recipient" ? "aiIntake.recipientMissing" : "aiIntake.categoryMissing", { topic: "" })}
        <span className="ph-mask ph-sensitive" data-ph-mask="">{topic}</span>
      </p>
      {interactive ? (
        <div className="flex flex-wrap gap-2">
          {suggestions.map((name) => (
            <Button key={name} type="button" variant="outline" size="sm" className="h-auto min-h-8 max-w-full whitespace-normal break-words rounded-full py-1.5 text-start ph-mask ph-sensitive" data-ph-mask="" onClick={() => onChooseName(name)}>
              {name}
            </Button>
          ))}
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onAllInPeriod}>
            {t(`aiIntake.allInPeriod.${family}`)}
          </Button>
          <Button type="button" variant="outline" size="sm" className="rounded-full" onClick={onSearch}>
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
    <Card className="grid gap-1 p-2.5 ph-mask ph-sensitive" data-ph-mask="">
      <div className="flex">
        <KindTag icon={HandCoins} tint={BASE_TYPE_TINT.donation}>{t("aiIntake.balance.title")}</KindTag>
      </div>
      {balance.total > 0 ? (
        <p className="text-2xl font-semibold leading-tight tabular-nums">{money(balance.total)}</p>
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
    <Card className="grid gap-2 p-2.5 ph-mask ph-sensitive" data-ph-mask="">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <KindTag icon={Repeat} tint={KIND_TINT.neutral}>{t("aiIntake.standingOrders.tag")}</KindTag>
        <span className="text-xs text-muted-foreground">
          {rows.length === 0 ? t("aiIntake.standingOrders.none") : t("aiIntake.standingOrders.active", { count: rows.length })}
        </span>
      </div>
      {rows.length > 0 ? (
        <ul className="grid gap-1 text-sm">
          {rows.slice(0, 5).map((row) => (
            // Each order is tinted by its type, like a transaction.
            <li key={row.id} className={cn("flex justify-between gap-2 rounded-md px-2 py-1.5", BASE_TYPE_SURFACE[baseTypeOf(row.type)])}>
              <span className="truncate">{row.description}</span>
              <span className="tabular-nums">
                <bdi>{formatCurrency(row.amount, row.currency as CurrencyCode, i18n.language)}</bdi>
              </span>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex justify-end">
        <Button asChild variant="outline" size="sm">
          <Link to="/transactions-table/recurring-transactions">{t("aiIntake.standingOrders.open")}</Link>
        </Button>
      </div>
    </Card>
  );
}
