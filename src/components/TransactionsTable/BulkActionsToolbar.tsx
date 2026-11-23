import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface BulkActionsToolbarProps {
  selectedCount: number;
  selectedCountLabel: string;
  /** Full sentence for screen readers; when set, the visible count is aria-hidden. */
  selectedCountAnnouncement?: string;
  editLabel: string;
  deleteLabel?: string;
  clearLabel: string;
  onEdit: () => void;
  onDelete?: () => void;
  onClear: () => void;
  ariaLabel: string;
  pending?: boolean;
  disabled?: boolean;
  editDisabled?: boolean;
  dir?: "rtl" | "ltr";
  className?: string;
  mobileLayout?: boolean;
}

export function BulkActionsToolbar({
  selectedCount,
  selectedCountLabel,
  selectedCountAnnouncement,
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
  mobileLayout = false,
}: BulkActionsToolbarProps) {
  if (selectedCount === 0) {
    return null;
  }

  const actionsDisabled = disabled || pending;
  const showDelete = onDelete !== undefined;

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
      {selectedCountAnnouncement ? (
        <span className="sr-only">{selectedCountAnnouncement}</span>
      ) : null}
      <div
        className="text-sm font-medium text-muted-foreground"
        aria-hidden={selectedCountAnnouncement ? true : undefined}
      >
        {selectedCountLabel}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            mobileLayout ? "h-11" : "min-h-11 sm:min-h-9"
          )}
          onClick={onClear}
          disabled={actionsDisabled}
        >
          {clearLabel}
        </Button>
        <Button
          type="button"
          size="sm"
          className={cn(
            mobileLayout ? "h-11" : "min-h-11 sm:min-h-9"
          )}
          onClick={onEdit}
          disabled={actionsDisabled || editDisabled || selectedCount === 0}
        >
          {editLabel}
        </Button>
        {showDelete ? (
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className={cn(
              mobileLayout ? "h-11" : "min-h-11 sm:min-h-9"
            )}
            onClick={onDelete}
            disabled={actionsDisabled || selectedCount === 0}
          >
            {deleteLabel}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
