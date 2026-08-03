import type { FileRejection } from "react-dropzone";

/**
 * Known react-dropzone rejection codes we map to user-facing copy.
 * Anything else falls through to the unsupported/generic message.
 */
export type DropzoneRejectionCode =
  | "file-too-large"
  | "too-many-files"
  | "file-invalid-type"
  | "unknown";

export type DropzoneRejectionMessageKeys = {
  tooLarge: string;
  tooManyFiles: string;
  unsupportedFormat: string;
};

type Translate = (
  key: string,
  options?: Record<string, string | number>
) => string;

/**
 * Returns the primary rejection code from a dropzone `onDropRejected` payload.
 */
export function getPrimaryDropzoneRejectionCode(
  rejections: FileRejection[]
): DropzoneRejectionCode {
  const code = rejections[0]?.errors[0]?.code;
  switch (code) {
    case "file-too-large":
    case "too-many-files":
    case "file-invalid-type":
      return code;
    default:
      return "unknown";
  }
}

/**
 * Maps dropzone rejection codes to a localized user message.
 * Callers supply i18n keys so contact/import (different namespaces) can share
 * the same mapping without sharing translation strings.
 */
export function getDropzoneRejectionMessage(
  rejections: FileRejection[],
  t: Translate,
  keys: DropzoneRejectionMessageKeys,
  options: {
    maxSizeBytes: number;
    maxFiles?: number;
  }
): string {
  const code = getPrimaryDropzoneRejectionCode(rejections);
  switch (code) {
    case "file-too-large":
      return t(keys.tooLarge, {
        size: Math.round(options.maxSizeBytes / 1024 / 1024),
      });
    case "too-many-files":
      return t(keys.tooManyFiles, {
        maxFiles: options.maxFiles ?? 1,
      });
    case "file-invalid-type":
    case "unknown":
      return t(keys.unsupportedFormat);
    default: {
      const _exhaustive: never = code;
      return _exhaustive;
    }
  }
}
