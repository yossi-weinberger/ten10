import { useState } from "react";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { ImportMode } from "@/lib/data-layer/dataManagement.service";

export interface ImportConfirmModalProps {
  open: boolean;
  platform: "web" | "desktop";
  transactionsCount: number;
  recurringCount: number;
  onConfirm: (mode: ImportMode) => void;
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
  const [mode, setMode] = useState<ImportMode>("replace");

  const isSmallNow = useMediaQuery("(max-width: 767px)");
  /** Locked for this mount so keyboard resize does not swap Drawer/Dialog mid-flow */
  const [useDrawer] = useState(isSmallNow);

  const title = t("importExport.importTitle");
  const replaceMessage =
    platform === "web"
      ? t("messages.importConfirmWeb")
      : t("messages.importConfirm");
  const mergeMessage =
    platform === "web"
      ? t("messages.importConfirmMergeWeb")
      : t("messages.importConfirmMerge");
  const bodyMessage = mode === "replace" ? replaceMessage : mergeMessage;

  const countsBlock = (
    <span className="mt-2 block font-medium text-foreground">
      {t("messages.importRecordCountTransactions", {
        count: transactionsCount,
      })}
      {" · "}
      {t("messages.importRecordCountRecurring", { count: recurringCount })}
    </span>
  );

  const modeBlock = (
    <RadioGroup
      value={mode}
      onValueChange={(v) => setMode(v as ImportMode)}
      className="mt-4 grid gap-3"
      dir={i18n.dir()}
    >
      <div className="flex items-start gap-3">
        <RadioGroupItem
          value="replace"
          id="import-mode-replace"
          className="mt-1 shrink-0"
        />
        <div className="grid gap-1">
          <Label htmlFor="import-mode-replace" className="cursor-pointer">
            {t("messages.importModeReplace")}
          </Label>
          <p className="text-muted-foreground text-xs font-normal leading-snug">
            {t("messages.importModeReplaceHint")}
          </p>
        </div>
      </div>
      <div className="flex items-start gap-3">
        <RadioGroupItem
          value="merge"
          id="import-mode-merge"
          className="mt-1 shrink-0"
        />
        <div className="grid gap-1">
          <Label htmlFor="import-mode-merge" className="cursor-pointer">
            {t("messages.importModeMerge")}
          </Label>
          <p className="text-muted-foreground text-xs font-normal leading-snug">
            {t("messages.importModeMergeHint")}
          </p>
        </div>
      </div>
    </RadioGroup>
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
              {bodyMessage}
            </DrawerDescription>
            <div className="text-muted-foreground mt-2 grid gap-3 text-sm">
              {countsBlock}
              {modeBlock}
            </div>
          </DrawerHeader>
          <DrawerFooter className="gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => onCancel(false)}
              className="w-full"
            >
              {cancelLabel}
            </Button>
            <Button onClick={() => onConfirm(mode)} className="w-full">
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
            {bodyMessage}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="text-muted-foreground grid gap-3 text-sm">
          {countsBlock}
          {modeBlock}
        </div>
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <AlertDialogCancel onClick={() => onCancel(false)}>
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction onClick={() => onConfirm(mode)}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
