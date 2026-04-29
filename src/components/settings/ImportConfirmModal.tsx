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
import { useMediaQuery } from "@/hooks/use-media-query";
import { cn } from "@/lib/utils";
import { GitMerge, Trash2 } from "lucide-react";
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
  const countsBlock = (
    <span className="mt-2 block font-medium text-foreground">
      {t("messages.importRecordCountTransactions", {
        count: transactionsCount,
      })}
      {" · "}
      {t("messages.importRecordCountRecurring", { count: recurringCount })}
    </span>
  );

  const modesRadioLabel = t("importExport.importTitle");
  const modeBlock = (
    <div
      className="mt-4 grid gap-3"
      role="radiogroup"
      aria-label={modesRadioLabel}
      dir={i18n.dir()}
    >
      <button
        type="button"
        role="radio"
        aria-checked={mode === "replace"}
        onClick={() => setMode("replace")}
        className={cn(
          "rounded-xl border-2 px-4 py-3 text-start transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          mode === "replace"
            ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
            : "border-border hover:border-primary/35 hover:bg-muted/40"
        )}
      >
        <span className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <Trash2 className="size-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-base font-semibold leading-snug text-foreground">
              {t("messages.importModeReplace")}
            </span>
            <span className="text-muted-foreground mt-2 block text-sm font-normal leading-relaxed">
              {t("messages.importModeReplaceHint")}
            </span>
          </span>
        </span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={mode === "merge"}
        onClick={() => setMode("merge")}
        className={cn(
          "rounded-xl border-2 px-4 py-3 text-start transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          mode === "merge"
            ? "border-primary bg-primary/5 shadow-sm ring-2 ring-primary/20"
            : "border-border hover:border-primary/35 hover:bg-muted/40"
        )}
      >
        <span className="flex items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
            <GitMerge className="size-4" aria-hidden="true" />
          </span>
          <span>
            <span className="block text-base font-semibold leading-snug text-foreground">
              {t("messages.importModeMerge")}
            </span>
            <span className="text-muted-foreground mt-2 block text-sm font-normal leading-relaxed">
              {t("messages.importModeMergeHint")}
            </span>
          </span>
        </span>
      </button>
    </div>
  );

  const cancelLabel = tCommon("actions.cancel");
  const confirmLabel = t("importExport.importButton");
  const cancelButtonClass =
    "border-destructive/55 text-destructive hover:bg-destructive/10 hover:border-destructive hover:text-destructive";

  if (useDrawer) {
    return (
      <Drawer open={open} onOpenChange={(o) => !o && onCancel(false)}>
        <DrawerContent dir={i18n.dir()} className="max-h-[90vh]">
          <DrawerHeader className="text-start">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription className="sr-only">
              {t("importExport.importDescription")}
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
              className={cn("w-full", cancelButtonClass)}
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
          <AlertDialogDescription className="sr-only">
            {t("importExport.importDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="text-muted-foreground grid gap-3 text-sm">
          {countsBlock}
          {modeBlock}
        </div>
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <AlertDialogCancel
            onClick={() => onCancel(false)}
            className={cancelButtonClass}
          >
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
