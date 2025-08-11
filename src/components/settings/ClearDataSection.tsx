import React from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Trash2 } from "lucide-react";

interface ClearDataSectionProps {
  handleClearData: () => Promise<void>;
  isClearing: boolean;
}

export function ClearDataSection({
  handleClearData,
  isClearing,
}: ClearDataSectionProps) {
  const { t } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");
  return (
    <div className="md:w-1/3 space-y-3 rounded-lg border border-destructive bg-card p-4 shadow">
      <div className="flex items-center gap-2">
        <Trash2 className="h-5 w-5 text-destructive" />
        <Label className="text-lg font-semibold text-destructive">
          {t("clearData.title")}
        </Label>
      </div>
      <p className="text-sm text-muted-foreground">
        {t("clearData.description")}
      </p>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button
            variant="destructive"
            disabled={isClearing}
            className="mt-2 w-full"
          >
            {isClearing
              ? tCommon("labels.loading")
              : t("clearData.confirmButton")}
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("clearData.warningTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("clearData.warningDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("actions.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClearData}
              disabled={isClearing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isClearing
                ? tCommon("labels.loading")
                : t("clearData.confirmButton")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
