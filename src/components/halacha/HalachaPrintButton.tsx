import { useState } from "react";
import { Printer } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { exportHalachaPdf } from "@/lib/halacha/export-halacha-pdf";

export function HalachaPrintButton() {
  const { t } = useTranslation("halacha-common");
  const [isExporting, setIsExporting] = useState(false);

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isExporting}
      onClick={async () => {
        setIsExporting(true);
        try {
          await exportHalachaPdf();
        } catch {
          toast.error(t("pdfExportError"));
        } finally {
          setIsExporting(false);
        }
      }}
      aria-label={t("print")}
      className="shrink-0 bg-transparent text-foreground hover:bg-muted/50"
    >
      <Printer className="h-4 w-4 me-1" />
      <span className="hidden sm:inline">{t("print")}</span>
    </Button>
  );
}
