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
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { cn } from "@/lib/utils/formatting";

interface ClearDataSectionProps {
  handleClearData: () => Promise<void>;
  isClearing: boolean;
  className?: string;
}

export function ClearDataSection({
  handleClearData,
  isClearing,
  className,
}: ClearDataSectionProps) {
  const { t, i18n } = useTranslation("settings");
  const { t: tCommon } = useTranslation("common");
  return (
    <Card className={cn("border-destructive/50", className)}>
      <CardHeader className="py-4">
        <AlertDialog>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-destructive" />
                <CardTitle className="text-destructive">
                  {t("clearData.title")}
                </CardTitle>
              </div>
              <CardDescription className="text-sm">
                {t("clearData.description")}
              </CardDescription>
            </div>

            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                disabled={isClearing}
                className="w-full md:w-auto md:min-w-[220px]"
              >
                {isClearing
                  ? tCommon("labels.loading")
                  : t("clearData.confirmButton")}
              </Button>
            </AlertDialogTrigger>
          </div>

          <AlertDialogContent dir={i18n.dir()}>
            <AlertDialogHeader className="text-start">
              <AlertDialogTitle className="text-start">
                {t("clearData.warningTitle")}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-start">
                {t("clearData.warningDescription")}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:space-x-0">
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
      </CardHeader>
    </Card>
  );
}
