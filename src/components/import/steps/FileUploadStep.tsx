import { useCallback, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { type FileRejection, useDropzone } from "react-dropzone";
import { usePlatform } from "@/contexts/PlatformContext";
import { logger } from "@/lib/logger";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2, Download } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BrandSpinner } from "@/components/brand/BrandSpinner";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/index";
import { getDropzoneRejectionMessage } from "@/lib/utils/dropzone-rejection";
import { trackProductEvent } from "@/lib/analytics/productAnalytics";
import {
  extensionFromFileName,
  type ImportFileExtension,
} from "@/lib/import/import-analytics";
import { MAX_FILE_SIZE_BYTES, MAX_ROWS } from "@/lib/import/parsers";
import { parseFileInWorker } from "@/lib/import/parse-file-in-worker";
import {
  htmlXlsLooksBounded,
  shouldApplyHtmlXlsGuard,
} from "@/lib/import/html-xls-guard";
import {
  createTen10TemplateFile,
  downloadTemplateCsv,
  generateTemplateCsv,
} from "@/lib/import/ten10-template";
import {
  requestOnboardingTourRefresh,
  subscribeOnboardingImportUploadNext,
} from "@/lib/onboarding/importWizardBridge";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { ParsedFile } from "@/lib/import/import-session.types";

const UPLOAD_REJECTION_KEYS = {
  tooLarge: "upload.errors.tooLarge",
  tooManyFiles: "upload.errors.tooManyFiles",
  unsupportedFormat: "upload.errors.unsupportedFormat",
} as const;

const SHEET_RADIO_THRESHOLD = 5;

export interface FileParsedMeta {
  fileExtension: ImportFileExtension;
}

interface FileUploadStepProps {
  onFileParsed: (file: ParsedFile, meta: FileParsedMeta) => void;
}

const FILE_PARSE_TIMEOUT_MS = 15000;

