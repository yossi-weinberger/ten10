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
import { useDonationStore } from "@/lib/store";
import type {
  ImportPreviewRow,
  ImportNormalizedRow,
} from "@/lib/import/import-session.types";
import type { Currency, Transaction, RecurringTransaction } from "@/types/transaction";

// ---------------------------------------------------------------------------
// Conversion helpers
// ---------------------------------------------------------------------------

/**
 * Build a fake Transaction from a preview row so TransactionForm can use it
 * as initialData. All recurring / system fields are left null/undefined.
 */
function previewRowToTransaction(row: ImportPreviewRow): Transaction {
  const n = row.normalized!;
  return {
    id: row.id,
    user_id: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    date: n.date,
    amount: n.amount,
    currency: n.currency,
    description: n.description,
    type: n.type,
    category: n.category,
    is_chomesh: n.is_chomesh,
    recipient: n.recipient,
    payment_method: n.payment_method,
    original_amount: null,
    original_currency: null,
    conversion_rate: null,
    conversion_date: null,
    rate_source: null,
    source_recurring_id: null,
  };
}

/**
 * Convert validated form values back into an ImportNormalizedRow.
 * determineFinalType handles the checkbox → derived-type logic.
 */
function formValuesToNormalized(
  values: TransactionFormValues,
  defaultCurrency: Currency,
  existing: ImportNormalizedRow
): ImportNormalizedRow {
  const finalType = determineFinalType(values);
  const isDonation =
    finalType === "donation" || finalType === "non_tithe_donation";

  return {
    ...existing,
    date: values.date,
    amount: values.amount,
    currency: (values.currency as Currency) ?? defaultCurrency,
    description: values.description ?? null,
    type: finalType,
    category: isDonation ? null : (values.category ?? null),
    recipient: values.recipient ?? null,
    payment_method: values.payment_method ?? null,
    is_chomesh: values.is_chomesh ?? false,
    // Imports never carry conversion data
    original_amount: null,
    original_currency: null,
    conversion_rate: null,
    conversion_date: null,
    rate_source: null,
    source_recurring_id: null,
    occurrence_number: null,
  };
}

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
}

export function ImportRowEditModal({
  row,
  isOpen,
  onClose,
  onSave,
  existingTransactions,
  recurringTransactions,
}: ImportRowEditModalProps) {
  const { t, i18n } = useTranslation("import");
  const isSmall = useMediaQuery("(max-width: 767px)");
  const defaultCurrency = useDonationStore(
    (s) => s.settings.defaultCurrency
  ) as Currency;

  if (!isOpen || !row || !row.normalized) return null;

  const transactionForForm = previewRowToTransaction(row);

  const handleOverrideSubmit = (values: TransactionFormValues) => {
    const updatedNormalized = formValuesToNormalized(
      values,
      defaultCurrency,
      row.normalized!
    );

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
