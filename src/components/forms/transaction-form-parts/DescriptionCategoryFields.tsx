import { useTranslation } from "react-i18next";
import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { CategoryCombobox } from "@/components/ui/category-combobox";
import { PaymentMethodCombobox } from "@/components/ui/payment-method-combobox";
import { TransactionFormValues } from "@/lib/schemas";
import { TransactionType } from "@/types/transaction";

interface DescriptionCategoryFieldsProps {
  form: UseFormReturn<TransactionFormValues>;
  selectedType: TransactionType;
}

// Transaction types that should show the category field
const CATEGORY_TYPES: TransactionType[] = ["expense", "income"];

export function DescriptionCategoryFields({
  form,
  selectedType,
}: DescriptionCategoryFieldsProps) {
  const { t } = useTranslation("transactions");
  
  const showCategoryField = CATEGORY_TYPES.includes(selectedType);
  const showRecipientField = selectedType === "donation";
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
      {/* Description - start */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("transactionForm.description.label")}</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ""}
                placeholder={t("transactionForm.description.placeholder")}
                className="text-start"
                autoComplete="on"
              />
            </FormControl>
            <div className="h-5">
              <FormMessage />
            </div>
          </FormItem>
        )}
      />
      {/* Category - income and expense */}
      {showCategoryField && (
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("transactionForm.category.label")}</FormLabel>
              <FormControl>
                <CategoryCombobox
                  value={field.value ?? null}
                  onChange={(value) => field.onChange(value)}
                  transactionType={selectedType}
                  placeholder={
                    selectedType === "income"
                      ? t("transactionForm.category.incomePlaceholder", "Income category (optional)")
                      : t("transactionForm.category.placeholder")
                  }
                />
              </FormControl>
              <div className="h-5">
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
      )}
      {/* Donation recipient - donation type */}
      {showRecipientField && (
        <FormField
          control={form.control}
          name="recipient"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("transactionForm.recipient.label")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder={t("transactionForm.recipient.placeholder")}
                  className="text-start"
                />
              </FormControl>
              <div className="h-5">
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
      )}

      {/* Payment method - all types */}
      <FormField
        control={form.control}
        name="payment_method"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("transactionForm.paymentMethod.label")}</FormLabel>
            <FormControl>
              <PaymentMethodCombobox
                value={field.value ?? null}
                onChange={(value) => field.onChange(value)}
                placeholder={t("transactionForm.paymentMethod.placeholder")}
              />
            </FormControl>
            <div className="h-5">
              <FormMessage />
            </div>
          </FormItem>
        )}
      />
    </div>
  );
}
