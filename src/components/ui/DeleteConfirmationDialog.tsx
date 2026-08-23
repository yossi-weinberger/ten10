import React, { useCallback, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

interface DeleteConfirmationDialogProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmLabel?: string;
  pendingLabel?: string;
  pending?: boolean;
}

export const DeleteConfirmationDialog: React.FC<
  DeleteConfirmationDialogProps
> = ({
  isOpen,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  pendingLabel,
  pending = false,
}) => {
  const { t, i18n } = useTranslation("data-tables");
  const [internalPending, setInternalPending] = useState(false);
  const confirmPendingRef = useRef(false);
  const effectivePending = pending || internalPending;

  const handleOpenChange = useCallback((open: boolean) => {
    if (effectivePending && !open) {
      return;
    }

    onOpenChange(open);
  }, [effectivePending, onOpenChange]);

  const handleConfirm = useCallback(async () => {
    if (confirmPendingRef.current || effectivePending) {
      return;
    }

    confirmPendingRef.current = true;
    setInternalPending(true);

    try {
      await onConfirm();
    } finally {
      confirmPendingRef.current = false;
      setInternalPending(false);
    }
  }, [effectivePending, onConfirm]);

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogContent dir={i18n.dir()}>
        <AlertDialogHeader className="text-start">
          <AlertDialogTitle className="text-start">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-start">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <AlertDialogCancel
            onClick={() => handleOpenChange(false)}
            disabled={effectivePending}
          >
            {t("actions.cancel")}
          </AlertDialogCancel>
          <Button
            type="button"
            onClick={() => {
              void handleConfirm();
            }}
            disabled={effectivePending}
            className="bg-red-600 hover:bg-red-700"
          >
            {effectivePending
              ? pendingLabel ?? t("actions.delete")
              : confirmLabel ?? t("actions.delete")}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
