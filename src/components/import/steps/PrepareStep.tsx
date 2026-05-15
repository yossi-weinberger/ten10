import { useCallback } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  FileSpreadsheet,
  CheckCircle2,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
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
  const shouldReduceMotion = useReducedMotion();

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
      initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.22, ease: "easeOut" }}
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
          {/* User stays in control until final approval */}
          <li className="flex items-start gap-2.5 text-sm">
            <CheckCircle2
              aria-hidden="true"
              className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5"
            />
            <span className="leading-snug">{t("prepare.checklistItem2")}</span>
          </li>
          {/* Column requirements */}
          <li className="flex items-start gap-2.5 text-sm">
            <CheckCircle2
              aria-hidden="true"
              className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5"
            />
            <span className="leading-snug">{t("prepare.checklistItem3")}</span>
          </li>
        </ul>
      </div>

      {/* Supported formats — lightweight inline badge row */}
      <div className="flex flex-wrap items-center gap-2 px-0.5" role="list" aria-label={t("prepare.formatsTitle")}>
        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground shrink-0" aria-hidden="true">
          {t("prepare.formatsTitle")}:
        </span>
        <span role="listitem" className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300">
          .CSV
        </span>
        <span role="listitem" className="inline-flex items-center rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-xs font-semibold text-green-700 dark:text-green-300">
          .XLSX
        </span>
        <span role="listitem" aria-label={`.XLS — ${t("prepare.xlsDesc")}`} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground line-through opacity-50">
          .XLS
        </span>
        <span role="listitem" aria-label={`PDF — ${t("prepare.pdfDesc")}`} className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground line-through opacity-50">
          PDF
        </span>
      </div>

      {/* Template download — optional, neutral styling */}
      <div className="rounded-xl border border-border bg-muted/20 p-4 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted mt-0.5">
            <FileSpreadsheet aria-hidden="true" className="h-5 w-5 text-muted-foreground" />
          </div>
          <div className="flex-1 min-w-0 space-y-1">
            <p className="text-sm font-semibold">{t("prepare.templateTitle")}</p>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t("prepare.templateDescription")}
            </p>
          </div>
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadTemplate}
            className="gap-2"
          >
            <Download aria-hidden="true" className="h-3.5 w-3.5" />
            {t("prepare.templateDownload")}
          </Button>
        </div>
      </div>

      {/* Own-file hint + proceed */}
      <div className="flex flex-col items-end gap-2 pt-1">
        <p className="text-xs text-muted-foreground text-end leading-snug">
          {t("prepare.ownFileHint")}
        </p>
        <Button
          onClick={onNext}
          className="gap-1.5"
          aria-label={t("prepare.nextAriaLabel", { defaultValue: "Continue to file upload" })}
        >
          {t("navigation.next")}
          <NextIcon aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </motion.div>
  );
}
