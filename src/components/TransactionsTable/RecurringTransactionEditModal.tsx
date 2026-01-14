import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { RecurringTransaction } from "@/types/transaction";
import { updateRecurringTransaction } from "@/lib/tableTransactions/recurringTable.service";
import { useRecurringTableStore } from "@/lib/tableTransactions/recurringTable.store";
import { RecurringTransactionEditForm } from "@/components/forms/RecurringTransactionEditForm";
import { RecurringEditFormValues, recurringEditSchema } from "@/lib/schemas";
import { z } from "zod";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { useMediaQuery } from "@/hooks/use-media-query";

interface RecurringTransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: RecurringTransaction | null;
}

export function RecurringTransactionEditModal({
  isOpen,
  onClose,
  transaction,
}: RecurringTransactionEditModalProps) {
  const { t, i18n } = useTranslation("data-tables");
  const { fetchRecurring } = useRecurringTableStore();

  const isSmallNow = useMediaQuery("(max-width: 767px)");
  const [useDrawer, setUseDrawer] = useState(isSmallNow);

  // Lock the variant (Drawer/Dialog) when the modal is open
  useEffect(() => {
    if (!isOpen) setUseDrawer(isSmallNow);
  }, [isSmallNow, isOpen]);

  const handleUpdate = async (values: RecurringEditFormValues) => {
    try {
      const updateValues = {
        ...values,
        day_of_month: values.day_of_month ?? undefined,
        total_occurrences: values.total_occurrences ?? undefined,
      };
      await updateRecurringTransaction(transaction!.id, updateValues);

      // Close modal first to avoid race condition with Portal cleanup
      onClose();

      // Then refresh the table after modal is closed, using requestAnimationFrame
      // to ensure the portal cleanup has processed
      requestAnimationFrame(() => {
        fetchRecurring();
        toast.success(t("messages.recurringUpdateSuccess"));
      });
    } catch (error) {
      logger.error("Failed to update recurring transaction:", error);
      toast.error(t("messages.recurringUpdateError"));
    }
  };

  if (!isOpen) return null;

  // Use the locked variant state instead of the live media query
  if (useDrawer) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent dir={i18n.dir()}>
          <DrawerHeader className="rtl:text-right ltr:text-left">
            <DrawerTitle>{t("modal.editRecurringTitle")}</DrawerTitle>
            <DrawerDescription>
              {t("modal.editRecurringDescription")}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 max-h-[80vh] overflow-y-auto">
            {transaction ? (
              <RecurringTransactionEditForm
                initialData={transaction}
                onSubmit={handleUpdate}
                onCancel={onClose}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("modal.noRecurringSelected")}
              </p>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop/tablet: Dialog with constrained size and scroll
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-2xl w-[95vw] sm:w-full max-h-[85vh] overflow-y-auto p-4 sm:p-6"
        dir={i18n.dir()}
      >
        <DialogHeader className="rtl:text-right ltr:text-left">
          <DialogTitle>{t("modal.editRecurringTitle")}</DialogTitle>
          <DialogDescription>
            {t("modal.editRecurringDescription")}
          </DialogDescription>
        </DialogHeader>

        {transaction ? (
          <RecurringTransactionEditForm
            initialData={transaction}
            onSubmit={handleUpdate}
            onCancel={onClose}
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            {t("modal.noRecurringSelected")}
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
