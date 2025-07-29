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
import { TransactionFormValues } from "@/lib/schemas";
import { TransactionType } from "@/types/transaction"; // Import TransactionType

interface DescriptionCategoryFieldsProps {
  form: UseFormReturn<TransactionFormValues>;
  selectedType: TransactionType;
}

export function DescriptionCategoryFields({
  form,
  selectedType,
}: DescriptionCategoryFieldsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
      {/* Description - start */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>תיאור</FormLabel>
            <FormControl>
              <Input
                {...field}
                placeholder="תיאור הפעולה (אופציונלי)"
                className="text-start"
              />
            </FormControl>
            <div className="h-5">
              <FormMessage />
            </div>
          </FormItem>
        )}
      />
      {/* קטגוריה או מקבל תרומה - left */}
      {selectedType === "expense" && (
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>קטגוריה</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="קטגוריית הוצאה (אופציונלי)"
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
      {selectedType === "donation" && (
        <FormField
          control={form.control}
          name="recipient"
          render={({ field }) => (
            <FormItem>
              <FormLabel>מקבל/ת התרומה</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  placeholder="שם המקבל/ת (אופציונלי)"
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
    </div>
  );
}
