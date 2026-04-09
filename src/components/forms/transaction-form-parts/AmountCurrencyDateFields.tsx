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

/** Outer wrapper only — must not be on the same element as `relative` or `top-full` anchors to the padded box, not the input. */
const FIELD_MESSAGE_OUTER_CLASS = "pb-5";

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
      {/* Amount + Currency + Date: responsive layout */}
      <div className="flex flex-wrap gap-4 items-start">
        {/* Amount + Currency group */}
        <div className="flex gap-4 items-start flex-1 min-w-0 md:flex-[1.5]">
          {/* Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="flex-1 min-w-0">
                <FormLabel>{t("transactionForm.amount.label")}</FormLabel>
                <div className={FIELD_MESSAGE_OUTER_CLASS}>
                  <div className="relative">
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
                    <div className="absolute start-0 top-full mt-1 w-full">
                      <FormMessage />
                    </div>
                  </div>
                </div>
              </FormItem>
            )}
          />

          {/* Currency Picker */}
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem>
                <div className="h-6 max-sm:hidden" aria-hidden="true" />
                <div className={FIELD_MESSAGE_OUTER_CLASS}>
                  <div className="relative">
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
                    <div className="absolute start-0 top-full mt-1 w-full">
                      <FormMessage />
                    </div>
                  </div>
                </div>
              </FormItem>
            )}
          />
        </div>

        {/* Date - full width on mobile, flexible on desktop */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="w-full md:w-auto md:flex-1">
              <FormLabel>{t("transactionForm.date.label")} *</FormLabel>
              <div className={FIELD_MESSAGE_OUTER_CLASS}>
                <div className="relative">
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
                  <div className="absolute start-0 top-full mt-1 w-full">
                    <FormMessage />
                  </div>
                </div>
              </div>
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
