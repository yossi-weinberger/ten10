import React from "react";
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
// We will need date picker and potentially checkbox later

// Define the possible transaction types for the form select
const transactionTypes = [
  "income",
  "donation",
  "expense",
  "exempt-income",
  "recognized-expense",
] as const; // Use 'as const' for Zod enum

// Base Zod schema - will need refinement for conditional logic
const transactionFormSchema = z.object({
  // We'll get ID, userId, createdAt, updatedAt programmatically
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"), // Placeholder - replace with date picker validation later
  amount: z.coerce.number().positive("Amount must be positive"),
  currency: z.string().min(1, "Currency is required"), // Later refine with Currency type from store
  description: z.string().optional(),
  type: z.enum(transactionTypes, {
    required_error: "Transaction type is required",
  }),
  category: z.string().optional(),
  // Conditional fields
  isChomesh: z.boolean().optional(),
  recipient: z.string().optional(),
});

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

export function TransactionForm({
  onSubmitSuccess,
  onCancel,
}: TransactionFormProps) {
  const defaultCurrency = useDonationStore(
    (state) => state.settings.defaultCurrency
  );
  // TODO: Fetch available currencies if needed, or use the type from store
  const availableCurrencies = ["ILS", "USD", "EUR"];

  const form = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionFormSchema),
    defaultValues: {
      date: new Date().toISOString().split("T")[0], // Default to today
      amount: 0,
      currency: defaultCurrency,
      description: "",
      type: undefined, // No default type initially
      category: "",
      isChomesh: false,
      recipient: "",
    },
  });

  const selectedType = form.watch("type");

  async function onSubmit(values: TransactionFormValues) {
    const newTransaction: Transaction = {
      id: nanoid(), // Generate unique ID
      user_id: null, // Null for desktop
      date: values.date, // TODO: Format from date picker if needed
      amount: values.amount,
      currency: values.currency as any, // TODO: Ensure type safety from availableCurrencies
      description: values.description || null,
      type: values.type as TransactionType, // Cast to TransactionType
      category: values.category || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // Only include type-specific fields if relevant
      ...(values.type === "income" && { isChomesh: values.isChomesh || false }),
      ...(values.type === "donation" && {
        recipient: values.recipient || null,
      }),
    };

    console.log("Submitting new transaction:", newTransaction);
    try {
      await addTransaction(newTransaction);
      console.log("Transaction added successfully!");
      form.reset(); // Reset form after successful submission
      onSubmitSuccess?.(); // Call the success callback if provided
    } catch (error) {
      console.error("Failed to add transaction:", error);
      // TODO: Show error to user (e.g., using react-hot-toast or Sonner)
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Type Selection */}
        <FormField
          control={form.control}
          name="type"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select transaction type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {transactionTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {/* TODO: Capitalize/translate type names for display */}
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Date Field - Placeholder, needs DatePicker */}
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date *</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Amount Field */}
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount *</FormLabel>
              <FormControl>
                <Input type="number" step="0.01" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Currency Field */}
        <FormField
          control={form.control}
          name="currency"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Currency *</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select currency" />
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

        {/* Description Field */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* --- Conditional Fields --- */}

        {/* isChomesh (for income) */}
        {selectedType === "income" && (
          <FormField
            control={form.control}
            name="isChomesh"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">
                    Calculate Chomesh (20%)?
                  </FormLabel>
                  <FormDescription>
                    Check this if the income requires a 20% tithe instead of
                    10%.
                  </FormDescription>
                </div>
                <FormControl>
                  {/* TODO: Replace with shadcn/ui Checkbox */}
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        )}

        {/* Recipient (for donation) */}
        {selectedType === "donation" && (
          <FormField
            control={form.control}
            name="recipient"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Recipient/Purpose *</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="e.g., Charity Name, Tuition" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Category (for expense/recognized-expense) */}
        {(selectedType === "expense" ||
          selectedType === "recognized-expense") && (
          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  {/* TODO: Replace with Select or Autocomplete using predefined categories */}
                  <Input {...field} placeholder="e.g., Groceries, Travel" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        {/* Submit and Cancel Buttons */}
        <div className="flex justify-end space-x-2">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save Transaction"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
