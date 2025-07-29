import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
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

export const recurringEditSchema = z.object({
  amount: z.coerce.number().positive({ error: "הסכום חייב להיות חיובי" }),
  currency: z.enum(["ILS", "USD", "EUR"]),
  description: z.string().optional(),
  status: z.enum(["active", "paused", "completed", "cancelled"]),
  total_occurrences: z.coerce.number().int().positive().optional().nullable(),
  day_of_month: z.coerce
    .number()
    .int()
    .min(1, { error: "היום בחודש חייב להיות בין 1 ל-31" })
    .max(31, { error: "היום בחודש חייב להיות בין 1 ל-31" })
    .optional()
    .nullable(),
});

type RecurringEditFormValues = z.infer<typeof recurringEditSchema>;

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
  const [isSuccess, setIsSuccess] = React.useState(false);

  const form = useForm<RecurringEditFormValues>({
    resolver: zodResolver(recurringEditSchema),
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
      console.error("Error updating recurring transaction:", error);
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
                <FormLabel>תיאור</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
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
                  <FormLabel>סכום</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.01" {...field} />
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
                  <FormLabel>מטבע</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    dir="rtl"
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
                  <FormMessage />
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
                <FormLabel>סטטוס</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  dir="rtl"
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
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Total Occurrences */}
          <FormField
            control={form.control}
            name="total_occurrences"
            render={({ field }) => (
              <FormItem>
                <FormLabel>מספר חזרות (ריק ללא הגבלה)</FormLabel>
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
                <FormMessage />
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
                  <FormLabel>יום חיוב בחודש</FormLabel>
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
                  <FormMessage />
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
