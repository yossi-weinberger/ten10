import { useTranslation } from "react-i18next";
import { UseFormReturn } from "react-hook-form";
import {
  FormField,
  FormItem,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { FlagToggleButton } from "@/components/forms/transaction-form-parts/FlagToggleButton";
import type { TransactionFormValues } from "@/lib/schemas";
import { TransactionType } from "@/types/transaction";
import { useDonationStore } from "@/lib/store";

interface TransactionCheckboxesProps {
  form: UseFormReturn<TransactionFormValues>;
  selectedType: TransactionType;
  isExemptChecked?: boolean;
}

export function TransactionCheckboxes({
  form,
  selectedType,
  isExemptChecked,
}: TransactionCheckboxesProps) {
  const { t } = useTranslation("transactions");
  const trackChomeshSeparately = useDonationStore(
    (state) => state.settings.trackChomeshSeparately
  );
  const isChomeshChecked = form.watch("is_chomesh");
  const isRecognizedChecked = form.watch("isRecognized");
  const isFromPersonalFundsChecked = form.watch("isFromPersonalFunds");

  const renderToggleButton = (
    name: keyof TransactionFormValues,
    labelKey: string,
    tooltipKey: string,
    isDisabled: boolean = false,
    onToggleOverride?: (
      currentValue: boolean,
      onChange: (val: boolean) => void
    ) => void,
    isGolden: boolean = false
  ) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => {
        // Ensure boolean value for type safety
        const isChecked = !!field.value;

        return (
          <FormItem className="flex-1 min-w-[100px] max-w-[160px]">
            <FormControl>
              <FlagToggleButton
                checked={isChecked}
                disabled={isDisabled}
                isGolden={isGolden}
                label={t(labelKey)}
                tooltip={t(tooltipKey)}
                onToggle={() => {
                  if (onToggleOverride) {
                    onToggleOverride(isChecked, field.onChange);
                  } else {
                    field.onChange(!isChecked);
                  }
                }}
              />
            </FormControl>
            {/* Surface Zod refinement errors (e.g. is_chomesh combinations)
                so a blocked save is no longer silent. */}
            <FormMessage className="text-center text-xs" />
          </FormItem>
        );
      }}
    />
  );

  return (
    <div className="flex flex-col gap-3 mt-2 w-full">
      <div
        className="flex flex-row flex-wrap gap-3 w-fit max-w-full mx-auto justify-center"
        data-onboarding="transaction-flags"
      >
      {selectedType === "income" && (
        <>
          {/* Exempt Income */}
          {renderToggleButton(
            "isExempt",
            "transactionForm.exemptIncome.label",
            "transactionForm.exemptIncome.tooltip",
            !!isChomeshChecked,
            (isChecked, onChange) => {
              if (isChomeshChecked) return;
              onChange(!isChecked);
            }
          )}

          {/* Chomesh */}
          {renderToggleButton(
            "is_chomesh",
            "transactionForm.chomesh.label",
            "transactionForm.chomesh.tooltip",
            !!isExemptChecked,
            (isChecked, onChange) => {
              if (isExemptChecked) return;
              onChange(!isChecked);
            },
            true // Activate golden mode for Chomesh
          )}
        </>
      )}

      {selectedType === "expense" && (
        <>
          {/* Recognized expense for maaser (10%) - mutually exclusive with chomesh */}
          {renderToggleButton(
            "isRecognized",
            "transactionForm.recognizedExpense.label",
            "transactionForm.recognizedExpense.tooltip",
            !!isChomeshChecked,
            (isChecked, onChange) => {
              if (isChomeshChecked) return;
              onChange(!isChecked);
            }
          )}

          {/* Recognized expense for chomesh (20%) - always visible, mutually exclusive with maaser */}
          {renderToggleButton(
            "is_chomesh",
            "transactionForm.chomeshExpense.label",
            "transactionForm.chomeshExpense.tooltip",
            !!isRecognizedChecked,
            (isChecked, onChange) => {
              if (isRecognizedChecked) return;
              onChange(!isChecked);
            },
            true // Golden mode
          )}
        </>
      )}

      {selectedType === "donation" && (
        <>
          {/* Chomesh for donation - only when trackChomeshSeparately is ON */}
          {trackChomeshSeparately &&
            renderToggleButton(
              "is_chomesh",
              "transactionForm.chomeshDonation.label",
              "transactionForm.chomeshDonation.tooltip",
              !!isFromPersonalFundsChecked,
              (isChecked, onChange) => {
                if (isFromPersonalFundsChecked) return;
                onChange(!isChecked);
              },
              true // Golden mode
            )}

          {renderToggleButton(
            "isFromPersonalFunds",
            "transactionForm.personalFunds.label",
            "transactionForm.personalFunds.tooltip",
            trackChomeshSeparately && !!isChomeshChecked,
            (isChecked, onChange) => {
              if (trackChomeshSeparately && isChomeshChecked) return;
              onChange(!isChecked);
            }
          )}
        </>
      )}

      </div>
      <div
        className="flex flex-row flex-wrap gap-3 w-fit max-w-full mx-auto justify-center"
        data-onboarding="recurring-toggle"
      >
      {renderToggleButton(
        "is_recurring",
        "transactionForm.recurringTransaction.isRecurring",
        "transactionForm.recurringTransaction.tooltip"
      )}
      </div>
    </div>
  );
}
