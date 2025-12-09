import React, { useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { logger } from "@/lib/logger";
import { useTranslation } from "react-i18next";
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
import { RecurringTransaction } from "@/types/transaction";
import { CURRENCIES, CurrencyObject } from "@/lib/currencies";
import { FormActionButtons } from "./transaction-form-parts/FormActionButtons";
import {
  RecurringEditFormValues,
  createRecurringEditSchema,
} from "@/lib/schemas";

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

  const recurringSchema = useMemo(() => createRecurringEditSchema(t), [t]);

  const form = useForm<RecurringEditFormValues>({
    resolver: zodResolver(recurringSchema),
    mode: "onChange",
    defaultValues: {
      amount: initialData.amount,
      currency: initialData.currency as "ILS" | "USD" | "EUR",
      description: initialData.description ?? "",
      status: initialData.status,
      total_occurrences: initialData.total_occurrences,
      day_of_month: initialData.day_of_month,
    },
  });

  const status = form.watch("status");

  const handleFormSubmit = async (values: RecurringEditFormValues) => {
    setIsSuccess(false);
    try {
      await onSubmit(values);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Description */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem className="md:col-span-2">
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

          {/* Amount and Currency */}
          <div className="grid grid-cols-3 gap-2 items-end">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>{t("transactionForm.amount.label")}</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
                  </FormControl>
                  <div className="h-5">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("transactionForm.currency.label")}</FormLabel>
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
                      {CURRENCIES.map((c: CurrencyObject) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="h-5">
                    <FormMessage />
                  </div>
                </FormItem>
              )}
            />
          </div>

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
