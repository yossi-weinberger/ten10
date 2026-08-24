import type {
  RecurringTransaction,
  Transaction,
  TransactionType,
} from "@/types/transaction";

export type TransactionBulkField =
  | "payment_method"
  | "category"
  | "description"
  | "recipient"
  | "is_chomesh";
export type RecurringBulkField = TransactionBulkField;
export type SelectionActionMode = "none" | "single" | "bulk";
export type ChomeshBulkType =
  | "income"
  | "donation"
  | "expense"
  | "recognized-expense";
export type BulkFieldAction =
  | { action: "untouched" }
  | { action: "set"; value: string | boolean | null }
  | { action: "clear" };
export type BulkPatchFieldActions = {
  payment_method: BulkFieldAction;
  category: BulkFieldAction;
  description: BulkFieldAction;
  recipient: BulkFieldAction;
  is_chomesh: BulkFieldAction;
};

export const BULK_TEXT_VALUE_MAX_LENGTH = 50;
export const BULK_DESCRIPTION_MAX_LENGTH = 100;

export type TransactionBulkPatch = {
  payment_method?: string | null;
  category?: string | null;
  description?: string | null;
  recipient?: string | null;
  is_chomesh?: boolean;
};
export type RecurringBulkPatch = TransactionBulkPatch;

export type TransactionBulkChange = {
  kind: "transaction";
  field: TransactionBulkField;
  value: string | null;
};

export type RecurringBulkChange = {
  kind: "recurring";
  field: RecurringBulkField;
  value: string | null;
};

export type BulkMutationResult = {
  refreshError: string | null;
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
  | "category-not-applicable"
  | "recipient-not-applicable"
  | "chomesh-not-applicable";

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

type CategoryFamily = "income" | "expense";

export function getSelectionActionMode(
  selectedCount: number,
): SelectionActionMode {
  if (selectedCount <= 0) return "none";
  return selectedCount === 1 ? "single" : "bulk";
}

export function getBulkFieldGridClassName(fieldCount: number): string {
  if (fieldCount <= 1) return "grid-cols-1";
  if (fieldCount === 2) return "grid-cols-2";
  return "grid-cols-2 sm:grid-cols-3";
}

export function assertBulkTextValue(value: string | null): void {
  if (value !== null && value.length > BULK_TEXT_VALUE_MAX_LENGTH) {
    throw new Error(
      `Bulk update value exceeds the ${BULK_TEXT_VALUE_MAX_LENGTH} character limit.`,
    );
  }
}

export function getBulkChomeshType(
  rows: readonly { type: TransactionType }[],
): ChomeshBulkType | null {
  if (rows.length === 0) {
    return null;
  }

  const firstType = rows[0]?.type;
  if (firstType === undefined || !isChomeshBulkType(firstType)) {
    return null;
  }

  if (rows.some((row) => row.type !== firstType)) {
    return null;
  }

  return firstType;
}

export function getBulkRecipientFamily(
  rows: readonly { type: TransactionType }[],
): true | null {
  if (rows.length === 0) {
    return null;
  }

  if (
    rows.every(
      (row) => row.type === "donation" || row.type === "non_tithe_donation",
    )
  ) {
    return true;
  }

  return null;
}

export function buildBulkPatch(
  actions: BulkPatchFieldActions,
): TransactionBulkPatch {
  const patch: TransactionBulkPatch = {};

  assignTextPatchField(patch, "payment_method", actions.payment_method);
  assignTextPatchField(patch, "category", actions.category);
  assignTextPatchField(patch, "description", actions.description);
  assignTextPatchField(patch, "recipient", actions.recipient);

  switch (actions.is_chomesh.action) {
    case "untouched":
    case "clear":
      break;
    case "set":
      if (typeof actions.is_chomesh.value === "boolean") {
        patch.is_chomesh = actions.is_chomesh.value;
      }
      break;
    default: {
      const exhaustive: never = actions.is_chomesh.action;
      return exhaustive;
    }
  }

  return patch;
}

export function assertBulkPatch(patch: TransactionBulkPatch): void {
  const keys = Object.keys(patch);
  if (keys.length === 0) {
    throw new Error("Bulk update requires at least one field.");
  }

  if (
    patch.description !== undefined &&
    patch.description !== null &&
    patch.description.length > BULK_DESCRIPTION_MAX_LENGTH
  ) {
    throw new Error(
      `Bulk update value exceeds the ${BULK_DESCRIPTION_MAX_LENGTH} character limit.`,
    );
  }

  assertBulkTextValue(patch.payment_method ?? null);
  assertBulkTextValue(patch.category ?? null);
  assertBulkTextValue(patch.recipient ?? null);
}

function assignTextPatchField(
  patch: TransactionBulkPatch,
  field: "payment_method" | "category" | "description" | "recipient",
  action: BulkFieldAction,
): void {
  switch (action.action) {
    case "untouched":
      return;
    case "clear":
      patch[field] = null;
      return;
    case "set":
      if (typeof action.value === "string" || action.value === null) {
        patch[field] = action.value;
      }
      return;
    default: {
      const exhaustive: never = action;
      return exhaustive;
    }
  }
}

function isChomeshBulkType(type: TransactionType): type is ChomeshBulkType {
  switch (type) {
    case "income":
    case "donation":
    case "expense":
    case "recognized-expense":
      return true;
    case "exempt-income":
    case "non_tithe_donation":
    case "initial_balance":
      return false;
    default: {
      const exhaustive: never = type;
      return exhaustive;
    }
  }
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
    case "description":
      return { allowed: true };
    case "category":
      return getCategoryBulkEditAvailability(rows);
    case "recipient":
      return getRecipientBulkEditAvailability(rows);
    case "is_chomesh":
      return getChomeshBulkEditAvailability(rows);
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
    case "payment_method":
    case "description":
      return { allowed: true };
    case "category":
      return getCategoryBulkEditAvailability(rows);
    case "recipient":
      return getRecipientBulkEditAvailability(rows);
    case "is_chomesh":
      return getChomeshBulkEditAvailability(rows);
    default: {
      const exhaustive: never = field;
      return exhaustive;
    }
  }
}

function getRecipientBulkEditAvailability(
  rows: readonly { type: TransactionType }[],
): BulkEditAvailability {
  if (getBulkRecipientFamily(rows) === null) {
    return { allowed: false, reason: "recipient-not-applicable" };
  }

  return { allowed: true };
}

function getChomeshBulkEditAvailability(
  rows: readonly { type: TransactionType }[],
): BulkEditAvailability {
  if (getBulkChomeshType(rows) === null) {
    return { allowed: false, reason: "chomesh-not-applicable" };
  }

  return { allowed: true };
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
