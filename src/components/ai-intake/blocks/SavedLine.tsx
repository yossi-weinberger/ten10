import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { STATUS_MESSAGES, type StatusKey } from "../assistant-reply-view";
import { TONE_CLASS, TONE_ICON } from "./card-style";

/** What a saved card shows on its last line. The thread fills it from the turn's status, undo and receipt blocks. */
export interface SavedFooter {
  status: StatusKey | null;
  onOpenReceipt?: () => void;
  onUndo?: () => void;
  undoing?: boolean;
}

/** A saved card's last line: the status, then the card's links. "Saved" and its undo share this one row. */
export function SavedLine({ status, icon, children }: { status: StatusKey; icon?: ReactNode; children?: ReactNode }) {
  const { t } = useTranslation(["navigation", "transactions"]);
  const message = STATUS_MESSAGES[status];
  const Icon = TONE_ICON[message.tone];
  const namespace = "ns" in message ? message.ns : undefined;
  return (
    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-foreground/10 pt-2 text-xs">
      <span className={cn("inline-flex items-center gap-1 font-medium", TONE_CLASS[message.tone])}>
        {message.tone === "success" && icon ? icon : <Icon className="size-3.5 shrink-0" aria-hidden />}
        {t(message.key, { ns: namespace })}
      </span>
      {children}
    </div>
  );
}
