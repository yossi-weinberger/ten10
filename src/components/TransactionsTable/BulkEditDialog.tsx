import type { FormEvent, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";

export interface BulkEditFieldOption {
  value: string;
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface BulkEditDialogProps {
  open: boolean;
  title: string;
  description: string;
  fieldLabel: string;
  valueLabel: string;
  cancelLabel: string;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  submitDisabled?: boolean;
  fields: readonly BulkEditFieldOption[];
  selectedField: string;
  valueEditor: ReactNode;
  onOpenChange: (open: boolean) => void;
  onFieldChange: (field: string) => void;
  onSubmit: () => void;
  dir?: "rtl" | "ltr";
}

export function BulkEditDialog({
  open,
  title,
  description,
  fieldLabel,
  valueLabel,
  cancelLabel,
  submitLabel,
  pendingLabel,
  pending,
  submitDisabled = false,
  fields,
  selectedField,
  valueEditor,
  onOpenChange,
  onFieldChange,
  onSubmit,
  dir = "rtl",
}: BulkEditDialogProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        dir={dir}
        aria-busy={pending}
      >
        <DialogHeader className="rtl:text-right ltr:text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <Label id="bulk-edit-field-label">{fieldLabel}</Label>
            <ToggleGroup
              type="single"
              value={selectedField}
              onValueChange={(value) => {
                if (value) {
                  onFieldChange(value);
                }
              }}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3"
              aria-labelledby="bulk-edit-field-label"
            >
              {fields.map((field) => (
                <ToggleGroupItem
                  key={field.value}
                  value={field.value}
                  className={cn(
                    "h-auto justify-start gap-2 whitespace-normal rounded-md border px-3 py-2 text-start hover:bg-accent hover:text-accent-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground",
                    dir === "rtl" && "text-right"
                  )}
                  disabled={pending || field.disabled}
                >
                  {field.icon}
                  {field.label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label id="bulk-edit-value-label">{valueLabel}</Label>
            <div role="group" aria-labelledby="bulk-edit-value-label">
              {valueEditor}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={pending}
            >
              {cancelLabel}
            </Button>
            <Button
              type="submit"
              disabled={
                pending ||
                submitDisabled ||
                fields.length === 0 ||
                selectedField === ""
              }
            >
              {pending ? pendingLabel : submitLabel}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
