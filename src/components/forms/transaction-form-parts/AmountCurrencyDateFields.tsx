import React from "react";
import { UseFormReturn } from "react-hook-form";
import {
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
import type { TransactionFormValues } from "@/types/forms";
import { type CurrencyObject } from "@/lib/currencies";
import { DatePicker } from "@/components/ui/date-picker";
import { format, parse } from "date-fns";

interface AmountCurrencyDateFieldsProps {
  form: UseFormReturn<TransactionFormValues>;
  availableCurrencies: readonly CurrencyObject[];
}

export function AmountCurrencyDateFields({
  form,
  availableCurrencies,
}: AmountCurrencyDateFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
      {/* Amount and Currency - start */}
      <div className="grid grid-cols-3 gap-4 items-end">
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem className="col-span-2">
              <FormLabel>סכום</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  {...field}
                  value={field.value ?? ""}
                  className="text-start"
                  placeholder="0.00"
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
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="מטבע" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {availableCurrencies.map((currency) => (
                    <SelectItem key={currency.code} value={currency.code}>
                      {`${currency.symbol} ${currency.code}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
      {/* Date - left */}
      <FormField
        control={form.control}
        name="date"
        render={({ field }) => (
          <FormItem>
            <FormLabel>תאריך *</FormLabel>
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
  );
}
