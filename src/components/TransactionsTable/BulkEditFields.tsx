import { useTranslation } from "react-i18next";
import { FlagToggleButton } from "@/components/forms/transaction-form-parts/FlagToggleButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryCombobox } from "@/components/ui/category-combobox";
import { PaymentMethodCombobox } from "@/components/ui/payment-method-combobox";
import {
  BULK_DESCRIPTION_MAX_LENGTH,
  BULK_TEXT_VALUE_MAX_LENGTH,
  displayedBulkChomeshChecked,
  displayedBulkComboboxValue,
  displayedBulkTextValue,
  nextBulkChomeshAction,
  nextBulkTextAction,
  type BulkCategoryFamily,
  type BulkFieldAction,
  type BulkPatchFieldActions,
  type ChomeshBulkType,
  type SharedBulkValues,
} from "@/lib/tableTransactions/bulkActions";
import { cn } from "@/lib/utils";

export type BulkEditFieldAvailability = {
  description: boolean;
  payment_method: boolean;
  category: boolean;
  recipient: boolean;
  is_chomesh: boolean;
};

export interface BulkEditFieldsProps {
  pending: boolean;
  actions: BulkPatchFieldActions;
  availability: BulkEditFieldAvailability;
  categoryFamily: BulkCategoryFamily | null;
  chomeshType: ChomeshBulkType | null;
  sharedValues: SharedBulkValues;
  onActionsChange: (actions: BulkPatchFieldActions) => void;
}

