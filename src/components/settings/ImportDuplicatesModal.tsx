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
import type { DuplicateImportDecision } from "@/lib/data-layer/dataManagement.service";

export interface ImportDuplicatesModalProps {
  open: boolean;
  duplicatesCount: number;
  uniqueCount: number;
  totalCount: number;
  onDecision: (decision: DuplicateImportDecision) => void;
}

export function ImportDuplicatesModal({
  open,
  duplicatesCount,
  uniqueCount,
  totalCount,
  onDecision,
}: ImportDuplicatesModalProps) {
  const { t, i18n } = useTranslation("settings");
  const isSmallNow = useMediaQuery("(max-width: 767px)");
  /** Locked for this mount so keyboard resize does not swap Drawer/Dialog mid-flow */
  const [useDrawer] = useState(isSmallNow);

  const title = t("messages.importDuplicatesTitle");
  const description = t("messages.importDuplicatesDescription", {
    duplicates: duplicatesCount,
    unique: uniqueCount,
    total: totalCount,
  });

  const cancelButtonClass =
    "border-destructive/55 text-destructive hover:bg-destructive/10 hover:border-destructive hover:text-destructive";

  const summaryBlock = (
    <div className="text-muted-foreground grid gap-2 text-sm">
      <p className="font-medium text-foreground">
        {t("messages.importDuplicatesSummary", {
          duplicates: duplicatesCount,
          unique: uniqueCount,
          total: totalCount,
        })}
      </p>
      <p>{t("messages.importDuplicatesHint")}</p>
    </div>
  );

  if (useDrawer) {
    return (
      <Drawer
        open={open}
        onOpenChange={(o) => !o && onDecision("cancel")}
      >
        <DrawerContent dir={i18n.dir()} className="max-h-[90vh]">
          <DrawerHeader className="text-start">
            <DrawerTitle>{title}</DrawerTitle>
            <DrawerDescription className="text-start">
              {description}
            </DrawerDescription>
            <div className="mt-2">{summaryBlock}</div>
          </DrawerHeader>
          <DrawerFooter className="gap-2 pt-2">
            <Button onClick={() => onDecision("skip")} className="w-full">
              {t("messages.importDuplicatesSkip")}
            </Button>
            <Button
              variant="outline"
              onClick={() => onDecision("import_all")}
              className="w-full"
            >
              {t("messages.importDuplicatesImportAll")}
            </Button>
            <Button
              variant="outline"
              onClick={() => onDecision("cancel")}
              className={cn("w-full", cancelButtonClass)}
            >
              {t("messages.importDuplicatesCancel")}
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(o) => !o && onDecision("cancel")}
    >
      <AlertDialogContent dir={i18n.dir()}>
        <AlertDialogHeader className="text-start">
          <AlertDialogTitle className="text-start">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-start">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {summaryBlock}
        <AlertDialogFooter className="gap-2 sm:space-x-0">
          <AlertDialogCancel
            onClick={() => onDecision("cancel")}
            className={cancelButtonClass}
          >
            {t("messages.importDuplicatesCancel")}
          </AlertDialogCancel>
          <Button variant="outline" onClick={() => onDecision("import_all")}>
            {t("messages.importDuplicatesImportAll")}
          </Button>
          <AlertDialogAction onClick={() => onDecision("skip")}>
            {t("messages.importDuplicatesSkip")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
