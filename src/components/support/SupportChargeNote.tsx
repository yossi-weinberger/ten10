import { useTranslation } from "react-i18next";
import { SUPPORT_MERCHANT_NAME } from "@/lib/support-payment";
import { cn } from "@/lib/utils";

interface SupportChargeNoteProps {
  className?: string;
}

/** Tells the payer which name will appear on the card charge. */
export function SupportChargeNote({ className }: SupportChargeNoteProps) {
  const { t } = useTranslation("support");

  return (
    <span className={cn("block", className)}>
      {t("chargeName", { merchant: SUPPORT_MERCHANT_NAME })}
    </span>
  );
}
