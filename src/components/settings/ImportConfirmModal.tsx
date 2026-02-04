import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/hooks/use-media-query";

export interface ImportConfirmModalProps {
  open: boolean;
  platform: "web" | "desktop";
  transactionsCount: number;
  recurringCount: number;
  onConfirm: () => void;
  onCancel: (open: boolean) => void;
}

export function ImportConfirmModal({
  open,
  platform,
  transactionsCount,
  recurringCount,
  onConfirm,
  onCancel,
}: ImportConfirmModalProps) {
  const { t, i18n } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");

  const isSmallNow = useMediaQuery("(max-width: 767px)");
  const [useDrawer, setUseDrawer] = useState(isSmallNow);

  useEffect(() => {
    if (!open) setUseDrawer(isSmallNow);
  }, [open, isSmallNow]);

  const title = t("importExport.importTitle");
  const message =
    platform === "web"
      ? t("messages.importConfirmWeb")
      : t("messages.importConfirm");
  const countsBlock = (
    <span className="mt-2 block font-medium text-foreground">
      {t("messages.importRecordCountTransactions", {
        count: transactionsCount,
      })}
      {" · "}
      {t("messages.importRecordCountRecurring", { count: recurringCount })}
    </span>
  );
  const cancelLabel = tCommon("actions.cancel");
  const confirmLabel = t("importExport.importButton");

  if (useDrawer) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onCancel(false)}>
        <DrawerContent dir={i18n.dir()} className="max-h-[90vh]">
          <DrawerHeader className="text-start">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription className="text-start">
              {message}
              {countsBlock}
            </DrawerDescription>
          </DrawerHeader>
          <DrawerFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onCancel(false)}
              className="w-full"
            >
              {cancelLabel}
            </Button>
            <Button onClick={onConfirm} className="w-full">
              {confirmLabel}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel(false)}>
      <AlertDialogContent dir={i18n.dir()}>
        <AlertDialogHeader className="text-start">
          <AlertDialogTitle className="text-start">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-start">
            {message}
            {countsBlock}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <AlertDialogCancel onClick={() => onCancel(false)}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
