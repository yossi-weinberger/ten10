import { useCallback, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useDropzone } from "react-dropzone";
import { usePlatform } from "@/contexts/PlatformContext";
import { logger } from "@/lib/logger";
import { Upload, FileSpreadsheet, AlertTriangle } from "lucide-react";
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
import { parseFile, MAX_FILE_SIZE_BYTES, MAX_ROWS } from "@/lib/import/parsers";
import type { ParsedFile } from "@/lib/import/import-session.types";

interface FileUploadStepProps {
  onFileParsed: (file: ParsedFile) => void;
}

export function FileUploadStep({ onFileParsed }: FileUploadStepProps) {
  const { t } = useTranslation("import");
  const { platform } = usePlatform();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [availableSheets, setAvailableSheets] = useState<string[] | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>("");

  const processFile = useCallback(
    async (file: File, sheetName?: string) => {
      setIsLoading(true);
      setError(null);

      const result = await parseFile(file, sheetName);

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

      // Multi-sheet workbook: ask user to pick
      if (result.file.availableSheets && result.file.headers.length === 0) {
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

  const handleSheetConfirm = useCallback(async () => {
    if (!pendingFile || !selectedSheet) return;
    await processFile(pendingFile, selectedSheet);
  }, [pendingFile, selectedSheet, processFile]);

  // Desktop: Tauri drag-and-drop handler (DOM drag events may be blocked by the webview)
  useEffect(() => {
    if (platform !== "desktop") return;
    let unlisten: (() => void) | undefined;

    (async () => {
      try {
        const { getCurrentWebviewWindow } = await import("@tauri-apps/api/webviewWindow");
        const appWindow = getCurrentWebviewWindow();
        unlisten = await appWindow.onDragDropEvent(async (event) => {
          if (event.payload.type !== "drop") return;
          const paths: string[] = (event.payload as { paths: string[] }).paths ?? [];
          if (paths.length === 0) return;

          const filePath = paths[0];
          const fileName = filePath.replace(/\\/g, "/").split("/").pop() ?? "file";
          const ext = fileName.split(".").pop()?.toLowerCase() ?? "";

          if (ext !== "csv" && ext !== "xlsx") {
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
      } catch (err) {
        logger.warn("Could not set up Tauri drag-drop handler:", err);
      }
    })();

    return () => { unlisten?.(); };
  // processFile is stable (useCallback), platform won't change
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [platform]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
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
    disabled: isLoading,
  });

  const maxMb = Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024);

  return (
    <div className="space-y-4">
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

        <div className="flex flex-col items-center gap-3">
          {isDragActive ? (
            <Upload className="h-10 w-10 text-primary" aria-hidden="true" />
          ) : (
            <FileSpreadsheet className="h-10 w-10 text-muted-foreground" aria-hidden="true" />
          )}

          <div className="space-y-1">
            <p className="text-sm font-medium">
              {isDragActive
                ? t("upload.dropzoneActive")
                : t("upload.dropzone")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("upload.acceptedFormats")}
            </p>
            <p className="text-xs text-muted-foreground">
              {t("upload.maxSize", { size: maxMb, rows: MAX_ROWS })}
            </p>
          </div>

          {isLoading && (
            <p className="text-sm text-muted-foreground animate-pulse">
              {t("review.processing")}
            </p>
          )}

          {pendingFile && !isLoading && (
            <p className="text-xs text-muted-foreground">
              {t("upload.selectedFile", { name: pendingFile.name })}
            </p>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <Alert variant="destructive" role="alert">
          <AlertTriangle className="h-4 w-4" aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Sheet selection */}
      {availableSheets && (
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
              {t("upload.sheetSelect.confirm")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
