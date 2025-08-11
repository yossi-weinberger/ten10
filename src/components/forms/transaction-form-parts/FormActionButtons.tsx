import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface FormActionButtonsProps {
  isSubmitting: boolean;
  isSuccess: boolean;
  onCancel?: () => void;
  isEditMode?: boolean;
}

export function FormActionButtons({
  isSubmitting,
  isSuccess,
  onCancel,
  isEditMode = false,
}: FormActionButtonsProps) {
  const { t } = useTranslation("transactions");
  return (
    <div className="flex justify-end items-center space-x-2">
      {/* Success Icon Animation */}
      {isSuccess && (
        <CheckCircle className="h-5 w-5 text-green-500 animate-pulse" />
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
