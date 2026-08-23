import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useMediaQuery } from "@/hooks/use-media-query";
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
  const isSmallNow = useMediaQuery("(max-width: 767px)");
  const [useDrawer, setUseDrawer] = useState(isSmallNow);

  useEffect(() => {
    if (open) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setUseDrawer(isSmallNow);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isSmallNow, open]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (pending && !nextOpen) {
      return;
    }

    onOpenChange(nextOpen);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit();
  };

  const handleClose = () => handleOpenChange(false);

  const preventCloseWhenPending = (event: Event) => {
    if (pending) {
      event.preventDefault();
    }
  };

  const renderFieldSelector = () => (
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
        className="grid grid-cols-2 gap-2 sm:grid-cols-3"
        aria-labelledby="bulk-edit-field-label"
      >
        {fields.map((field) => (
          <ToggleGroupItem
            key={field.value}
            value={field.value}
            className={cn(
              "h-auto min-h-11 justify-start gap-2 whitespace-normal rounded-md border px-3 py-2 text-start hover:bg-accent hover:text-accent-foreground data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground sm:min-h-10",
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
  );

  const renderValueEditor = () => (
    <div className="space-y-2">
      <Label id="bulk-edit-value-label">{valueLabel}</Label>
      <div role="group" aria-labelledby="bulk-edit-value-label">
        {valueEditor}
      </div>
    </div>
  );

  const renderActions = (isDrawer: boolean) => {
    const buttonClassName = isDrawer ? "min-h-11 w-full" : undefined;

    return (
      <>
        <Button
          type="button"
          variant="outline"
          onClick={handleClose}
          disabled={pending}
          className={buttonClassName}
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
          className={buttonClassName}
        >
          {pending ? pendingLabel : submitLabel}
        </Button>
      </>
    );
  };

  const renderForm = (footer: ReactNode, className?: string) => (
    <form
      className={cn("space-y-4", className)}
      onSubmit={handleSubmit}
    >
      {renderFieldSelector()}
      {renderValueEditor()}
      {footer}
    </form>
  );

  if (useDrawer) {
    return (
      <Drawer open={open} onOpenChange={handleOpenChange}>
        <DrawerContent
          dir={dir}
          aria-busy={pending}
          className="max-h-[90dvh] overflow-hidden overscroll-contain"
          onEscapeKeyDown={preventCloseWhenPending}
          onPointerDownOutside={preventCloseWhenPending}
        >
          <DrawerHeader className="rtl:text-right ltr:text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto overscroll-contain px-4 pb-2">
            {renderForm(
              <DrawerFooter className="px-0 pb-4">{renderActions(true)}</DrawerFooter>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg"
        dir={dir}
        aria-busy={pending}
        onEscapeKeyDown={preventCloseWhenPending}
        onPointerDownOutside={preventCloseWhenPending}
      >
        <DialogHeader className="rtl:text-right ltr:text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        {renderForm(
          <DialogFooter>
            {renderActions(false)}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
