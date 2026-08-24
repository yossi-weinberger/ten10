import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategoryCombobox } from "@/components/ui/category-combobox";
import { PaymentMethodCombobox } from "@/components/ui/payment-method-combobox";
import {
  BULK_DESCRIPTION_MAX_LENGTH,
  BULK_TEXT_VALUE_MAX_LENGTH,
  type BulkCategoryFamily,
  type BulkFieldAction,
  type BulkPatchFieldActions,
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
  onActionsChange: (actions: BulkPatchFieldActions) => void;
}

function textValue(action: BulkFieldAction): string {
  if (action.action === "set" && typeof action.value === "string") {
    return action.value;
  }

  return "";
}

function comboboxValue(action: BulkFieldAction): string | null {
  if (action.action === "set" && typeof action.value === "string") {
    return action.value;
  }

  return null;
}

export function BulkEditFields({
  pending,
  actions,
  availability,
  categoryFamily,
  onActionsChange,
}: BulkEditFieldsProps) {
  const { t } = useTranslation("data-tables");

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
          onChange={(value) =>
            updateField("description", { action: "set", value })
          }
          onClear={() => updateField("description", { action: "clear" })}
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
                value={comboboxValue(actions.payment_method)}
                onChange={(value) =>
                  updateField(
                    "payment_method",
                    value === null
                      ? { action: "clear" }
                      : { action: "set", value },
                  )
                }
                placeholder={t("bulkEdit.placeholders.paymentMethod")}
                disabled={pending}
              />
            </div>
            <ClearButton
              pending={pending}
              onClear={() =>
                updateField("payment_method", { action: "clear" })
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
                value={comboboxValue(actions.category)}
                onChange={(value) =>
                  updateField(
                    "category",
                    value === null
                      ? { action: "clear" }
                      : { action: "set", value },
                  )
                }
                transactionType={categoryFamily}
                placeholder={t("bulkEdit.placeholders.category")}
                disabled={pending}
              />
            </div>
            <ClearButton
              pending={pending}
              onClear={() => updateField("category", { action: "clear" })}
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
          onChange={(value) =>
            updateField("recipient", { action: "set", value })
          }
          onClear={() => updateField("recipient", { action: "clear" })}
        />
      ) : null}

      {availability.is_chomesh ? (
        <div className="space-y-2">
          <Label>{t("bulkEdit.fields.chomesh")}</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant={
                actions.is_chomesh.action === "set" &&
                actions.is_chomesh.value === true
                  ? "default"
                  : "outline"
              }
              disabled={pending}
              onClick={() =>
                updateField("is_chomesh", { action: "set", value: true })
              }
            >
              {t("bulkEdit.chomesh.yes")}
            </Button>
            <Button
              type="button"
              variant={
                actions.is_chomesh.action === "set" &&
                actions.is_chomesh.value === false
                  ? "default"
                  : "outline"
              }
              disabled={pending}
              onClick={() =>
                updateField("is_chomesh", { action: "set", value: false })
              }
            >
              {t("bulkEdit.chomesh.no")}
            </Button>
          </div>
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
  onChange,
  onClear,
}: {
  id: string;
  label: string;
  placeholder: string;
  maxLength: number;
  pending: boolean;
  action: BulkFieldAction;
  onChange: (value: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <div className="flex items-center gap-2">
        <Input
          id={id}
          value={textValue(action)}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          maxLength={maxLength}
          disabled={pending}
          className="min-w-0 flex-1 text-start"
        />
        <ClearButton pending={pending} onClear={onClear} />
      </div>
      <ClearedHint action={action} />
    </div>
  );
}

function ClearButton({
  pending,
  onClear,
}: {
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
    >
      {t("bulkEdit.clearValue")}
    </Button>
  );
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
