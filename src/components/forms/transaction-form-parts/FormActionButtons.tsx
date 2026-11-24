import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";
import { TransactionType } from "@/types/transaction";
import { cn } from "@/lib/utils";
import { BrandSaveIcon } from "@/components/brand/BrandSaveIcon";
import { SupportChargeNote } from "@/components/support/SupportChargeNote";
import { SUPPORT_PAYMENT_URL } from "@/lib/support-payment";

interface FormActionButtonsProps {
  isSubmitting: boolean;
  isSuccess: boolean;
  onCancel?: () => void;
  isEditMode?: boolean;
  selectedType?: TransactionType | "";
}

/** The submit button's text for each save state, when adding and when editing. */
const SUBMIT_LABELS = {
  add: {
    idle: "transactionForm.actions.submit",
    saving: "transactionForm.actions.submitting",
    saved: "transactionForm.messages.success",
  },
  edit: {
    idle: "transactionForm.actions.save",
    saving: "transactionForm.actions.saving",
    saved: "transactionForm.messages.updateSuccess",
  },
} as const;

export function FormActionButtons({
  isSubmitting,
  isSuccess,
  onCancel,
  isEditMode = false,
  selectedType,
}: FormActionButtonsProps) {
  const { t, i18n } = useTranslation("transactions");
  const isDonation = selectedType === "donation";
  // Success first: the form reports it while react-hook-form still says it is submitting.
  const saveState = isSuccess ? "saved" : isSubmitting ? "saving" : "idle";

  return (
    <div className="flex flex-col gap-3">
      {isDonation && (
        <div className="space-y-1 text-start text-sm" dir={i18n.dir()}>
          <p className="text-muted-foreground">{t("transactionForm.actions.donateTooltip")}</p>
          <p className="font-medium text-foreground">
            <SupportChargeNote />
          </p>
        </div>
      )}
      <div className="flex items-center justify-end gap-4">
        {isDonation && (
          <Button
            asChild
            className={cn(
              "text-yellow-950 dark:text-yellow-900 rounded-md border-none",
              "bg-golden-static hover:bg-golden-hover dark:hover:bg-yellow-600 dark:hover:text-yellow-950",
              "brightness-90 hover:brightness-95 saturate-110",
              "ring-1 ring-white/30 shadow-[0_0_16px_rgba(218,165,32,0.28)] hover:shadow-[0_0_22px_rgba(218,165,32,0.42)]",
              "transition-all duration-300"
            )}
          >
            <a
              href={SUPPORT_PAYMENT_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2"
              dir={i18n.dir()}
            >
              <img src="/donate.svg" alt="" className="h-6 w-6" />
              {t("transactionForm.actions.donateToInstitute")}
              <ExternalLink className="h-4 w-4 text-yellow-950 dark:text-yellow-900" />
            </a>
          </Button>
        )}

        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            {t("transactionForm.actions.cancel")}
          </Button>
        )}
        {/* Disabled while saving and after success, but not dimmed: the symbol shows the progress. */}
        <Button type="submit" disabled={saveState !== "idle"} className="disabled:opacity-100">
          {saveState !== "idle" && <BrandSaveIcon status={saveState} />}
          {t(SUBMIT_LABELS[isEditMode ? "edit" : "add"][saveState])}
        </Button>
      </div>
    </div>
  );
}
