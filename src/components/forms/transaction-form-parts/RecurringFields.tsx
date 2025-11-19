import React from "react";
import { useTranslation } from "react-i18next";
import { UseFormReturn } from "react-hook-form";
import { InfoIcon } from "lucide-react";
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
import { TransactionFormValues } from "@/lib/schemas";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RecurringFieldsProps {
  form: UseFormReturn<TransactionFormValues>;
  // No need for isRecurringChecked here, as this component will only be rendered if true
}

export function RecurringFields({ form }: RecurringFieldsProps) {
  const { t } = useTranslation("transactions");
  return (
    <div className="space-y-4 mt-4 p-4 border rounded-lg shadow-sm bg-muted/10">
      <Alert className="bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/30 dark:text-blue-100 dark:border-blue-800">
        <InfoIcon className="h-4 w-4" />
        <AlertTitle className="font-semibold">
          {t("transactionForm.recurringTransaction.isRecurring")}
        </AlertTitle>
        <AlertDescription className="text-sm mt-1">
          {t("transactionForm.recurringTransaction.explanation")}
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <FormField
          control={form.control}
          name="frequency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("transactionForm.recurringTransaction.frequency.label")}
              </FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t(
                        "transactionForm.recurringTransaction.frequency.placeholder"
                      )}
                    />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="monthly">
                    {t(
                      "transactionForm.recurringTransaction.frequency.monthly"
                    )}
                  </SelectItem>
                  <SelectItem value="weekly" disabled>
                    {t("transactionForm.recurringTransaction.frequency.weekly")}{" "}
                    ({t("transactionForm.recurringTransaction.comingSoon")})
                  </SelectItem>
                  <SelectItem value="yearly" disabled>
                    {t("transactionForm.recurringTransaction.frequency.yearly")}{" "}
                    ({t("transactionForm.recurringTransaction.comingSoon")})
                  </SelectItem>
                </SelectContent>
              </Select>
              <div className="h-5">
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="recurring_day_of_month"
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
                />
              </FormControl>
              <div className="h-5">
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="recurringTotalCount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>
                {t("transactionForm.recurringTransaction.totalCount")}
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={1}
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <div className="h-5">
                <FormMessage />
              </div>
            </FormItem>
          )}
        />
      </div>
    </div>
  );
}
