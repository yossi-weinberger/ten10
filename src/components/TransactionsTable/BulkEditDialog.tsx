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
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";

export interface BulkEditDialogProps {
  open: boolean;
  title: string;
  description: string;
  cancelLabel: string;
  submitLabel: string;
  pendingLabel: string;
  pending: boolean;
  submitDisabled?: boolean;
  children: ReactNode;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  dir?: "rtl" | "ltr";
}

export function BulkEditDialog({
  open,
  title,
  description,
  cancelLabel,
  submitLabel,
  pendingLabel,
  pending,
  submitDisabled = false,
  children,
  onOpenChange,
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
          disabled={pending || submitDisabled}
          className={buttonClassName}
        >
          {pending ? pendingLabel : submitLabel}
        </Button>
      </>
    );
  };

  const renderForm = (footer: ReactNode, className?: string) => (
    <form className={cn("space-y-4", className)} onSubmit={handleSubmit}>
      {children}
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
              <DrawerFooter className="grid grid-cols-2 gap-2 px-0 pb-4">
                {renderActions(true)}
              </DrawerFooter>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="flex max-h-[90dvh] flex-col overflow-hidden sm:max-w-lg"
        dir={dir}
        aria-busy={pending}
        onEscapeKeyDown={preventCloseWhenPending}
        onPointerDownOutside={preventCloseWhenPending}
      >
        <DialogHeader className="shrink-0 rtl:text-right ltr:text-left">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <form
          className="flex min-h-0 flex-1 flex-col gap-4"
          onSubmit={handleSubmit}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain">
            {children}
          </div>
          <DialogFooter className="shrink-0">
            {renderActions(false)}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
