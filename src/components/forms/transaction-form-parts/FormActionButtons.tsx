import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CheckCircle, ExternalLink } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { TransactionType } from "@/types/transaction";
import { cn } from "@/lib/utils";

interface FormActionButtonsProps {
  isSubmitting: boolean;
  isSuccess: boolean;
  onCancel?: () => void;
  isEditMode?: boolean;
  selectedType?: TransactionType;
}

const DONATION_URL =
  "https://www.matara.pro/nedarimplus/online/?mosad=7007125&Avour=%D7%A2%D7%91%D7%95%D7%A8%20Ten10";

export function FormActionButtons({
  isSubmitting,
  isSuccess,
  onCancel,
  isEditMode = false,
  selectedType,
}: FormActionButtonsProps) {
  const { t, i18n } = useTranslation("transactions");
  const isDonation = selectedType === "donation";

  return (
    <div className="flex justify-end items-center gap-4">
      {/* Success Icon Animation */}
      {isSuccess && (
        <CheckCircle className="h-5 w-5 text-green-500 animate-pulse" />
      )}

      {/* Support Institute Button - Only show when donation type is selected */}
      {isDonation && (
        <Tooltip>
          <TooltipTrigger asChild>
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
                href={DONATION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2"
                dir={i18n.dir()}
              >
                <img src="/donate.svg" alt="Donate" className="h-6 w-6" />
                {t("transactionForm.actions.donateToInstitute")}
                <ExternalLink className="h-4 w-4 text-yellow-950 dark:text-yellow-900" />
              </a>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="max-w-xs text-sm" dir={i18n.dir()}>
              {t("transactionForm.actions.donateTooltip")}
            </p>
          </TooltipContent>
        </Tooltip>
      )}

      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel}>
          {t("transactionForm.actions.cancel")}
        </Button>
      )}
      <Button type="submit" disabled={isSubmitting || isSuccess}>
        {isSubmitting
          ? t("transactionForm.actions.submitting")
          : isSuccess
          ? t("transactionForm.messages.success")
          : isEditMode
          ? t("transactionForm.actions.save")
          : t("transactionForm.actions.submit")}
      </Button>
    </div>
  );
}
