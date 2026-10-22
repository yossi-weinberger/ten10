import { Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import CountUp from "react-countup";
import { useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import { formatDataAnswer } from "@/lib/ai/format-data-answer";
import { periodLabel } from "@/lib/ai/classify-intake";
import { useDonationStore } from "@/lib/store";
import type { CurrencyCode } from "@/lib/currencies";
import { formatCurrency } from "@/lib/utils/currency";
import type { ReadyDataReply, StatusKey } from "../assistant-reply-view";
import { StatusNote } from "./StatusNote";

function hebrewPeriodPhrase(label: string, language: string): string {
  if (language.toLowerCase().startsWith("en")) return label;
  return /^\d/.test(label) ? `ב-${label}` : `ב${label}`;
}

const DATA_NOTICE_STATUS = {
  unsupported: "dataUnsupported",
  mixed: "dataMixed",
  failed: "dataFailed",
} as const satisfies Record<"unsupported" | "mixed" | "failed", StatusKey>;

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

  return (
    <div className="flex flex-col gap-1">
      <p className="text-2xl font-semibold tabular-nums" dir="ltr">
        {reply.measure === "count" ? (
          reduce ? reply.count : <CountUp end={reply.count} duration={0.6} preserveValue />
        ) : (
          <>
            {reduce ? amountLabel : (
              <>
                <CountUp
                  end={reply.total}
                  duration={0.6}
                  preserveValue
                  decimals={Number.isInteger(reply.total) ? 0 : 2}
                />
                {symbol ? ` ${symbol}` : ""}
              </>
            )}
          </>
        )}
      </p>
      <p className="text-sm leading-relaxed">
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
      <p className="text-xs text-muted-foreground">{from} – {to}</p>
    </div>
  );
}

export function NameMissing({
  nameKind,
  topic,
  interactive,
  onSearch,
}: {
  nameKind: "category" | "recipient";
  topic: string;
  interactive: boolean;
  onSearch: () => void;
}) {
  const { t } = useTranslation("navigation");
  return (
    <div className="flex flex-col items-start gap-2">
      <p className="text-sm">
        {t(nameKind === "recipient" ? "aiIntake.recipientMissing" : "aiIntake.categoryMissing", { topic })}
      </p>
      {interactive ? (
        <Button type="button" variant="outline" size="sm" className="w-fit" onClick={onSearch}>
          <Search aria-hidden />
          {t("aiIntake.categorySearch")}
        </Button>
      ) : null}
    </div>
  );
}

export function DataNotice({ status }: { status: "unsupported" | "mixed" | "failed" }) {
  return <StatusNote status={DATA_NOTICE_STATUS[status]} />;
}
