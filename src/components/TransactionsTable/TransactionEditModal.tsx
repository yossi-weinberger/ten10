import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Transaction } from "@/types/transaction";
import { TransactionForm } from "@/components/forms/TransactionForm";

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export function TransactionEditModal({
  isOpen,
  onClose,
  transaction,
}: TransactionEditModalProps) {
  if (!isOpen || !transaction) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl" dir="rtl">
        <DialogHeader className="text-right">
          <DialogTitle>עריכת תנועה</DialogTitle>
          <DialogDescription className="text-right">
            עדכן את פרטי התנועה. שינויים יישמרו באופן מיידי.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <TransactionForm
            isEditMode={true}
            initialData={transaction}
            onSubmitSuccess={onClose}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
