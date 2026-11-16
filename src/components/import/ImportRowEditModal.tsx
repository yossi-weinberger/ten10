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
import { useMediaQuery } from "@/hooks/use-media-query";
import { TransactionForm } from "@/components/forms/TransactionForm";
import type { TransactionFormValues } from "@/lib/schemas";
import { determineFinalType } from "@/lib/data-layer/transactionForm.service";
import { revalidateAfterEdit } from "@/lib/import/validation";
import {
  formValuesToNormalized,
  previewRowToTransaction,
} from "@/lib/import/row-edit-adapter";
import { useDonationStore } from "@/lib/store";
import type {
  ImportPreviewRow,
  ImportNormalizedRow,
} from "@/lib/import/import-session.types";
import type { Currency, Transaction, RecurringTransaction } from "@/types/transaction";
import {
  FILE_IMPORT,
  type ValidationProfile,
} from "../../../supabase/functions/_shared/transaction-domain/transaction-types.ts";

// ---------------------------------------------------------------------------
// Modal component
// ---------------------------------------------------------------------------

interface ImportRowEditModalProps {
  row: ImportPreviewRow | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<ImportPreviewRow>) => void;
  existingTransactions?: Transaction[];
  recurringTransactions?: RecurringTransaction[];
  /** CSV review stays on FILE_IMPORT. AI drafts pass AI_DRAFT. */
  profile?: ValidationProfile;
}

export function ImportRowEditModal({
  row,
  isOpen,
  onClose,
  onSave,
  existingTransactions,
  recurringTransactions,
  profile = FILE_IMPORT,
}: ImportRowEditModalProps) {
  const { t, i18n } = useTranslation("import");
  const isSmall = useMediaQuery("(max-width: 767px)");
  const defaultCurrency = useDonationStore(
    (s) => s.settings.defaultCurrency
  ) as Currency;

  if (!isOpen || !row || !row.normalized) return null;

  const normalized = row.normalized;
  const transactionForForm = previewRowToTransaction({ id: row.id, normalized }, profile);

  const handleOverrideSubmit = (values: TransactionFormValues) => {
    const updatedNormalized = formValuesToNormalized(
      values,
      defaultCurrency,
      normalized,
      profile,
      determineFinalType(values),
    ) as ImportNormalizedRow;

    const updated: ImportPreviewRow = {
      ...row,
      normalized: updatedNormalized,
    };

    const context =
      existingTransactions !== undefined
        ? {
            existingTransactions,
            recurringTransactions: recurringTransactions ?? [],
          }
        : undefined;

    const { issues, status } = revalidateAfterEdit(updated, context);
    const approved = status === "invalid" ? false : row.approved;

    onSave(row.id, { ...updated, issues, status, approved });
    onClose();
  };

  const title = t("review.editRow");
  const description = `${t("review.columns.row")} ${row.rowNumber}`;

  const formContent = (
    <TransactionForm
      isEditMode
      initialData={transactionForForm}
      onOverrideSubmit={handleOverrideSubmit}
      onCancel={onClose}
    />
  );

  if (isSmall) {
    return (
      <Drawer open={isOpen} onOpenChange={onClose}>
        <DrawerContent dir={i18n.dir()}>
          <DrawerHeader className="rtl:text-right ltr:text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6 max-h-[80vh] overflow-y-auto">
            {formContent}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="sm:max-w-2xl w-[95vw] sm:w-full max-h-[85vh] overflow-y-auto p-4 sm:p-6"
        dir={i18n.dir()}
      >
        <DialogHeader className="rtl:text-right ltr:text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="pt-2">{formContent}</div>
      </DialogContent>
    </Dialog>
  );
}
