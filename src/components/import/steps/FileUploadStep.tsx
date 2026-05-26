import { useCallback, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { type FileRejection, useDropzone } from "react-dropzone";
import { usePlatform } from "@/contexts/PlatformContext";
import { logger } from "@/lib/logger";
import { Upload, FileSpreadsheet, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils/index";
import { withTimeout } from "@/lib/utils/with-timeout";
import { parseFile, MAX_FILE_SIZE_BYTES, MAX_ROWS } from "@/lib/import/parsers";
import type { ParsedFile } from "@/lib/import/import-session.types";

interface FileUploadStepProps {
  onFileParsed: (file: ParsedFile) => void;
}

const FILE_PARSE_TIMEOUT_MS = 15000;

export function FileUploadStep({ onFileParsed }: FileUploadStepProps) {
  const { t } = useTranslation("import");
  const { platform } = usePlatform();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[] | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");
  const [isTauriDragActive, setIsTauriDragActive] = useState(false);

  const processFile = useCallback(
    async (file: File, sheetName?: string) => {
      setIsLoading(true);
      setError(null);

      let result: Awaited<ReturnType<typeof parseFile>>;
      try {
        logger.info("Import upload: parsing file", {
          name: file.name,
          size: file.size,
          sheetName: sheetName ?? null,
        });
        result = await withTimeout(
          parseFile(file, sheetName),
          FILE_PARSE_TIMEOUT_MS,
          "file_parse_timeout"
        );
        logger.info("Import upload: parse finished", {
          ok: result.ok,
          sheetName: result.ok ? result.file.sheetName ?? null : null,
          rowCount: result.ok ? result.file.rowCount : null,
        });
      } catch (err) {
        logger.error("Import upload: parse timed out or failed:", err);
        setIsLoading(false);
        setError(t("upload.errors.parseTimeout"));
        return;
      }

      if (!result.ok) {
        setIsLoading(false);
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
          default:
            setError(t("upload.errors.parseError"));
        }
        return;
      }

      // Multi-sheet workbook: ask user to explicitly pick the sheet before mapping.
      if (result.file.availableSheets && !sheetName) {
        setAvailableSheets(result.file.availableSheets);
        setSelectedSheet(result.file.availableSheets[0] ?? "");
        setIsLoading(false);
        return;
      }

      setIsLoading(false);
      onFileParsed(result.file);
    },
    [onFileParsed, t]
  );

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;
      setPendingFile(file);
      setAvailableSheets(null);
      await processFile(file);
    },
    [processFile]
  );

  const onDropRejected = useCallback(
    (rejections: FileRejection[]) => {
      const first = rejections[0];
      const firstError = first?.errors[0];
      if (!firstError) {
        setError(t("upload.errors.unsupportedFormat"));
        return;
      }

      if (firstError.code === "file-too-large") {
        const maxMb = Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024);
        setError(t("upload.errors.tooLarge", { size: maxMb }));
        return;
      }

      if (firstError.code === "too-many-files") {
        setError(t("upload.errors.tooManyFiles"));
        return;
      }

      setError(t("upload.errors.unsupportedFormat"));
    },
    [t]
  );

  const handleSheetConfirm = useCallback(async () => {
    if (!pendingFile || !selectedSheet) return;
    await processFile(pendingFile, selectedSheet);
  }, [pendingFile, selectedSheet, processFile]);

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

          if (ext !== "csv" && ext !== "xlsx") {
            setPendingFile(null);
            setAvailableSheets(null);
            setIsLoading(false);
            setError(
              ext === "xls"
                ? t("upload.errors.xlsNotSupported")
                : t("upload.errors.unsupportedFormat")
            );
            return;
          }

          try {
            const { readFile } = await import("@tauri-apps/plugin-fs");
            const bytes = await readFile(filePath);
            const mimeType =
              ext === "csv"
                ? "text/csv"
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
  // processFile is stable (useCallback), platform won't change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

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
      "application/vnd.ms-excel": [".xlsx"],
      "application/octet-stream": [".csv", ".xlsx"],
    },
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE_BYTES,
    disabled: isLoading,
  });

  const maxMb = Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024);
  const isDragActive = isWebDragActive || isTauriDragActive;

  return (
    <div className="space-y-4">
      {/* Dropzone — hidden once sheet selection is active */}
      {!availableSheets && (
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isDragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50 hover:bg-muted/40",
          isLoading && "opacity-50 pointer-events-none"
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center gap-4">
          {isLoading ? (
            <>
              <img
                src="/logo/symbol.svg"
                alt=""
                aria-hidden="true"
                className="h-10 w-10 animate-spin"
              />
              <p className="text-sm text-muted-foreground">{t("review.processing")}</p>
            </>
          ) : isDragActive ? (
            <>
              <Upload className="h-10 w-10 text-primary" aria-hidden="true" />
              <p className="text-base font-semibold">{t("upload.dropzoneActive")}</p>
            </>
          ) : (
            <>
              <FileSpreadsheet className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
              <div className="space-y-3 text-center">
                <p className="text-base font-semibold">{t("upload.dropzone")}</p>
                <div className="flex flex-wrap justify-center gap-1.5">
                  <span className="inline-flex items-center rounded-full border border-border bg-background px-2.5 py-0.5 text-xs text-muted-foreground">
                    CSV / .XLSX
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

      {/* Selected file chip */}
      {pendingFile && !isLoading && !availableSheets && (
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          <span className="text-sm font-medium flex-1 min-w-0 truncate" dir="ltr">
            {pendingFile.name}
          </span>
          <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0" aria-hidden="true" />
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
          {/* File chip */}
          {pendingFile && (
            <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
              <FileSpreadsheet className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
              <span className="text-sm font-medium flex-1 min-w-0 truncate" dir="ltr">
                {pendingFile.name}
              </span>
              <button
                type="button"
                onClick={() => { setAvailableSheets(null); setPendingFile(null); setError(null); }}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
              >
                {t("upload.sheetSelect.changeFile")}
              </button>
            </div>
          )}
          <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("upload.sheetSelect.title")}</p>
              <p className="text-xs text-muted-foreground">
                {t("upload.sheetSelect.description")}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Select value={selectedSheet} onValueChange={setSelectedSheet}>
                <SelectTrigger className="flex-1">
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
              <Button
                onClick={handleSheetConfirm}
                disabled={!selectedSheet || isLoading}
                className="shrink-0"
              >
                {isLoading ? (
                  <img src="/logo/symbol.svg" alt="" aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : null}
                {t("upload.sheetSelect.confirm")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
