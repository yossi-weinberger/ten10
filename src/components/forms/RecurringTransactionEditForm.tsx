import React, { useMemo } from "react";
import { Resolver, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";
import toast from "react-hot-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { recurringStatusLabels } from "@/types/recurringTransactionLabels";
import { RecurringTransaction, TransactionType } from "@/types/transaction";
import { CurrencyCode } from "@/lib/currencies";
import { FormActionButtons } from "./transaction-form-parts/FormActionButtons";
import {
  RecurringEditFormValues,
  createRecurringEditSchema,
} from "@/lib/schemas";
import { CurrencyPicker } from "@/components/ui/CurrencyPicker";
import { CurrencyConversionSection } from "./transaction-form-parts/CurrencyConversionSection";
import { CategoryCombobox } from "@/components/ui/category-combobox";
import { useDonationStore } from "@/lib/store";
import { PaymentMethodCombobox } from "@/components/ui/payment-method-combobox";

interface RecurringTransactionEditFormProps {
  initialData: RecurringTransaction;
  onSubmit: (values: RecurringEditFormValues) => Promise<void>;
  onCancel: () => void;
}

export function RecurringTransactionEditForm({
  initialData,
  onSubmit,
  onCancel,
}: RecurringTransactionEditFormProps) {
  const { t, i18n } = useTranslation("transactions");
  const [isSuccess, setIsSuccess] = React.useState(false);
  
  const defaultCurrency = useDonationStore(
    (state) => state.settings.defaultCurrency
  );

  const recurringSchema = useMemo(() => createRecurringEditSchema(t), [t]);

  const form = useForm<RecurringEditFormValues>({
    resolver: zodResolver(recurringSchema) as Resolver<RecurringEditFormValues>,
    mode: "onChange",
    defaultValues: {
      // Handle converted transactions: show original values in form
      amount: initialData.original_amount ?? initialData.amount,
      currency: (initialData.original_currency as CurrencyCode) ?? initialData.currency,
      description: initialData.description ?? "",
      category: initialData.category ?? "",
      payment_method: initialData.payment_method ?? "",
      status: initialData.status,
      total_occurrences: initialData.total_occurrences,
      day_of_month: initialData.day_of_month,
      // Conversion fields from initial data
      conversion_rate: initialData.conversion_rate ?? undefined,
      conversion_date: initialData.conversion_date ?? undefined,
      rate_source: initialData.rate_source ?? undefined,
      original_amount: initialData.original_amount ?? undefined,
      original_currency: initialData.original_currency ?? undefined,
    },
  });

  const status = form.watch("status");
  const selectedCurrency = form.watch("currency");
  const amount = form.watch("amount");

  const handleFormSubmit = async (values: RecurringEditFormValues) => {
    setIsSuccess(false);
    
    // Handle Currency Conversion Logic
    let submissionValues = { ...values };
    const normalizedPaymentMethod =
      values.payment_method && values.payment_method.trim() !== ""
        ? values.payment_method.trim()
        : null;
    submissionValues.payment_method = normalizedPaymentMethod;
    
    if (values.currency !== defaultCurrency) {
      // Foreign currency - conversion is REQUIRED
      if (!values.conversion_rate) {
        logger.error("Cannot submit: foreign currency selected but no conversion rate provided.");
        toast.error(t("transactionForm.errors.missingConversionRate"));
        return;
      }
      
      const originalAmount = values.amount;
      const originalCurrency = values.currency;
      const conversionRate = values.conversion_rate;
      const convertedAmount = Number((originalAmount * conversionRate).toFixed(2));
      
      submissionValues = {
        ...values,
        amount: convertedAmount,
        currency: defaultCurrency as CurrencyCode,
        original_amount: originalAmount,
        original_currency: originalCurrency,
        // conversion_rate, date, source are already in values
      };
      logger.log("Applying currency conversion:", { original: originalAmount, rate: conversionRate, converted: convertedAmount });
    } else {
      // Default currency - clear conversion fields
      submissionValues.original_amount = null;
      submissionValues.original_currency = null;
      submissionValues.conversion_rate = null;
      submissionValues.conversion_date = null;
      submissionValues.rate_source = null;
    }
    
    try {
      await onSubmit(submissionValues);
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
        onCancel(); // Close modal after success
      }, 1500);
    } catch (error) {
      logger.error("Error updating recurring transaction:", error);
    }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleFormSubmit)}
        className="space-y-6"
      >
        <div className="grid grid-cols-2 gap-4">
          {/* Amount and Currency - First Row */}
          <div className="col-span-2 space-y-4">
            <div className="flex flex-row gap-4 items-end">
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
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
                          }
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Currency Conversion Section */}
            {selectedCurrency !== defaultCurrency && (
              <CurrencyConversionSection
                form={form as any}
                selectedCurrency={selectedCurrency}
                amount={amount}
              />
            )}
          </div>

          {/* Description - Second Row */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>{t("transactionForm.description.label")}</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <div className="h-5">
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {/* Category - show for income and expense types */}
          {(initialData.type === "income" || initialData.type === "expense" || 
            initialData.type === "exempt-income" || initialData.type === "recognized-expense") && (
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
                      transactionType={initialData.type as TransactionType}
                      placeholder={
                        initialData.type === "income" || initialData.type === "exempt-income"
                          ? t("transactionForm.category.incomePlaceholder", "קטגוריית הכנסה (אופציונלי)")
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

          {/* Status */}
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("transactionForm.recurringTransaction.status.label")}
                </FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  dir={i18n.dir()}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(recurringStatusLabels).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
                <div className="h-5">
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {/* Payment Method */}
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

          {/* Total Occurrences */}
          <FormField
            control={form.control}
            name="total_occurrences"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  {t("transactionForm.recurringTransaction.totalCount")}
                </FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      field.onChange(value === "" ? null : Number(value));
                    }}
                  />
                </FormControl>
                <div className="h-5">
                  <FormMessage />
                </div>
              </FormItem>
            )}
          />

          {/* Day of Month */}
          {status !== "completed" && (
            <FormField
              control={form.control}
              name="day_of_month"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    {t("transactionForm.recurringTransaction.dayOfMonth")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      {...field}
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
                        field.onChange(value === "" ? null : Number(value));
                      }}
                    />
                  </FormControl>
                  <div className="h-5">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          )}
        </div>

        <FormActionButtons
          isSubmitting={form.formState.isSubmitting}
          isSuccess={isSuccess}
          onCancel={onCancel}
          isEditMode={true}
        />
      </form>
    </Form>
  );
}
