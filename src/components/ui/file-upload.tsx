import { useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, File as FileIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { Button } from "./button";

interface FileUploadProps {
  value: File[];
  onChange: (files: File[]) => void;
  maxFiles?: number;
  maxSize?: number; // in bytes
  accept?: Record<string, string[]>;
  className?: string;
}

export const FileUpload = ({
  value = [],
  onChange,
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024, // 5MB default
  accept = {
    "image/*": [".png", ".jpg", ".jpeg", ".gif"],
    "application/pdf": [".pdf"],
  },
  className,
}: FileUploadProps) => {
  const { t } = useTranslation("contact");

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = [...value, ...acceptedFiles].slice(0, maxFiles);
      onChange(newFiles);
    },
    [value, maxFiles, onChange]
  );

  const removeFile = (fileToRemove: File) => {
    const newFiles = value.filter((file) => file !== fileToRemove);
    onChange(newFiles);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles,
    maxSize,
    accept,
  });

  return (
    <div className={cn("space-y-3", className)}>
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 transition-colors cursor-pointer flex flex-col items-center justify-center text-center",
          isDragActive
            ? "border-primary bg-primary/10"
            : "border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50"
        )}
      >
        <input {...getInputProps()} />
        <Upload className="h-8 w-8 mb-2 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          {isDragActive ? (
            t("forms.attachments.dropActive")
          ) : (
            <>
              {t("forms.attachments.dropInactive")}
              <br />
              <span className="text-xs text-muted-foreground/75">
                {t("forms.attachments.limits", {
                  maxFiles,
                  maxSizeMB: maxSize / 1024 / 1024,
                })}
              </span>
            </>
          )}
        </p>
      </div>

      {value.length > 0 && (
        <ul className="space-y-2">
          {value.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between p-2 rounded-md bg-secondary/50 text-sm"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <FileIcon className="h-4 w-4 text-primary shrink-0" />
                <span className="truncate max-w-[120px] sm:max-w-[150px] md:max-w-[180px]">
                  {file.name}
                </span>
                <span className="text-xs text-muted-foreground shrink-0">
                  ({(file.size / 1024).toFixed(1)} KB)
                </span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:text-destructive"
                onClick={() => removeFile(file)}
                type="button" // Prevent form submission
              >
                <X className="h-4 w-4" />
                <span className="sr-only">
                  {t("forms.attachments.removeFile")}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
