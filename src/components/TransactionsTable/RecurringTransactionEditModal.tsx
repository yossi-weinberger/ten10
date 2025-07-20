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
import {
  RecurringTransactionEditForm,
  recurringEditSchema,
} from "@/components/forms/RecurringTransactionEditForm"; // Import the new form
import { z } from "zod";
import { toast } from "sonner";

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
  if (!transaction) return null;

  const { fetchRecurring } = useRecurringTableStore();

  const handleUpdate = async (values: z.infer<typeof recurringEditSchema>) => {
    try {
      const updateValues = {
        ...values,
        day_of_month:
          values.day_of_month === null ? undefined : values.day_of_month,
        total_occurrences:
          values.total_occurrences === null
            ? undefined
            : values.total_occurrences,
      };
      await updateRecurringTransaction(transaction.id, updateValues);
      fetchRecurring();
      onClose();
      toast.success("הוראת הקבע עודכנה בהצלחה!");
    } catch (error) {
      console.error("Failed to update recurring transaction:", error);
      toast.error("שגיאה בעדכון הוראת הקבע.");
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>עריכת הוראת קבע</DialogTitle>
          <DialogDescription>
            עדכן את פרטי הוראת הקבע. שינויים יחולו רק על תנועות עתידיות ולא
            ישפיעו על תנועות שכבר בוצעו.
          </DialogDescription>
        </DialogHeader>
        <RecurringTransactionEditForm
          initialData={transaction}
          onSubmit={handleUpdate}
          onCancel={onClose}
        />
      </DialogContent>
    </Dialog>
  );
}
