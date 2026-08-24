import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Transaction } from "@/types/transaction";
import { TransactionForm } from "@/components/forms/TransactionForm";
import { useMediaQuery } from "@/hooks/use-media-query";

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
  onMutationSuccess?: () => void;
  transaction: Transaction | null;
}

export function TransactionEditModal({
  isOpen,
  onClose,
  onSubmitSuccess,
  onMutationSuccess,
  transaction,
}: TransactionEditModalProps) {
  const { t, i18n } = useTranslation("data-tables");

  const isSmallNow = useMediaQuery("(max-width: 767px)");
  const [useDrawer] = useState(isSmallNow);

  if (!isOpen || !transaction) {
    return null;
  }

  const handleSubmitSuccess = () => {
    onSubmitSuccess?.();
    onClose();
  };

  // Mobile: use Drawer for full-height, scrollable experience
  if (useDrawer) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent dir={i18n.dir()}>
          <DrawerHeader className="rtl:text-right ltr:text-left">
            <DrawerTitle>{t("modal.editTitle")}</DrawerTitle>
            <DrawerDescription>{t("modal.editDescription")}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 max-h-[80vh] overflow-y-auto">
            <TransactionForm
              isEditMode={true}
              initialData={transaction}
              onSubmitSuccess={handleSubmitSuccess}
              onMutationSuccess={onMutationSuccess}
              onCancel={onClose}
            />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop/tablet: use Dialog with constrained width and scroll
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-2xl w-[95vw] sm:w-full max-h-[85vh] overflow-y-auto p-4 sm:p-6"
        dir={i18n.dir()}
      >
        <DialogHeader className="rtl:text-right ltr:text-left">
          <DialogTitle>{t("modal.editTitle")}</DialogTitle>
          <DialogDescription>{t("modal.editDescription")}</DialogDescription>
        </DialogHeader>
        <div className="pt-2">
          <TransactionForm
            isEditMode={true}
            initialData={transaction}
            onSubmitSuccess={handleSubmitSuccess}
            onMutationSuccess={onMutationSuccess}
            onCancel={onClose}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
