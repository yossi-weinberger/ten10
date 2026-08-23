import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-media-query";

export interface ResponsiveConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  title: ReactNode;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  pending?: boolean;
  pendingLabel?: string;
  variant?: "default" | "destructive";
  dir?: "rtl" | "ltr";
}

export function ResponsiveConfirmationDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel,
  pending = false,
  pendingLabel,
  variant = "default",
  dir,
}: ResponsiveConfirmationDialogProps) {
  const isSmallNow = useMediaQuery("(max-width: 767px)");
  const [useDrawer, setUseDrawer] = useState(isSmallNow);
  const [internalPending, setInternalPending] = useState(false);
  const confirmPendingRef = useRef(false);
  const effectivePending = pending || internalPending;

  useEffect(() => {
    if (open) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setUseDrawer(isSmallNow);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [isSmallNow, open]);

  const handleOpenChange = useCallback(
    (nextOpen: boolean) => {
      if (effectivePending && !nextOpen) {
        return;
      }

      onOpenChange(nextOpen);
    },
    [effectivePending, onOpenChange],
  );

  const handleConfirm = useCallback(async () => {
    if (confirmPendingRef.current || effectivePending) {
      return;
    }

    confirmPendingRef.current = true;
    setInternalPending(true);

    try {
      await onConfirm();
    } finally {
      confirmPendingRef.current = false;
      setInternalPending(false);
    }
  }, [effectivePending, onConfirm]);

  const preventCloseWhenPending = (event: Event) => {
    if (effectivePending) {
      event.preventDefault();
    }
  };

  const confirmButton = (mobile: boolean) => (
    <Button
      type="button"
      variant={variant}
      onClick={() => {
        void handleConfirm();
      }}
      disabled={effectivePending}
      className={mobile ? "min-h-11 w-full" : undefined}
    >
      {effectivePending ? pendingLabel ?? confirmLabel : confirmLabel}
    </Button>
  );

  const actions = (mobile: boolean) => {
    if (mobile) {
      return (
        <>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            disabled={effectivePending}
            className="min-h-11 w-full"
          >
            {cancelLabel}
          </Button>
          {confirmButton(true)}
        </>
      );
    }

    return (
      <>
        <AlertDialogCancel disabled={effectivePending}>
          {cancelLabel}
        </AlertDialogCancel>
        {confirmButton(false)}
      </>
    );
  };

  if (useDrawer) {
    return (
      <Drawer
        open={open}
        onOpenChange={handleOpenChange}
        dismissible={!effectivePending}
        autoFocus
      >
        <DrawerContent
          role="alertdialog"
          dir={dir}
          aria-busy={effectivePending}
          onEscapeKeyDown={preventCloseWhenPending}
          onPointerDownOutside={preventCloseWhenPending}
        >
          <DrawerHeader className="rtl:text-right ltr:text-left">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription>{description}</DrawerDescription>
          </DrawerHeader>
          <DrawerFooter>{actions(true)}</DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent
        dir={dir}
        aria-busy={effectivePending}
        onEscapeKeyDown={preventCloseWhenPending}
      >
        <AlertDialogHeader className="rtl:text-right ltr:text-left">
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          {actions(false)}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
