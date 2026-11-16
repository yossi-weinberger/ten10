import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BASE_TYPE_ICON, BASE_TYPE_TINT } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import type { ReceiptFields } from "@/lib/ai/receipt-card";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import { formatCurrency } from "@/lib/utils/currency";
import { cn } from "@/lib/utils";
import { EASE_OUT_QUART } from "../assistant-motion";

const TYPES = ["expense", "income", "donation"] as const;

/** "Which type is this?" as chips. `compact`: smaller chips without the question, inside a list row that asks it. */
export function TypeChoice({
  receipt,
  disabled,
  compact = false,
  onChoose,
}: {
  receipt: ReceiptFields | null;
  disabled: boolean;
  compact?: boolean;
  onChoose: (type: TextTransactionDraft["type"]) => void;
}) {
  const { t, i18n } = useTranslation("navigation");
  const reduce = useReducedMotion();
  const formatDisplayDate = useDisplayDate();
  const locale = i18n.language.toLowerCase().startsWith("en") ? "en" : "he";
  const chips = (
    // Chips, not tiles: one short row that fits a 320px phone.
    <div className={cn("flex flex-wrap", compact ? "gap-1.5" : "gap-2")}>
      {TYPES.map((type) => {
        const Icon = BASE_TYPE_ICON[type];
        return (
          <motion.button
            key={type}
            type="button"
            disabled={disabled}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            transition={{ duration: 0.15, ease: EASE_OUT_QUART }}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full border bg-card pe-3 ps-1 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
              compact ? "h-7" : "h-8",
            )}
            onClick={() => onChoose(type)}
          >
            <span className={cn("inline-flex items-center justify-center rounded-full", compact ? "size-5" : "size-6", BASE_TYPE_TINT[type])}>
              <Icon className="size-3.5" aria-hidden />
            </span>
            {t(`aiIntake.types.${type}`)}
          </motion.button>
        );
      })}
    </div>
  );
  if (compact) return chips;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{t("aiIntake.askType")}</p>
      {receipt ? (
        <Item size="sm" className="ph-mask ph-sensitive" data-ph-mask="">
          <ItemContent>
            <ItemTitle>{receipt.description}</ItemTitle>
            <ItemDescription>
              <bdi>{formatCurrency(receipt.amount, receipt.currency, locale)}</bdi>
              {receipt.date ? <>{" · "}<bdi>{formatDisplayDate(receipt.date, "numeric").primary}</bdi></> : null}
            </ItemDescription>
          </ItemContent>
        </Item>
      ) : null}
      {chips}
    </div>
  );
}
