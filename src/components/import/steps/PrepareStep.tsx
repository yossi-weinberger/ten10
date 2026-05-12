import { useCallback } from "react";
import type { ReactNode } from "react";
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
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/index";
import { usePlatform } from "@/contexts/PlatformContext";
import { generateTemplateCsv, downloadTemplateCsv } from "@/lib/import/ten10-template";
import { logger } from "@/lib/logger";

interface PrepareStepProps {
  onNext: () => void;
}

const CHECKLIST_KEYS = [
  "checklistItem1",
  "checklistItem2",
  "checklistItem3",
  "checklistItem4",
] as const;

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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="space-y-5 max-w-xl mx-auto"
    >
      {/* Title */}
      <div>
        <h2 className="text-xl font-bold">{t("prepare.title")}</h2>
        <p className="text-base text-muted-foreground mt-1.5 leading-relaxed">
          {t("prepare.description")}
        </p>
      </div>

      {/* Checklist */}
      <div className="rounded-xl border border-border bg-muted/30 p-4 space-y-3">
        <p className="text-sm font-semibold">{t("prepare.checklistTitle")}</p>
        <ul className="space-y-2.5">
          {CHECKLIST_KEYS.map((key) => (
            <li key={key} className="flex items-start gap-2.5 text-sm">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
              <span className="leading-snug">{t(`prepare.${key}`)}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Supported / unsupported formats */}
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5">
          {t("prepare.formatsTitle")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {/* Supported */}
          <div className="rounded-xl border-2 border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20 p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" />
              <span className="text-sm font-semibold text-green-800 dark:text-green-300">
                {t("prepare.supported")}
              </span>
            </div>
            <div className="space-y-2">
              <FormatItem
                icon={<FileText className="h-4 w-4" />}
                label=".CSV"
                desc={t("prepare.csvDesc")}
                color="green"
              />
              <FormatItem
                icon={<FileSpreadsheet className="h-4 w-4" />}
                label=".XLSX"
                desc={t("prepare.xlsxDesc")}
                color="green"
              />
            </div>
          </div>

          {/* Unsupported */}
          <div className="rounded-xl border-2 border-border bg-muted/30 p-4 space-y-2.5">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-sm font-semibold text-muted-foreground">
                {t("prepare.notSupported")}
              </span>
            </div>
            <div className="space-y-2">
              <FormatItem
                icon={<FileSpreadsheet className="h-4 w-4" />}
                label=".XLS"
                desc={t("prepare.xlsDesc")}
                color="muted"
              />
              <FormatItem
                icon={<FileText className="h-4 w-4" />}
                label="PDF"
                desc={t("prepare.pdfDesc")}
                color="muted"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Template download */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 mt-0.5">
            <FileSpreadsheet className="h-5 w-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-semibold">{t("prepare.templateTitle")}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("prepare.templateDescription")}
            </p>
            <p className="text-xs text-muted-foreground italic mt-1">
              {t("prepare.ownFileHint")}
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
    </motion.div>
  );
}

interface FormatItemProps {
  icon: ReactNode;
  label: string;
  desc: string;
  color: "green" | "muted";
}

function FormatItem({ icon, label, desc, color }: FormatItemProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-2",
        color === "green"
          ? "text-green-700 dark:text-green-400"
          : "text-muted-foreground"
      )}
    >
      <span className="shrink-0 mt-0.5">{icon}</span>
      <div className="min-w-0">
        <span className="text-xs font-bold">{label}</span>
        {desc && (
          <p className="text-xs leading-tight mt-0.5 opacity-80">{desc}</p>
        )}
      </div>
    </div>
  );
}
