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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { TransactionFormValues } from "@/types/forms";

interface RecurringFieldsProps {
  form: UseFormReturn<TransactionFormValues>;
  // No need for isRecurringChecked here, as this component will only be rendered if true
}

export function RecurringFields({ form }: RecurringFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 p-4 border rounded-lg shadow-sm">
      <FormField
        control={form.control}
        name="frequency"
        render={({ field }) => (
          <FormItem>
            <FormLabel>תדירות</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger>
                  <SelectValue placeholder="בחר תדירות..." />
                </SelectTrigger>
              </FormControl>
              <SelectContent>
                <SelectItem value="monthly">חודשי</SelectItem>
                <SelectItem value="weekly" disabled>
                  שבועי (בקרוב)
                </SelectItem>
                <SelectItem value="yearly" disabled>
                  שנתי (בקרוב)
                </SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      <FormField
        control={form.control}
        name="recurring_day_of_month"
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
            <FormLabel>מספר חזרות (ריק ללא הגבלה)</FormLabel>
            <FormControl>
              <Input
                type="number"
                min={1}
                {...field}
                value={field.value ?? ""}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
