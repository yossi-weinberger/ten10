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
import { CurrencyPicker } from "@/components/ui/CurrencyPicker";
import { CurrencyCode } from "@/lib/currencies";
import { TransactionFormValues } from "@/lib/schemas";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parse } from "date-fns";
import { useDonationStore } from "@/lib/store";
import { CurrencyConversionSection } from "./CurrencyConversionSection";

interface AmountCurrencyDateFieldsProps {
  form: UseFormReturn<TransactionFormValues>;
}

export function AmountCurrencyDateFields({
  form,
}: AmountCurrencyDateFieldsProps) {
  const { t } = useTranslation("transactions");
  const defaultCurrency = useDonationStore((state) => state.settings.defaultCurrency);
  
  const selectedCurrency = form.watch("currency");
  const amount = form.watch("amount");
  
  return (
    <div className="space-y-4">
      {/* Amount, Currency, Date - all in one row */}
      <div className="flex flex-col sm:flex-row gap-4 items-end">
        {/* Amount */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>{t("transactionForm.amount.label")}</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ""}
                  className="text-start"
                  placeholder={t("transactionForm.amount.placeholder")}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Currency Picker */}
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormControl>
                <CurrencyPicker 
                  value={field.value as CurrencyCode} 
                  onChange={(val) => {
                    field.onChange(val);
                    // Reset rate source on change to trigger re-eval
                    if (val === defaultCurrency) {
                      form.setValue("rate_source", null);
                      form.setValue("conversion_rate", null);
                    } else {
                      form.setValue("rate_source", "auto");
                      form.setValue("conversion_rate", null); // Clear stale rate when switching currencies
                    }
                  }} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex-1">
              <FormLabel>{t("transactionForm.date.label")} *</FormLabel>
              <FormControl>
                <DatePicker
                  date={
                    field.value
                      ? parse(field.value, "yyyy-MM-dd", new Date())
                      : undefined
                  }
                  setDate={(date) => {
                    if (date) {
                      field.onChange(format(date, "yyyy-MM-dd"));
                    } else {
                      field.onChange("");
                    }
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Conversion Section */}
      {selectedCurrency !== defaultCurrency && (
        <CurrencyConversionSection
          form={form as any}
          selectedCurrency={selectedCurrency}
          amount={amount}
        />
      )}
    </div>
  );
}
