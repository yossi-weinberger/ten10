import React from "react";
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
  const { t } = useTranslation("transactions");
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
      {/* Description - start */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{t("transactionForm.description.label")}</FormLabel>
            <FormControl>
              <Input
                {...field}
                value={field.value ?? ""}
                placeholder={t("transactionForm.description.placeholder")}
                className="text-start"
                autoComplete="on"
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
              <FormLabel>{t("transactionForm.category.label")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder={t("transactionForm.category.placeholder")}
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
              <FormLabel>{t("transactionForm.recipient.label")}</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  value={field.value ?? ""}
                  placeholder={t("transactionForm.recipient.placeholder")}
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
