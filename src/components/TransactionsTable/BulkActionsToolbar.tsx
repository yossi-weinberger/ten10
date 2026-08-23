import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BulkActionsToolbarProps {
  selectedCount: number;
  selectedCountLabel: string;
  editLabel: string;
  deleteLabel: string;
  clearLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  onClear: () => void;
  ariaLabel: string;
  pending?: boolean;
  disabled?: boolean;
  editDisabled?: boolean;
  dir?: "rtl" | "ltr";
  className?: string;
}

export function BulkActionsToolbar({
  selectedCount,
  selectedCountLabel,
  editLabel,
  deleteLabel,
  clearLabel,
  onEdit,
  onDelete,
  onClear,
  ariaLabel,
  pending = false,
  disabled = false,
  editDisabled = false,
  dir = "rtl",
  className,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  const actionsDisabled = disabled || pending;

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-md border bg-background p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
      dir={dir}
      role="region"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <div className="text-sm font-medium">
        {selectedCountLabel}
      </div>
      <div className="flex flex-col-reverse gap-2 sm:flex-row">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onClear}
          disabled={actionsDisabled}
        >
          {clearLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={onEdit}
          disabled={actionsDisabled || editDisabled || selectedCount === 0}
        >
          {editLabel}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={onDelete}
          disabled={actionsDisabled || selectedCount === 0}
        >
          {deleteLabel}
        </Button>
      </div>
    </div>
  );
}
