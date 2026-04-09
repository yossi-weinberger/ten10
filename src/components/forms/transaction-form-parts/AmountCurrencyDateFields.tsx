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

/** Minimum space for one validation line; grows when text wraps on narrow viewports. */
const FIELD_MESSAGE_SLOT_CLASS = "mt-1 min-h-5 text-sm leading-snug";

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
        {/* Amount + Currency group — controls share h-10; currency uses invisible label for same top rhythm as amount on all breakpoints */}
        <div className="flex min-w-0 flex-1 items-start gap-4 md:flex-[1.5]">
          {/* Amount */}
          <FormField
            control={form.control}
            name="amount"
            render={({ field }) => (
              <FormItem className="min-w-0 flex-1">
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
                <div className={FIELD_MESSAGE_SLOT_CLASS}>
                  <FormMessage className="break-words" />
                </div>
              </FormItem>
            )}
          />

          {/* Currency Picker */}
          <FormField
            control={form.control}
            name="currency"
            render={({ field }) => (
              <FormItem className="w-fit max-w-full shrink-0">
                <FormLabel
                  className="invisible pointer-events-none select-none"
                  aria-hidden="true"
                >
                  {t("transactionForm.currency.label")}
                </FormLabel>
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
                <div className={FIELD_MESSAGE_SLOT_CLASS}>
                  <FormMessage className="break-words" />
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
            <FormItem className="w-full min-w-0 md:w-auto md:flex-1">
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
              <div className={FIELD_MESSAGE_SLOT_CLASS}>
                <FormMessage className="break-words" />
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
