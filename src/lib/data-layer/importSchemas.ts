import { z } from "zod";

/**
 * Zod schema for a single transaction item from import.
 * Permissive to allow for various export formats/versions, but ensures critical fields exist.
 */
export const ImportTransactionItemSchema = z
  .object({
    // Critical fields - try to coerce, but fail if missing
    amount: z.coerce.number(),
    date: z.string(),

    // Allow any other properties (including camelCase variants)
    // We will normalize them later
  })
  .passthrough();

/**
 * Zod schema for a single recurring transaction item.
 */
export const ImportRecurringItemSchema = z
  .object({
    // Recurring usually has amount/currency etc, but might be partial
    // We just ensure it's an object
  })
  .passthrough();

/**
 * V1 Import Format: A simple array of transactions.
 */
export const ImportV1Schema = z.array(ImportTransactionItemSchema);

/**
 * V2 Import Format: An object with version and separate arrays.
 */
export const ImportV2Schema = z.object({
  version: z.number().optional(),
  transactions: z.array(ImportTransactionItemSchema).optional().default([]),
  recurring_transactions: z
    .array(ImportRecurringItemSchema)
    .optional()
    .default([]),
});

/**
 * Combined Import Schema.
 * Accepts either V1 array or V2 object.
 * Normalize output to V2 structure: { transactions, recurring_transactions }.
 */
export const ImportFileSchema = z.union([
  // If it's an array, treat as V1 and transform to V2 shape
  ImportV1Schema.transform((txs) => ({
    transactions: txs,
    recurring_transactions: [],
    version: 1,
  })),
  // If it's an object, validate as V2
  ImportV2Schema,
]);

export type ImportFileParsed = z.infer<typeof ImportFileSchema>;
export type ImportTransactionItem = z.infer<typeof ImportTransactionItemSchema>;
export type ImportRecurringItem = z.infer<typeof ImportRecurringItemSchema>;
