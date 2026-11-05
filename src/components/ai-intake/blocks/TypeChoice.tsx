import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BASE_TYPE_ICON, BASE_TYPE_TINT } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import type { ReceiptFields } from "@/lib/ai/receipt-card";
import { useDisplayDate } from "@/lib/calendar/use-display-date";
import { formatCurrency } from "@/lib/utils/currency";
import { EASE_OUT_QUART } from "../assistant-motion";

const TYPES = ["expense", "income", "donation"] as const;

export function TypeChoice({
  receipt,
  disabled,
  onChoose,
}: {
  receipt: ReceiptFields | null;
  disabled: boolean;
  onChoose: (type: TextTransactionDraft["type"]) => void;
}) {
  const { t, i18n } = useTranslation("navigation");
  const reduce = useReducedMotion();
  const formatDisplayDate = useDisplayDate();
  const locale = i18n.language.toLowerCase().startsWith("en") ? "en" : "he";
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{t("aiIntake.askType")}</p>
      {receipt ? (
        <Item size="sm">
          <ItemContent>
            <ItemTitle>{receipt.description}</ItemTitle>
            <ItemDescription>
              <bdi>{formatCurrency(receipt.amount, receipt.currency, locale)}</bdi>
              {receipt.date ? <>{" · "}<bdi>{formatDisplayDate(receipt.date, "numeric").primary}</bdi></> : null}
            </ItemDescription>
          </ItemContent>
        </Item>
      ) : null}
      {/* Chips, not tiles: one short row that fits a 320px phone. */}
      <div className="flex flex-wrap gap-2">
        {TYPES.map((type) => {
          const Icon = BASE_TYPE_ICON[type];
          return (
            <motion.button
              key={type}
              type="button"
              disabled={disabled}
              whileTap={reduce ? undefined : { scale: 0.97 }}
              transition={{ duration: 0.15, ease: EASE_OUT_QUART }}
              className="inline-flex h-9 items-center gap-1.5 rounded-full border bg-card pe-3 ps-1.5 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              onClick={() => onChoose(type)}
            >
              <span className={`inline-flex size-6 items-center justify-center rounded-full ${BASE_TYPE_TINT[type]}`}>
                <Icon className="size-3.5" aria-hidden />
              </span>
              {t(`aiIntake.types.${type}`)}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
