import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { nanoid } from "nanoid";
import { useDonationStore } from "@/lib/store";
import { addTransaction } from "@/lib/dataService";
import { Transaction, TransactionType } from "@/types/transaction";
import { Button } from "@/components/ui/button";
import {
  Form,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Wallet, CreditCard, HandCoins, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
// We will need date picker and potentially checkbox later

// Define the possible transaction types for the form select
const allTransactionTypes = [
  "income",
  "donation",
  "expense",
  "exempt-income",
  "recognized-expense",
] as const; // Use 'as const' for Zod enum

// Define user-facing types to show in the dropdown
const userFacingTransactionTypes: TransactionType[] = [
  "income",
  "expense",
  "donation",
];

// Hebrew labels for transaction types
const transactionTypeLabels: Record<TransactionType, string> = {
  income: "הכנסה",
  donation: "תרומה",
  expense: "הוצאה",
  "exempt-income": "הכנסה פטורה", // For future use
  "recognized-expense": "הוצאה מוכרת", // For future use
};

// Base Zod schema - use allTransactionTypes for validation
const transactionFormSchema = z
  .object({
    // We'll get ID, userId, createdAt, updatedAt programmatically
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"), // Placeholder - replace with date picker validation later
    amount: z.preprocess(
      (val) => (val === "" ? undefined : val), // Convert empty string to undefined first
      z.coerce // Then coerce
        .number({
          invalid_type_error: "הסכום חייב להיות מספר",
        })
        .positive({ message: "הסכום חייב להיות חיובי" })
    ),
    currency: z.string().min(1, "Currency is required"), // Later refine with Currency type from store
    description: z.string().optional(),
    type: z.enum(allTransactionTypes, {
      // Validate against all possible types
      required_error: "יש לבחור סוג טרנזקציה", // Translate error message
    }),
    category: z.string().optional(),
    // Conditional fields
    isChomesh: z.boolean().optional(),
    recipient: z.string().optional(),
    // New boolean fields for UI control
    isExempt: z.boolean().optional(),
    isRecognized: z.boolean().optional(),

    // Recurring fields
    is_recurring: z.boolean().optional(),
    recurring_day_of_month: z.preprocess(
      // Allow empty string or null to become undefined for optional validation
      (val) => (val === "" || val === null ? undefined : val),
      z.coerce
        .number({ invalid_type_error: "חייב להיות מספר" })
        .int({ message: "חייב להיות מספר שלם" })
        .min(1, { message: "היום חייב להיות בין 1 ל-31" })
        .max(31, { message: "היום חייב להיות בין 1 ל-31" })
        .optional() // Make it optional initially
    ),
    recurringTotalCount: z.preprocess(
      // Allow empty string or null to become undefined for optional validation
      (val) => (val === "" || val === null ? undefined : val),
      z.coerce
        .number({ invalid_type_error: "חייב להיות מספר" })
        .int({ message: "חייב להיות מספר שלם" })
        .positive({ message: "מספר החזרות חייב להיות חיובי" })
        .optional()
    ),
  })
  .refine(
    (data) => {
      // isChomesh cannot be true if isExempt is true
      if (data.type === "income" && data.isExempt && data.isChomesh) {
        return false;
      }
      return true;
    },
    {
      message: "לא ניתן לסמן חומש עבור הכנסה פטורה",
      path: ["isChomesh"], // Attach error to isChomesh field
    }
  )
  // Refine for recurring fields
  .refine(
    (data) => {
      // If it's recurring, day must be provided
      if (
        data.is_recurring &&
        (data.recurring_day_of_month === undefined ||
          data.recurring_day_of_month === null)
      ) {
        return false;
      }
      return true;
    },
    {
      message: "יש לבחור יום בחודש עבור הוראת קבע",
      path: ["recurring_day_of_month"], // Attach error to the day field
    }
  )
  .refine(
    (data) => {
      // If it's recurring and recurringTotalCount is provided, it must be a positive number
      if (
        data.is_recurring &&
        data.recurringTotalCount !== undefined &&
        data.recurringTotalCount !== null &&
        data.recurringTotalCount <= 0
      ) {
        return false;
      }
      return true;
    },
    {
      message: "מספר החזרות חייב להיות גדול מאפס",
      path: ["recurringTotalCount"],
    }
  )
  .refine(
    (data) => {
      // If it's NOT recurring, day must be null/undefined
      if (
        !data.is_recurring &&
        data.recurring_day_of_month !== undefined &&
        data.recurring_day_of_month !== null
      ) {
        // This case shouldn't happen if UI is correct, but good for robustness
        // We'll handle setting it to null in onSubmit, so just return true here
        // Alternatively, you could clear it here using a transform, but refine is simpler
        return true;
      }
      return true;
    },
    {
      // No message needed as we handle this in onSubmit
      path: ["recurring_day_of_month"],
    }
  );
// TODO: Use discriminatedUnion or refine schema for conditional requirements:
// - isChomesh: required if type is 'income'
// - recipient: required if type is 'donation'
// - category: perhaps more relevant for 'expense'/'recognized-expense'

type TransactionFormValues = z.infer<typeof transactionFormSchema>;

interface TransactionFormProps {
  // initialData?: Transaction; // For editing later
  onSubmitSuccess?: () => void; // Callback after successful submission
  onCancel?: () => void; // Callback for cancel action
}

// Define explicit type for button styles
type ButtonStyleType = "income" | "expense" | "donation";

// Define active button styles object outside the loop
const activeButtonStyles: Record<ButtonStyleType, string> = {
  income:
    "bg-green-100 hover:bg-green-200 dark:bg-green-900 dark:hover:bg-green-800 border-green-300 dark:border-green-700 text-green-800 dark:text-green-100 shadow-sm",
  expense:
    "bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 border-red-300 dark:border-red-700 text-red-800 dark:text-red-100 shadow-sm",
  donation:
    "bg-yellow-100 hover:bg-yellow-200 dark:bg-yellow-900 dark:hover:bg-yellow-800 border-yellow-400 dark:border-yellow-700 text-yellow-800 dark:text-yellow-100 shadow-sm",
};

const backgroundStyles: Record<ButtonStyleType, string> = {
  income: "bg-green-50 dark:bg-green-950",
  expense: "bg-red-50 dark:bg-red-950",
  donation: "bg-yellow-50 dark:bg-yellow-950",
};

export function TransactionForm({
  onSubmitSuccess,
  onCancel,
}: TransactionFormProps) {
  const defaultCurrency = useDonationStore(
    (state) => state.settings.defaultCurrency
  );
  // TODO: Fetch available currencies if needed, or use the type from store
  const availableCurrencies = ["ILS", "USD", "EUR"];

  // State for success animation
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0],
      amount: undefined,
      currency: defaultCurrency,
      description: "",
      type: "income",
      category: "",
      isChomesh: false,
      recipient: "",
      isExempt: false,
      isRecognized: false,
      is_recurring: false,
      recurring_day_of_month: undefined,
      recurringTotalCount: undefined,
    },
  });

  const selectedType = form.watch("type");
  const isExemptChecked = form.watch("isExempt");
  const isRecognizedChecked = form.watch("isRecognized");
  const isRecurringChecked = form.watch("is_recurring");

  async function onSubmit(values: TransactionFormValues) {
    // Determine the final transaction type based on initial type and checkboxes
    let finalType: TransactionType;
    if (values.type === "income") {
      finalType = values.isExempt ? "exempt-income" : "income";
    } else if (values.type === "expense") {
      finalType = values.isRecognized ? "recognized-expense" : "expense";
    } else {
      finalType = values.type as TransactionType; // Should be 'donation' here
    }

    const newTransaction: Omit<
      Transaction,
      "isExempt" | "isRecognized" // Exclude helper fields
    > = {
      id: nanoid(),
      user_id: null,
      date: values.date,
      amount: values.amount,
      currency: values.currency as any,
      description: values.description || null,
      type: finalType, // Use the determined final type
      category: values.category || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Conditionally add isChomesh only if the final type is 'income'
      ...(finalType === "income" && { isChomesh: values.isChomesh || false }),
      // Conditionally add recipient only if the final type is 'donation' (redundant check, but safe)
      ...(finalType === "donation" && {
        recipient: values.recipient || null,
      }),
      // Add recurring fields
      is_recurring: values.is_recurring || false,
      recurring_day_of_month: values.is_recurring
        ? values.recurring_day_of_month
        : null,
      recurringTotalCount:
        values.is_recurring && values.recurringTotalCount
          ? values.recurringTotalCount
          : null,
    };

    // DEBUG: Log the object being sent to the backend
    console.log("Submitting transaction object:", newTransaction);

    console.log("Submitting final transaction object:", newTransaction);
    try {
      await addTransaction(newTransaction as Transaction);
      console.log("Transaction added successfully!");

      // Get the current type before resetting
      const currentType = form.getValues("type");

      // Reset the form, preserving the selected type and default currency
      console.log(
        "Attempting to reset form. Current amount before reset:",
        form.getValues("amount")
      ); // DEBUG
      form.reset({
        date: new Date().toISOString().split("T")[0],
        amount: undefined, // Reset amount back to undefined to satisfy TypeScript
        currency: defaultCurrency,
        description: "",
        type: currentType, // Preserve the current type
        category: "",
        isChomesh: false,
        recipient: "",
        isExempt: false,
        isRecognized: false,
        is_recurring: false, // Reset recurring flag
        recurring_day_of_month: undefined, // Reset recurring day
        recurringTotalCount: undefined,
      });

      // Trigger success animation
      setIsSuccess(true);
      setTimeout(() => {
        setIsSuccess(false);
      }, 2000); // Hide after 2 seconds

      onSubmitSuccess?.();
    } catch (error) {
      console.error("Failed to add transaction:", error);
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn(
          "space-y-6 p-4 rounded-xl transition-colors duration-200",
          backgroundStyles[selectedType as ButtonStyleType]
        )}
      >
        {/* Type Selection Buttons */}
        <div>
          <FormLabel>סוג פעולה *</FormLabel>
          <div className="grid grid-cols-3 gap-2 mt-2">
            {/* Explicitly cast mapped type to ButtonStyleType if safe */}
            {(userFacingTransactionTypes as ButtonStyleType[]).map((type) => (
              <Button
                key={type}
                type="button"
                onClick={() => {
                  form.setValue("type", type, { shouldValidate: true });
                }}
                className={cn(
                  "flex flex-col h-auto py-3 px-2 text-center transition-colors duration-150", // Base classes
                  selectedType === type
                    ? activeButtonStyles[type] // Use the pre-defined styles object
                    : // Inactive state colors
                      "border border-input bg-transparent hover:bg-accent hover:text-accent-foreground text-foreground"
                )}
              >
                {type === "income" && (
                  <Wallet className="h-5 w-5 mb-1 mx-auto" />
                )}
                {type === "expense" && (
                  <CreditCard className="h-5 w-5 mb-1 mx-auto" />
                )}
                {type === "donation" && (
                  <HandCoins className="h-5 w-5 mb-1 mx-auto" />
                )}
                {transactionTypeLabels[type]}
              </Button>
            ))}
          </div>
          {/* Display validation message for the type field if needed */}
          {form.formState.errors.type && (
            <p className="text-sm font-medium text-destructive mt-1">
              {form.formState.errors.type.message}
            </p>
          )}
        </div>
        {/* סכום (כולל מטבע) ותאריך באותה שורה */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
          {/* Amount and Currency - start */}
          <div className="grid grid-cols-3 gap-4 items-end">
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem className="col-span-2">
                  <FormLabel>סכום *</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      {...field}
                      value={
                        field.value === undefined || field.value === null
                          ? ""
                          : field.value
                      }
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
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="מטבע" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {availableCurrencies.map((currency) => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
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
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        {/* תיאור וקטגוריה/מקבל תרומה באותה שורה */}
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
                <FormMessage />
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
                  <FormMessage />
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
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
        </div>
        {/* כל הצ'קבוקסים בשורה אחת כריבועים */}
        <div className="flex flex-row gap-4 mt-2 w-full">
          {selectedType === "income" && (
            <>
              {/* הכנסה פטורה ממעשר */}
              <div className="flex-1 flex flex-col items-center justify-between rounded-lg p-3 shadow-sm min-w-[100px]">
                <span className="text-xs font-medium mb-1 text-center">
                  הכנסה פטורה ממעשר?
                </span>
                <span className="text-[11px] text-muted-foreground text-center mb-2">
                  יש לסמן אם הכנסה זו אינה חייבת כלל במעשר (למשל, מתנה מסויימת,
                  החזר הוצאה).
                </span>
                <FormField
                  control={form.control}
                  name="isExempt"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      className="size-6 rounded border"
                    />
                  )}
                />
              </div>
              {/* חומש */}
              <div className="flex-1 flex flex-col items-center justify-between rounded-lg p-3 shadow-sm min-w-[100px]">
                <span className="text-xs font-medium mb-1 text-center">
                  לחשב חומש (20%)?
                </span>
                <span className="text-[11px] text-muted-foreground text-center mb-2">
                  יש לסמן אם ההכנסה דורשת הפרשת 20% במקום 10%.
                </span>
                <FormField
                  control={form.control}
                  name="isChomesh"
                  render={({ field }) => (
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isExemptChecked}
                      className="size-6 rounded border"
                    />
                  )}
                />
              </div>
            </>
          )}
          {selectedType === "expense" && (
            <div className="flex-1 flex flex-col items-center justify-between rounded-lg p-3 shadow-sm min-w-[100px]">
              <span className="text-xs font-medium mb-1 text-center">
                הוצאה מוכרת?
              </span>
              <span className="text-[11px] text-muted-foreground text-center mb-2">
                יש לסמן אם זו הוצאה המוכרת לניכוי מהכנסות החייבות במעשר (10%
                מההוצאה ינוכה מהחוב).
              </span>
              <FormField
                control={form.control}
                name="isRecognized"
                render={({ field }) => (
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    className="size-6 rounded border"
                  />
                )}
              />
            </div>
          )}
          {/* הוראת קבע */}
          <div className="flex-1 flex flex-col items-center justify-between rounded-lg p-3 shadow-sm min-w-[100px]">
            <span className="text-xs font-medium mb-1 text-center">
              הוראת קבע
            </span>
            <span className="text-[11px] text-muted-foreground text-center mb-2">
              סמן אם זוהי טרנזקציה שחוזרת באופן קבוע.
            </span>
            <FormField
              control={form.control}
              name="is_recurring"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  className="size-6 rounded border"
                />
              )}
            />
          </div>
        </div>
        {/* Recurring fields section */}
        {isRecurringChecked && (
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
                      value={field.value ?? ""}
                      onChange={(e) => {
                        const value = e.target.value;
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
        )}
        {/* Submit and Cancel Buttons */}
        <div className="flex justify-end items-center space-x-2">
          {/* Success Icon Animation */}
          {isSuccess && (
            <CheckCircle className="h-5 w-5 text-green-500 animate-pulse" />
          )}

          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              ביטול
            </Button>
          )}
          <Button
            type="submit"
            disabled={form.formState.isSubmitting || isSuccess}
          >
            {form.formState.isSubmitting ? "שומר..." : "שמור פעולה"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
