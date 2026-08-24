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
        "flex flex-wrap items-center gap-2",
        className,
      )}
      dir={dir}
      role="region"
      aria-label={ariaLabel}
      aria-live="polite"
    >
      <div className="text-sm font-medium text-muted-foreground">
        {selectedCountLabel}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="min-h-11 sm:min-h-9"
          onClick={onClear}
          disabled={actionsDisabled}
        >
          {clearLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          className="min-h-11 sm:min-h-9"
          onClick={onEdit}
          disabled={actionsDisabled || editDisabled || selectedCount === 0}
        >
          {editLabel}
        </Button>
        <Button
          type="button"
          variant="destructive"
          size="sm"
          className="min-h-11 sm:min-h-9"
          onClick={onDelete}
          disabled={actionsDisabled || selectedCount === 0}
        >
          {deleteLabel}
        </Button>
      </div>
    </div>
  );
}
