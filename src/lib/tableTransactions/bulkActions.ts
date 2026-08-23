import type {
  RecurringTransaction,
  Transaction,
  TransactionType,
} from "@/types/transaction";

export type TransactionBulkField = "payment_method" | "category";
export type RecurringBulkField = "status" | "payment_method" | "category";
export type RecurringBulkStatusValue = Exclude<
  RecurringTransaction["status"],
  "completed"
>;

export type TransactionBulkChange = {
  kind: "transaction";
  field: TransactionBulkField;
  value: string | null;
};

export type RecurringBulkChange =
  | {
      kind: "recurring";
      field: "status";
      value: RecurringBulkStatusValue;
    }
  | {
      kind: "recurring";
      field: Exclude<RecurringBulkField, "status">;
      value: string | null;
    };

export type TransactionBulkRow = Pick<
  Transaction,
  "id" | "type" | "payment_method" | "category"
>;

export type RecurringBulkRow = Pick<
  RecurringTransaction,
  "id" | "type" | "status" | "payment_method" | "category"
>;

export type BulkEditBlockReason =
  | "empty-selection"
  | "initial-balance"
  | "completed-recurring"
  | "mixed-category-family"
  | "category-not-applicable";

export type BulkEditAvailability =
  | { allowed: true }
  | { allowed: false; reason: BulkEditBlockReason };

export type BulkCategoryFamily = CategoryFamily;

export type BulkEditAvailabilityRequest =
  | {
      kind: "transaction";
      rows: readonly TransactionBulkRow[];
      field: TransactionBulkField;
    }
  | {
      kind: "recurring";
      rows: readonly RecurringBulkRow[];
      field: RecurringBulkField;
    };

export const RECURRING_BULK_STATUS_VALUES = [
  "active",
  "paused",
  "cancelled",
] as const satisfies readonly RecurringBulkStatusValue[];

type CategoryFamily = "income" | "expense";

export function isRecurringBulkStatusValue(
  value: string,
): value is RecurringBulkStatusValue {
  return RECURRING_BULK_STATUS_VALUES.includes(
    value as RecurringBulkStatusValue,
  );
}

export function getBulkCategoryFamily(
  rows: readonly { type: TransactionType }[],
): BulkCategoryFamily | null {
  if (rows.length === 0) {
    return null;
  }

  const families = rows.map((row) => getCategoryFamily(row.type));
  const firstFamily = families[0];

  if (firstFamily === null) {
    return null;
  }

  if (families.some((family) => family !== firstFamily)) {
    return null;
  }

  return firstFamily;
}

export function getBulkEditAvailability(
  request: BulkEditAvailabilityRequest,
): BulkEditAvailability {
  switch (request.kind) {
    case "transaction":
      return getTransactionBulkEditAvailability(request.rows, request.field);
    case "recurring":
      return getRecurringBulkEditAvailability(request.rows, request.field);
    default: {
      const exhaustive: never = request;
      return exhaustive;
    }
  }
}

function getTransactionBulkEditAvailability(
  rows: readonly TransactionBulkRow[],
  field: TransactionBulkField,
): BulkEditAvailability {
  if (rows.length === 0) {
    return { allowed: false, reason: "empty-selection" };
  }

  if (rows.some((row) => row.type === "initial_balance")) {
    return { allowed: false, reason: "initial-balance" };
  }

  switch (field) {
    case "payment_method":
      return { allowed: true };
    case "category":
      return getCategoryBulkEditAvailability(rows);
    default: {
      const exhaustive: never = field;
      return exhaustive;
    }
  }
}

function getRecurringBulkEditAvailability(
  rows: readonly RecurringBulkRow[],
  field: RecurringBulkField,
): BulkEditAvailability {
  if (rows.length === 0) {
    return { allowed: false, reason: "empty-selection" };
  }

  if (rows.some((row) => row.status === "completed")) {
    return { allowed: false, reason: "completed-recurring" };
  }

  switch (field) {
    case "status":
    case "payment_method":
      return { allowed: true };
    case "category":
      return getCategoryBulkEditAvailability(rows);
    default: {
      const exhaustive: never = field;
      return exhaustive;
    }
  }
}

function getCategoryBulkEditAvailability(
  rows: readonly { type: TransactionType }[],
): BulkEditAvailability {
  const families = rows.map((row) => getCategoryFamily(row.type));

  if (families.some((family) => family === null)) {
    return { allowed: false, reason: "category-not-applicable" };
  }

  const firstFamily = families[0];
  const hasMixedFamilies = families.some((family) => family !== firstFamily);

  if (hasMixedFamilies) {
    return { allowed: false, reason: "mixed-category-family" };
  }

  return { allowed: true };
}

function getCategoryFamily(type: TransactionType): CategoryFamily | null {
  switch (type) {
    case "income":
    case "exempt-income":
      return "income";
    case "expense":
    case "recognized-expense":
      return "expense";
    case "donation":
    case "non_tithe_donation":
    case "initial_balance":
      return null;
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
}
