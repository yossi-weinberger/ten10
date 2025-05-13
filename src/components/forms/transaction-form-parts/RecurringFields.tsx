import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import type { TransactionFormValues } from "../TransactionForm"; // Adjust path as needed

interface RecurringFieldsProps {
  form: UseFormReturn<TransactionFormValues>;
  // No need for isRecurringChecked here, as this component will only be rendered if true
}

export function RecurringFields({ form }: RecurringFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 border rounded-lg shadow-sm">
      <FormField
        control={form.control}
        name="recurring_day_of_month"
        render={({ field }) => (
          <FormItem>
            <FormLabel>יום בחודש לחיוב</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="לדוגמה: 15"
                {...field}
                value={field.value ?? ""} // Ensure value is not null/undefined for input
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string to clear the field, which will be handled by Zod preprocess
                  field.onChange(value === "" ? null : Number(value));
                }}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="recurringTotalCount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>מספר חזרות (אופציונלי)</FormLabel>
            <FormControl>
              <Input
                type="number"
                placeholder="לדוגמה: 6 (לחצי שנה)"
                {...field}
                value={field.value ?? ""} // Ensure value is not null/undefined for input
                onChange={(e) => {
                  const value = e.target.value;
                  // Allow empty string to clear the field, which will be handled by Zod preprocess
                  field.onChange(value === "" ? null : Number(value));
                }}
              />
            </FormControl>
            <FormDescription>
              השאר ריק להוראת קבע ללא הגבלת חזרות.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
