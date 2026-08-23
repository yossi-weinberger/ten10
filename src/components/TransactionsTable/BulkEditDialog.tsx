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
import { cn } from "@/lib/utils";

export interface BulkEditFieldOption {
  value: string;
  label: string;
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
            <div
              className="grid gap-2 sm:grid-cols-2"
              role="radiogroup"
              aria-labelledby="bulk-edit-field-label"
            >
              {fields.map((field) => (
                <Button
                  key={field.value}
                  type="button"
                  variant={field.value === selectedField ? "default" : "outline"}
                  className={cn("justify-start", dir === "rtl" && "text-right")}
                  disabled={pending || field.disabled}
                  role="radio"
                  aria-checked={field.value === selectedField}
                  onClick={() => onFieldChange(field.value)}
                >
                  {field.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{valueLabel}</Label>
            {valueEditor}
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
