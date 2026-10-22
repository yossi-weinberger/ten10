import { motion, useReducedMotion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { BASE_TYPE_ICON, BASE_TYPE_TINT } from "@/components/forms/transaction-form-parts/transaction-type-visuals";
import { Item, ItemContent, ItemDescription, ItemTitle } from "@/components/ui/item";
import type { TextTransactionDraft } from "@/lib/ai/classify-intake";
import type { ReceiptFields } from "@/lib/ai/receipt-card";
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
  const { t } = useTranslation("navigation");
  const reduce = useReducedMotion();
  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium">{t("aiIntake.askType")}</p>
      {receipt ? (
        <Item size="sm">
          <ItemContent>
            <ItemTitle>{receipt.description}</ItemTitle>
            <ItemDescription>
              {t("aiIntake.receiptPreview", {
                description: receipt.description,
                date: receipt.date,
                amount: receipt.amount,
                currency: receipt.currency,
              })}
            </ItemDescription>
          </ItemContent>
        </Item>
      ) : null}
      <div className="grid grid-cols-3 gap-2">
        {TYPES.map((type) => {
          const Icon = BASE_TYPE_ICON[type];
          return (
            <motion.button
              key={type}
              type="button"
              disabled={disabled}
              whileHover={reduce ? undefined : { y: -2 }}
              whileTap={reduce ? undefined : { scale: 0.98 }}
              transition={{ duration: 0.15, ease: EASE_OUT_QUART }}
              className="flex flex-col items-center gap-1.5 rounded-xl border bg-card p-3 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              onClick={() => onChoose(type)}
            >
              <span className={`inline-flex size-9 items-center justify-center rounded-full ${BASE_TYPE_TINT[type]}`}>
                <Icon className="size-4" aria-hidden />
              </span>
              {t(`aiIntake.types.${type}`)}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
