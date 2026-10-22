import type { LucideIcon } from "lucide-react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { STATUS_MESSAGES, type StatusKey } from "../assistant-reply-view";

const TONE_ICON = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
} as const;

const TONE_CLASS = {
  success: "text-success",
  error: "text-destructive",
  info: "text-muted-foreground",
} as const;

export function StatusNote({ status }: { status: StatusKey }) {
  const { t } = useTranslation(["navigation", "transactions"]);
  const message = STATUS_MESSAGES[status];
  const Icon: LucideIcon = TONE_ICON[message.tone];
  const namespace = "ns" in message ? message.ns : undefined;
  return (
    <p className={`flex items-start gap-2 text-sm ${TONE_CLASS[message.tone]}`}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{t(message.key, { ns: namespace })}</span>
    </p>
  );
}
