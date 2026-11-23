import { useEffect, useRef } from "react";
import type { UseFormReturn } from "react-hook-form";
import type { TransactionFormValues } from "@/lib/schemas";
import { categoryForTypeOrNull } from "@/lib/category-registry";

/**
 * Import row-edit only: when the user switches type, clear a category that
 * is invalid for the new type so the visible field matches save (null).
 * Regular add/edit forms must not enable this.
 */
export function useAlignCategoryOnTypeChange(
  form: UseFormReturn<TransactionFormValues>,
  selectedType: TransactionFormValues["type"] | "",
  enabled: boolean,
): void {
  const prevTypeRef = useRef(selectedType);

  useEffect(() => {
    if (!enabled) return;

    const prevType = prevTypeRef.current;
    prevTypeRef.current = selectedType;

    if (prevType === selectedType || !selectedType) return;

    const current = form.getValues("category") || null;
    const next = categoryForTypeOrNull(selectedType, current) ?? "";
    if ((current ?? "") !== next) {
      form.setValue("category", next, { shouldValidate: false });
    }
  }, [enabled, selectedType, form]);
}
