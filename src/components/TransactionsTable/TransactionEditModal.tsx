import React, { useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Transaction, TransactionType, Currency } from "@/types/transaction";
import { TransactionTypeValues } from "@/types/transaction";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transactionBaseSchema } from "@/lib/schemas";
import { useTableTransactionsStore } from "@/lib/tableTransactions.store";
import { usePlatform } from "@/contexts/PlatformContext";
import { transactionTypeLabels } from "@/types/transactionLabels";
import { z } from "zod"; // Import z

// For the edit form, we don't want to validate server-set timestamps like created_at/updated_at
// if they are part of the defaultValues. We only care about fields the user can change.
const transactionUpdateSchema = transactionBaseSchema.partial().extend({
  created_at: z.any().optional(),
  updated_at: z.any().optional(),
});

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

const currencyOptions: Currency[] = ["ILS", "USD", "EUR", "GBP"];

export function TransactionEditModal({
  isOpen,
  onClose,
  transaction,
}: TransactionEditModalProps) {
  const { platform } = usePlatform();
  const updateTransaction = useTableTransactionsStore(
    (state) => state.updateTransaction
  );

  const {
    control,
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<Partial<Transaction>>({
    resolver: zodResolver(transactionUpdateSchema),
    defaultValues: {},
  });

  const isRecurring = watch("is_recurring");

  useEffect(() => {
    if (Object.keys(errors).length > 0) {
      console.error(
        "TransactionEditModal Form Errors:",
        JSON.stringify(errors, null, 2)
      );
    }
  }, [errors]);

  useEffect(() => {
    if (transaction) {
      const defaultVals: Partial<Transaction> = {
        ...transaction,
        date: transaction.date
          ? new Date(transaction.date).toISOString().split("T")[0]
          : "",
      };
      reset(defaultVals);
    } else {
      reset({
        description: "",
        amount: undefined,
        date: new Date().toISOString().split("T")[0],
        currency: "ILS",
        type: "expense",
        is_chomesh: false,
        is_recurring: false,
        category: "",
        recipient: "",
        recurring_day_of_month: undefined,
      });
    }
  }, [transaction, reset]);

  const onSubmit: SubmitHandler<Partial<Transaction>> = async (data) => {
    console.log(
      "TransactionEditModal: onSubmit triggered with form data:",
      data
    );
    console.log("Transaction being edited:", transaction);
    console.log("Current platform:", platform);
    console.log("Is Submitting flag:", isSubmitting);

    if (!transaction || !transaction.id || platform === "loading") {
      console.warn(
        "TransactionEditModal: onSubmit aborted due to missing transaction, ID, or platform loading."
      );
      return;
    }

    const updatePayload: Partial<Transaction> = {};

    (Object.keys(data) as Array<keyof Partial<Transaction>>).forEach((key) => {
      const value = data[key];
      if (value !== undefined && value !== null && value !== "") {
        updatePayload[key] = value as any;
      } else if (value === null) {
        updatePayload[key] = null as any;
      }
    });

    updatePayload.is_chomesh = data.is_chomesh ?? false;
    updatePayload.is_recurring = data.is_recurring ?? false;

    if (!updatePayload.is_recurring) {
      updatePayload.recurring_day_of_month = null;
    }

    console.log(
      "Attempting to update transaction ID:",
      transaction.id,
      "with constructed payload:",
      updatePayload
    );
    try {
      await updateTransaction(transaction.id, updatePayload, platform);
      console.log("TransactionEditModal: updateTransaction call finished.");
      onClose();
    } catch (error) {
      console.error(
        "TransactionEditModal: Error calling updateTransaction:",
        error
      );
      // Potentially set a local error state to display in the modal
    }
  };

  if (!isOpen || !transaction) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] md:max-w-[600px]" dir="rtl">
        <DialogHeader>
          <DialogTitle>עריכת תנועה</DialogTitle>
          <DialogDescription>
            עדכן את פרטי התנועה. לחץ על שמירה בסיום.
          </DialogDescription>
        </DialogHeader>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2"
        >
          {/* Date */}
          <div>
            <Label htmlFor="date">תאריך</Label>
            <Input
              id="date"
              type="date"
              {...register("date")}
              className="mt-1"
            />
            {errors.date && (
              <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">תיאור</Label>
            <Input
              id="description"
              {...register("description")}
              placeholder="לדוגמה: קניות בסופר"
              className="mt-1"
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1">
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Amount */}
          <div>
            <Label htmlFor="amount">סכום</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              {...register("amount")}
              className="mt-1"
            />
            {errors.amount && (
              <p className="text-red-500 text-xs mt-1">
                {errors.amount.message}
              </p>
            )}
          </div>

          {/* Currency */}
          <div>
            <Label htmlFor="currency">מטבע</Label>
            <Controller
              name="currency"
              control={control}
              defaultValue={transaction?.currency || "ILS"}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="בחר מטבע" />
                  </SelectTrigger>
                  <SelectContent>
                    {currencyOptions.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.currency && (
              <p className="text-red-500 text-xs mt-1">
                {errors.currency.message}
              </p>
            )}
          </div>

          {/* Type */}
          <div>
            <Label htmlFor="type">סוג תנועה</Label>
            <Controller
              name="type"
              control={control}
              defaultValue={transaction?.type || "expense"}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="בחר סוג תנועה" />
                  </SelectTrigger>
                  <SelectContent>
                    {TransactionTypeValues.map((typeVal) => (
                      <SelectItem key={typeVal} value={typeVal}>
                        {transactionTypeLabels[typeVal as TransactionType] ||
                          typeVal}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.type && (
              <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <Label htmlFor="category">קטגוריה</Label>
            <Input
              id="category"
              {...register("category")}
              placeholder="לדוגמה: מזון, תחבורה"
              className="mt-1"
            />
            {errors.category && (
              <p className="text-red-500 text-xs mt-1">
                {errors.category.message}
              </p>
            )}
          </div>

          {/* Recipient */}
          <div>
            <Label htmlFor="recipient">נמען/משלם</Label>
            <Input
              id="recipient"
              {...register("recipient")}
              placeholder="לדוגמה: סופרמרקט XYZ, מקום עבודה"
              className="mt-1"
            />
            {errors.recipient && (
              <p className="text-red-500 text-xs mt-1">
                {errors.recipient.message}
              </p>
            )}
          </div>

          {/* Checkboxes */}
          <div className="space-y-2">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Controller
                name="is_chomesh"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="is_chomesh"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="is_chomesh" className="font-normal">
                הפרשת חומש?
              </Label>
            </div>
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
              <Controller
                name="is_recurring"
                control={control}
                render={({ field }) => (
                  <Checkbox
                    id="is_recurring"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
              <Label htmlFor="is_recurring" className="font-normal">
                תנועה קבועה?
              </Label>
            </div>
          </div>

          {isRecurring && (
            <>
              <div>
                <Label htmlFor="recurring_day_of_month">
                  יום בחודש לתנועה קבועה (1-31)
                </Label>
                <Input
                  id="recurring_day_of_month"
                  type="number"
                  {...register("recurring_day_of_month")}
                  className="mt-1"
                />
                {errors.recurring_day_of_month && (
                  <p className="text-red-500 text-xs mt-1">
                    {errors.recurring_day_of_month.message}
                  </p>
                )}
              </div>
            </>
          )}

          <DialogFooter className="pt-4">
            <DialogClose asChild>
              <Button type="button" variant="outline">
                ביטול
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "שומר..." : "שמור שינויים"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
