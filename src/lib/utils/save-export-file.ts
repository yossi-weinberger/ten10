import { getPlatform } from "@/lib/platformManager";

export type ExportSaveFilter = { name: string; extensions: string[] };

/** Set on `exportError` when the user closes the desktop save dialog without saving */
export const EXPORT_DESKTOP_SAVE_CANCELLED = "__export_desktop_save_cancelled__";

/**
 * Desktop: opens the system save dialog (same as analytics PDF). Web: browser download.
 * @returns false if the user cancelled the desktop save dialog; true if the file was written or downloaded.
 */
export async function saveOrDownloadExportedFile(params: {
  bytes: Uint8Array;
  defaultFilename: string;
  filters: ExportSaveFilter[];
  mimeType?: string;
}): Promise<boolean> {
  const { bytes, defaultFilename, filters, mimeType } = params;
  if (getPlatform() === "desktop") {
    const { save } = await import("@tauri-apps/plugin-dialog");
    const { writeFile } = await import("@tauri-apps/plugin-fs");
    const savePath = await save({ defaultPath: defaultFilename, filters });
    if (!savePath) return false;
    await writeFile(savePath, bytes);
    return true;
  }
  const blob = new Blob([bytes as BlobPart], mimeType ? { type: mimeType } : undefined);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = defaultFilename;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
