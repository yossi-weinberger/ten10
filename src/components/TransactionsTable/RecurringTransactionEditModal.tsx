import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RecurringTransaction } from "@/types/transaction";
import { updateRecurringTransaction } from "@/lib/tableTransactions/recurringTable.service";
import { useRecurringTableStore } from "@/lib/tableTransactions/recurringTable.store";
import { RecurringTransactionEditForm } from "@/components/forms/RecurringTransactionEditForm";
import { RecurringEditFormValues, recurringEditSchema } from "@/lib/schemas";
import { z } from "zod";
import { toast } from "sonner";
import { logger } from "@/lib/logger";

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
  const { t } = useTranslation("data-tables");
  const { fetchRecurring } = useRecurringTableStore();

  const handleUpdate = async (values: RecurringEditFormValues) => {
    try {
      const updateValues = {
        ...values,
        day_of_month: values.day_of_month ?? undefined,
        total_occurrences: values.total_occurrences ?? undefined,
      };
      await updateRecurringTransaction(transaction!.id, updateValues);
      fetchRecurring();
      onClose();
      toast.success(t("messages.recurringUpdateSuccess"));
    } catch (error) {
      logger.error("Failed to update recurring transaction:", error);
      toast.error(t("messages.recurringUpdateError"));
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
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
