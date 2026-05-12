import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/index";
import { usePlatform } from "@/contexts/PlatformContext";
import { generateTemplateCsv, downloadTemplateCsv } from "@/lib/import/ten10-template";
import { logger } from "@/lib/logger";

interface PrepareStepProps {
  onNext: () => void;
}

export function PrepareStep({ onNext }: PrepareStepProps) {
  const { t, i18n } = useTranslation("import");
  const { platform } = usePlatform();
  const isRtl = i18n.dir() === "rtl";

  const handleDownloadTemplate = useCallback(async () => {
    if (platform === "desktop") {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        const csv = generateTemplateCsv(i18n.language);
        const filePath = await save({
          title: t("prepare.templateDownload"),
          defaultPath: "ten10-import-template.csv",
          filters: [{ name: "CSV Files", extensions: ["csv"] }],
        });
        if (filePath) {
          await writeTextFile(filePath, "\uFEFF" + csv);
        }
      } catch (err) {
        logger.error("Desktop template download failed, falling back:", err);
        downloadTemplateCsv(i18n.language);
      }
    } else {
      downloadTemplateCsv(i18n.language);
    }
  }, [platform, i18n.language, t]);

  const NextIcon = isRtl ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6 max-w-xl mx-auto">
      {/* Title */}
      <div>
        <h2 className="text-lg font-semibold">{t("prepare.title")}</h2>
        <p className="text-sm text-muted-foreground mt-1">{t("prepare.description")}</p>
      </div>

      {/* Supported / unsupported formats — 2 clear boxes */}
      <div className="grid grid-cols-2 gap-3">
        {/* Supported */}
        <div className="rounded-xl border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 shrink-0" />
            <span className="text-sm font-semibold text-green-800 dark:text-green-300">
              {t("prepare.supported")}
            </span>
          </div>
          <div className="space-y-2">
            <FormatItem icon={<FileText className="h-4 w-4" />} label=".CSV" color="green" />
            <FormatItem icon={<FileSpreadsheet className="h-4 w-4" />} label=".XLSX" color="green" />
          </div>
        </div>

        {/* Unsupported */}
        <div className="rounded-xl border-2 border-border bg-muted/30 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-muted-foreground shrink-0" />
            <span className="text-sm font-semibold text-muted-foreground">
              {t("prepare.notSupported")}
            </span>
          </div>
          <div className="space-y-2">
            <FormatItem icon={<FileSpreadsheet className="h-4 w-4" />} label=".XLS" color="muted" />
            <FormatItem icon={<FileText className="h-4 w-4" />} label="PDF / תמונות" color="muted" />
          </div>
        </div>
      </div>

      {/* Template download with explanation */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-semibold">{t("prepare.templateTitle")}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("prepare.templateDescription")}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="gap-1.5"
          >
            <Download className="h-3.5 w-3.5" />
            {t("prepare.templateDownload")}
          </Button>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button onClick={onNext} className="gap-1.5">
          {t("navigation.next")}
          <NextIcon className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface FormatItemProps {
  icon: React.ReactNode;
  label: string;
  color: "green" | "muted";
}

function FormatItem({ icon, label, color }: FormatItemProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 text-xs font-medium",
        color === "green"
          ? "text-green-700 dark:text-green-400"
          : "text-muted-foreground"
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