export function FileUploadStep({ onFileParsed }: FileUploadStepProps) {
  const { t, i18n } = useTranslation("import");
  const { platform } = usePlatform();
  const isMobile = useMediaQuery("(max-width: 767px)");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[] | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [isTauriDragActive, setIsTauriDragActive] = useState(false);

  const handleDownloadTemplate = useCallback(async () => {
    if (platform === "desktop") {
      try {
        const { save } = await import("@tauri-apps/plugin-dialog");
        const { writeTextFile } = await import("@tauri-apps/plugin-fs");
        const csv = generateTemplateCsv(i18n.language);
        const filePath = await save({
          title: t("upload.templateLink"),
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

  const processFile = useCallback(
    async (file: File, sheetName?: string) => {
      setIsLoading(true);
      setError(null);
      const fileExtension = extensionFromFileName(file.name);

      let result: Awaited<ReturnType<typeof parseFileInWorker>>;
      try {
        logger.info("Import upload: parsing file", {
          name: file.name,
          size: file.size,
          sheetName: sheetName ?? null,
        });
        if (shouldApplyHtmlXlsGuard(file.name)) {
          const text = await file.slice(0, Math.min(file.size, MAX_FILE_SIZE_BYTES)).text();
          const head = text.slice(0, 256).toLowerCase();
          const looksLikeHtml =
            head.includes("<html") ||
            head.includes("<!doctype") ||
            head.includes("<table");
          if (looksLikeHtml && !htmlXlsLooksBounded(text)) {
            setIsLoading(false);
            trackProductEvent("transaction_import_parse_error", {
              platform,
              step: "upload",
              errorCode: "parse_error",
              fileExtension,
            });
            setError(t("upload.errors.parseError"));
            return;
          }
        }
        result = await parseFileInWorker(file, sheetName, FILE_PARSE_TIMEOUT_MS);
        logger.info("Import upload: parse finished", {
          ok: result.ok,
          sheetName: result.ok ? result.file.sheetName ?? null : null,
          rowCount: result.ok ? result.file.rowCount : null,
        });
      } catch (err) {
        const isTimeout = err instanceof Error && err.message === "file_parse_timeout";
        logger.error("Import upload: parse timed out or failed:", err);
        setIsLoading(false);
        trackProductEvent("transaction_import_parse_error", {
          platform,
          step: "upload",
          errorCode: isTimeout ? "parse_timeout" : "parse_error",
          fileExtension,
        });
        setError(t(isTimeout ? "upload.errors.parseTimeout" : "upload.errors.parseError"));
        return;
      }

      if (!result.ok) {
        setIsLoading(false);
        trackProductEvent("transaction_import_parse_error", {
          platform,
          step: "upload",
          errorCode: result.error,
          fileExtension,
        });
        const maxMb = Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024);
        switch (result.error) {
          case "too_large":
            setError(t("upload.errors.tooLarge", { size: maxMb }));
            break;
          case "too_many_rows":
            setError(t("upload.errors.tooManyRows", { rows: MAX_ROWS }));
            break;
          case "xls_not_supported":
            setError(t("upload.errors.xlsNotSupported"));
            break;
          case "unsupported_format":
            setError(t("upload.errors.unsupportedFormat"));
            break;
          case "no_data":
            setError(t("upload.errors.noData"));
            break;
          case "no_headers":
            setError(t("upload.errors.noHeaders"));
            break;
          case "parse_error":
            setError(t("upload.errors.parseError"));
            break;
          default: {
            const _exhaustive: never = result.error;
            void _exhaustive;
            setError(t("upload.errors.parseError"));
          }
        }
        return;
      }

      // Multi-sheet workbook: ask user to explicitly pick the sheet before mapping.
      if (result.file.availableSheets && !sheetName) {
        setAvailableSheets(result.file.availableSheets);
        setSelectedSheet(result.file.availableSheets[0] ?? "");
        setIsLoading(false);
        requestAnimationFrame(() => {
          requestOnboardingTourRefresh();
        });
        return;
      }

      setIsLoading(false);
      onFileParsed(result.file, { fileExtension });
    },
    [onFileParsed, t, platform]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      trackProductEvent("transaction_import_file_picked", {
        platform,
        step: "upload",
        fileExtension: extensionFromFileName(file.name),
      });
      setPendingFile(file);
      setAvailableSheets(null);
      await processFile(file);
    },
    [processFile, platform]
  );

  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      setError(
        getDropzoneRejectionMessage(rejections, t, UPLOAD_REJECTION_KEYS, {
          maxSizeBytes: MAX_FILE_SIZE_BYTES,
          maxFiles: 1,
        })
      );
    },
    [t]
  );

  const handleSheetConfirm = useCallback(async () => {
    if (!pendingFile || !selectedSheet) return;
    await processFile(pendingFile, selectedSheet);
  }, [pendingFile, selectedSheet, processFile]);

  const handleChangeFile = useCallback(() => {
    setAvailableSheets(null);
    setPendingFile(null);
    setError(null);
  }, []);

  useEffect(() => {
    return subscribeOnboardingImportUploadNext(() => {
      if (isLoading) return;
      if (availableSheets) {
        void handleSheetConfirm();
        return;
      }
      void processFile(createTen10TemplateFile(i18n.language));
    });
  }, [availableSheets, isLoading, handleSheetConfirm, processFile, i18n.language]);

  // Desktop: Tauri drag-and-drop handler (DOM drag events may be blocked by the webview)
  useEffect(() => {
    if (platform !== "desktop") return;
    let unlisten: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      try {
        const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const appWindow = getCurrentWebviewWindow();
        const fn = await appWindow.onDragDropEvent(async (event) => {
          const type = event.payload.type;

          if (type === "enter" || type === "over") {
            setIsTauriDragActive(true);
            return;
          }
          if (type === "leave") {
            setIsTauriDragActive(false);
            return;
          }
          if (type !== "drop") return;

          setIsTauriDragActive(false);
          const paths: string[] = (event.payload as { paths: string[] }).paths ?? [];
          if (paths.length === 0) return;

          const filePath = paths[0];
          const fileName = filePath.replace(/\\/g, "/").split("/").pop() ?? "file";
          const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

          if (ext !== "csv" && ext !== "xlsx" && ext !== "xls") {
            setPendingFile(null);
            setAvailableSheets(null);
            setIsLoading(false);
            setError(t("upload.errors.unsupportedFormat"));
            return;
          }

          try {
            const { readFile } = await import("@tauri-apps/plugin-fs");
            const bytes = await readFile(filePath);
            const mimeType =
              ext === "csv"
                ? "text/csv"
                : ext === "xls"
                  ? "application/vnd.ms-excel"
                  : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            const blob = new Blob([bytes], { type: mimeType });
            const file = new File([blob], fileName, { type: mimeType });
            setPendingFile(file);
            setAvailableSheets(null);
            await processFile(file);
          } catch (err) {
            logger.error("Failed to read dropped file on desktop:", err);
          }
        });
        // If the component unmounted before the async setup finished, clean up immediately.
        if (cancelled) {
          fn();
        } else {
          unlisten = fn;
        }
      } catch (err) {
        logger.warn("Could not set up Tauri drag-drop handler:", err);
      }
    })();

    return () => {
      cancelled = true;
      setIsTauriDragActive(false);
      unlisten?.();
    };
  }, [platform, processFile, t]);

  const { getRootProps, getInputProps, isDragActive: isWebDragActive } = useDropzone({
    onDrop,
    onDropRejected,
    // Accept multiple MIME types for the same extensions:
    // Windows Explorer often sends generic MIME types when dragging files.
    accept: {
      "text/csv": [".csv"],
      "text/plain": [".csv"],
      "application/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.ms-excel": [".xls", ".xlsx"],
      "application/octet-stream": [".csv", ".xlsx", ".xls"],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE_BYTES,
    disabled: isLoading,
  });

  const maxMb = Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024);
  const isDragActive = isWebDragActive || isTauriDragActive;
  const useSheetRadios =
    availableSheets !== null && availableSheets.length <= SHEET_RADIO_THRESHOLD;

  return (
    <div className="space-y-4" data-onboarding="import-upload">
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold leading-snug">{t("upload.title2")}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">{t("upload.lead")}</p>
      </div>

      {/* Dropzone — hidden once sheet selection is active */}
      {!availableSheets && (
        <div
          {...getRootProps()}
          className={cn(
            "rounded-lg text-center cursor-pointer transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            isMobile
              ? cn(
                  "border border-border bg-muted/30 p-5",
                  isDragActive && "border-primary bg-primary/5"
                )
              : cn(
                  "border-2 border-dashed p-8",
                  isDragActive
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50 hover:bg-muted/40"
                ),
            isLoading && "opacity-50 pointer-events-none"
          )}
        >
          <input {...getInputProps()} />

          <div className="flex flex-col items-center gap-4">
            {isLoading ? (
              <>
                <BrandSpinner className="h-10 w-10" />
                <p className="text-sm text-muted-foreground">{t("review.processing")}</p>
              </>
            ) : isDragActive ? (
              <>
                <Upload className="h-10 w-10 text-primary" aria-hidden="true" />
                <p className="text-base font-semibold">{t("upload.dropzoneActive")}</p>
              </>
            ) : isMobile ? (
              <>
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <Button type="button" className="h-12 w-full" tabIndex={-1}>
                  {t("upload.pickButton")}
                </Button>
              </>
            ) : (
              <>
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
                <div className="space-y-3 text-center">
                  <p className="text-base font-semibold">{t("upload.dropzone")}</p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                      CSV / .XLSX / .XLS
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                      {t("upload.limitSize", { size: maxMb })}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                      {t("upload.limitRows", { rows: MAX_ROWS })}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile caption under the card */}
      {!availableSheets && isMobile && !isLoading && (
        <p className="text-[13.5px] text-muted-foreground text-center leading-snug">
          {t("upload.caption", { size: maxMb, rows: MAX_ROWS })}
        </p>
      )}

      {/* Template download — all widths */}
      {!availableSheets && (
        <div className="flex min-h-11 items-center justify-center gap-1.5 flex-wrap text-sm text-muted-foreground">
          <span>{t("upload.templatePrefix")}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              void handleDownloadTemplate();
            }}
            className="inline-flex min-h-11 items-center gap-1.5 text-sm font-medium text-foreground underline-offset-2 hover:underline"
          >
            <Download className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            {t("upload.templateLink")}
          </button>
        </div>
      )}

      {/* Selected file chip */}
      {pendingFile && !isLoading && !availableSheets && (
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium flex-1 min-w-0 truncate" dir="ltr">
            {pendingFile.name}
          </span>
          {error ? (
            <AlertTriangle className="h-4 w-4 text-destructive shrink-0" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" aria-hidden="true" />
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Sheet selection */}
      {availableSheets && (
        <div className="space-y-3">
          {pendingFile && (
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium flex-1 min-w-0 truncate" dir="ltr">
                {pendingFile.name}
              </span>
            </div>
          )}
          <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
            <p className="text-sm font-medium">{t("upload.sheetSelect.title")}</p>

            {useSheetRadios ? (
              <RadioGroup
                value={selectedSheet}
                onValueChange={setSelectedSheet}
                className="gap-0"
              >
                {availableSheets.map((sheet) => {
                  const id = `import-sheet-${sheet}`;
                  return (
                    <div
                      key={sheet}
                      className="flex min-h-11 items-center gap-3 border-b border-border/60 last:border-b-0 px-1"
                    >
                      <RadioGroupItem value={sheet} id={id} />
                      <Label htmlFor={id} className="flex-1 cursor-pointer py-3 text-sm font-normal">
                        {sheet}
                      </Label>
                    </div>
                  );
                })}
              </RadioGroup>
            ) : (
              <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                <SelectTrigger className="w-full max-md:h-11">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableSheets.map((sheet) => (
                    <SelectItem key={sheet} value={sheet}>
                      {sheet}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="ghost"
                onClick={handleChangeFile}
                className="h-11 max-md:w-full sm:order-1"
              >
                {t("upload.sheetSelect.changeFile")}
              </Button>
              <Button
                onClick={handleSheetConfirm}
                disabled={!selectedSheet || isLoading}
                className="h-11 max-md:w-full sm:order-2"
              >
                {isLoading ? <BrandSpinner className="h-4 w-4" /> : null}
                {t("upload.sheetSelect.confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
