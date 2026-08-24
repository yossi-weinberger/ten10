import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResponsiveConfirmationDialog } from "@/components/ui/ResponsiveConfirmationDialog";
import { cn } from "@/lib/utils/formatting";
import { Trash2 } from "lucide-react";

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
  const [confirmOpen, setConfirmOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleConfirmOpenChange = (nextOpen: boolean) => {
    setConfirmOpen(nextOpen);

    if (!nextOpen) {
      window.requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    }
  };

  const handleConfirm = async () => {
    await handleClearData();
    handleConfirmOpenChange(false);
  };

  return (
    <Card className={cn("border-destructive/50", className)}>
      <CardHeader className="py-4">
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

          <Button
            ref={triggerRef}
            variant="destructive"
            disabled={isClearing}
            className="w-full md:w-auto md:min-w-[220px]"
            onClick={() => setConfirmOpen(true)}
          >
            {isClearing
              ? tCommon("labels.loading")
              : t("clearData.confirmButton")}
          </Button>
        </div>

        <ResponsiveConfirmationDialog
          open={confirmOpen}
          onOpenChange={handleConfirmOpenChange}
          onConfirm={handleConfirm}
          title={t("clearData.warningTitle")}
          description={t("clearData.warningDescription")}
          confirmLabel={t("clearData.confirmButton")}
          cancelLabel={tCommon("actions.cancel")}
          pending={isClearing}
          pendingLabel={tCommon("labels.loading")}
          variant="destructive"
          dir={i18n.dir()}
        />
      </CardHeader>
    </Card>
  );
}