export function BulkEditFields({
  pending,
  actions,
  availability,
  categoryFamily,
  chomeshType,
  sharedValues,
  onActionsChange,
}: BulkEditFieldsProps) {
  const { t } = useTranslation("data-tables");
  const { t: tTransactions } = useTranslation("transactions");

  const updateField = (
    field: keyof BulkPatchFieldActions,
    action: BulkFieldAction,
  ) => {
    onActionsChange({
      ...actions,
      [field]: action,
    });
  };

  const hasVisibleField =
    availability.description ||
    availability.payment_method ||
    availability.category ||
    availability.recipient ||
    availability.is_chomesh;

  if (!hasVisibleField) {
    return (
      <p className="text-sm text-muted-foreground">
        {t("bulkEdit.messages.noAvailableFields")}
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {availability.description ? (
        <BulkTextField
          id="bulk-edit-description"
          label={t("bulkEdit.fields.description")}
          placeholder={t("bulkEdit.placeholders.description")}
          maxLength={BULK_DESCRIPTION_MAX_LENGTH}
          pending={pending}
          action={actions.description}
          shared={sharedValues.description}
          onChange={(value) =>
            updateField(
              "description",
              nextBulkTextAction(value, sharedValues.description),
            )
          }
          onClear={() =>
            updateField(
              "description",
              nextBulkTextAction(null, sharedValues.description),
            )
          }
        />
      ) : null}

      {availability.payment_method ? (
        <div className="space-y-2">
          <Label htmlFor="bulk-edit-payment-method">
            {t("bulkEdit.fields.paymentMethod")}
          </Label>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <PaymentMethodCombobox
                id="bulk-edit-payment-method"
                value={displayedBulkComboboxValue(
                  actions.payment_method,
                  sharedValues.payment_method,
                )}
                onChange={(value) =>
                  updateField(
                    "payment_method",
                    nextBulkTextAction(value, sharedValues.payment_method),
                  )
                }
                placeholder={t("bulkEdit.placeholders.paymentMethod")}
                disabled={pending}
              />
            </div>
            <ClearButton
              fieldLabel={t("bulkEdit.fields.paymentMethod")}
              pending={pending}
              onClear={() =>
                updateField(
                  "payment_method",
                  nextBulkTextAction(null, sharedValues.payment_method),
                )
              }
            />
          </div>
          <ClearedHint action={actions.payment_method} />
        </div>
      ) : null}

      {availability.category && categoryFamily !== null ? (
        <div className="space-y-2">
          <Label htmlFor="bulk-edit-category">{t("bulkEdit.fields.category")}</Label>
          <div className="flex items-center gap-2">
            <div className="min-w-0 flex-1">
              <CategoryCombobox
                id="bulk-edit-category"
                value={displayedBulkComboboxValue(
                  actions.category,
                  sharedValues.category,
                )}
                onChange={(value) =>
                  updateField(
                    "category",
                    nextBulkTextAction(value, sharedValues.category),
                  )
                }
                transactionType={categoryFamily}
                placeholder={t("bulkEdit.placeholders.category")}
                disabled={pending}
              />
            </div>
            <ClearButton
              fieldLabel={t("bulkEdit.fields.category")}
              pending={pending}
              onClear={() =>
                updateField(
                  "category",
                  nextBulkTextAction(null, sharedValues.category),
                )
              }
            />
          </div>
          <ClearedHint action={actions.category} />
        </div>
      ) : null}

      {availability.recipient ? (
        <BulkTextField
          id="bulk-edit-recipient"
          label={t("bulkEdit.fields.recipient")}
          placeholder={t("bulkEdit.placeholders.recipient")}
          maxLength={BULK_TEXT_VALUE_MAX_LENGTH}
          pending={pending}
          action={actions.recipient}
          shared={sharedValues.recipient}
          onChange={(value) =>
            updateField(
              "recipient",
              nextBulkTextAction(value, sharedValues.recipient),
            )
          }
          onClear={() =>
            updateField(
              "recipient",
              nextBulkTextAction(null, sharedValues.recipient),
            )
          }
        />
      ) : null}

      {availability.is_chomesh && chomeshType !== null ? (
        <div className="flex justify-center">
          <FlagToggleButton
            className="min-w-[100px] max-w-[160px]"
            checked={displayedBulkChomeshChecked(
              actions.is_chomesh,
              sharedValues.is_chomesh,
            )}
            disabled={pending}
            isGolden
            label={tTransactions(getChomeshLabelKey(chomeshType))}
            tooltip={tTransactions(getChomeshTooltipKey(chomeshType))}
            onToggle={() => {
              const isChecked = displayedBulkChomeshChecked(
                actions.is_chomesh,
                sharedValues.is_chomesh,
              );
              updateField(
                "is_chomesh",
                nextBulkChomeshAction(!isChecked, sharedValues.is_chomesh),
              );
            }}
          />
        </div>
      ) : null}
    </div>
  );
}

function BulkTextField({
  id,
  label,
  placeholder,
  maxLength,
  pending,
  action,
  shared,
  onChange,
  onClear,
}: {
  id: string;
  label: string;
  placeholder: string;
  maxLength: number;
  pending: boolean;
  action: BulkFieldAction;
  shared: string | null | undefined;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          value={displayedBulkTextValue(action, shared)}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={pending}
          className="min-w-0 flex-1 text-start"
        />
        <ClearButton
          fieldLabel={label}
          pending={pending}
          onClear={onClear}
        />
      </div>
      <ClearedHint action={action} />
    </div>
  );
}

function ClearButton({
  fieldLabel,
  pending,
  onClear,
}: {
  fieldLabel: string;
  pending: boolean;
  onClear: () => void;
}) {
  const { t } = useTranslation("data-tables");

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="min-h-11 shrink-0 sm:min-h-9"
      onClick={onClear}
      disabled={pending}
      aria-label={t("bulkEdit.clearValueNamed", { field: fieldLabel })}
    >
      {t("bulkEdit.clearValue")}
    </Button>
  );
}

function getChomeshLabelKey(type: ChomeshBulkType): string {
  switch (type) {
    case "income":
      return "transactionForm.chomesh.label";
    case "recognized-expense":
      return "transactionForm.chomeshExpense.label";
    case "donation":
      return "transactionForm.chomeshDonation.label";
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

function getChomeshTooltipKey(type: ChomeshBulkType): string {
  switch (type) {
    case "income":
      return "transactionForm.chomesh.tooltip";
    case "recognized-expense":
      return "transactionForm.chomeshExpense.tooltip";
    case "donation":
      return "transactionForm.chomeshDonation.tooltip";
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}

function ClearedHint({ action }: { action: BulkFieldAction }) {
  const { t } = useTranslation("data-tables");

  if (action.action !== "clear") {
    return null;
  }

  return (
    <p className={cn("text-xs text-muted-foreground")}>
      {t("bulkEdit.willClear")}
    </p>
  );
}
