import type { LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { STATUS_MESSAGES, type StatusKey } from "../assistant-reply-view";
import { TONE_CLASS, TONE_ICON } from "./card-style";
import type { LimitInfo } from "@/lib/ai/limit-reason";
import { computeLimitReset, formatDailyResetTime, formatMonthlyResetDate } from "@/lib/ai/compute-limit-reset";

export function StatusNote({ status, limitInfo }: { status: StatusKey; limitInfo?: LimitInfo | null }) {
  const { t, i18n } = useTranslation(["navigation", "transactions"]);
  const message = STATUS_MESSAGES[status];
  const Icon: LucideIcon = TONE_ICON[message.tone];
  const namespace = "ns" in message ? message.ns : undefined;

  const key = message.key;
  const computeValues = (): Record<string, string> => {
    if (!limitInfo) return {};
    const resetDate = computeLimitReset(limitInfo.kind);
    if (status === "limitDailyLimit" && resetDate) {
      const time = formatDailyResetTime(resetDate, i18n.language);
      return { time };
    }
    if (status === "limitQuotaExhausted" && resetDate) {
      const date = formatMonthlyResetDate(resetDate, i18n.language);
      return { date };
    }
    return {};
  };
  const values = computeValues();

  return (
    <p className={`flex items-start gap-2 text-sm ${TONE_CLASS[message.tone]}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{t(key, { ns: namespace, ...values })}</span>
    </p>
  );
}
