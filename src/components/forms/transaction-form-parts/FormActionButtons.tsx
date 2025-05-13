import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";

interface FormActionButtonsProps {
  isSubmitting: boolean;
  isSuccess: boolean;
  onCancel?: () => void;
}

export function FormActionButtons({
  isSubmitting,
  isSuccess,
  onCancel,
}: FormActionButtonsProps) {
  return (
    <div className="flex justify-end items-center space-x-2">
      {/* Success Icon Animation */}
      {isSuccess && (
        <CheckCircle className="h-5 w-5 text-green-500 animate-pulse" />
      )}

      {onCancel && (
        <Button type="button" variant="outline" onClick={onCancel}>
          ביטול
        </Button>
      )}
      <Button type="submit" disabled={isSubmitting || isSuccess}>
        {isSubmitting ? "שומר..." : "שמור פעולה"}
      </Button>
    </div>
  );
}
