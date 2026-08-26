import { PDFDocument, type PDFImage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import regularFontUrl from "/fonts/Rubik-Regular.ttf?url";
import mediumFontUrl from "/fonts/Rubik-Medium.ttf?url";
import { saveOrDownloadExportedFile } from "@/lib/utils/save-export-file";
import { logger } from "@/lib/logger";
import { prepareHalachaPrintModel } from "./print-halacha";
import { stripPrintMarkup } from "./wrap-plain-text";
import { renderHalachaBooklet } from "./write-halacha-booklet";

async function embedPng(
  pdfDoc: PDFDocument,
  path: string
): Promise<PDFImage> {
  const bytes = await fetch(path).then((res) => {
    if (!res.ok) throw new Error(`missing ${path}`);
    return res.arrayBuffer();
  });
  return pdfDoc.embedPng(bytes);
}

async function embedBookletLogos(pdfDoc: PDFDocument) {
  const [institute, app] = await Promise.all([
    embedPng(pdfDoc, "/halacha/machon-semel.png").catch((error) => {
      logger.error("Failed to load institute logo", error);
      return undefined;
    }),
    embedPng(pdfDoc, "/logo/logo-wide.png").catch(async () => {
      try {
        return await embedPng(pdfDoc, "/icon-192.png");
      } catch (error) {
        logger.error("Failed to load booklet logo", error);
        return undefined;
      }
    }),
  ]);
  return { institute, app };
}

export async function exportHalachaPdf(): Promise<boolean> {
  try {
    const model = await prepareHalachaPrintModel();
    const pdfDoc = await PDFDocument.create();
    pdfDoc.registerFontkit(fontkit);
    pdfDoc.setTitle(stripPrintMarkup(model.title));
    pdfDoc.setAuthor("Ten10 App");
    pdfDoc.setCreator("Ten10");
    pdfDoc.setProducer("Ten10");
    pdfDoc.setCreationDate(new Date());

    const [regularFontBytes, mediumFontBytes, logos] = await Promise.all([
      fetch(regularFontUrl).then((res) => res.arrayBuffer()),
      fetch(mediumFontUrl).then((res) => res.arrayBuffer()),
      embedBookletLogos(pdfDoc),
    ]);
    const regularFont = await pdfDoc.embedFont(regularFontBytes);
    const boldFont = await pdfDoc.embedFont(mediumFontBytes);
    renderHalachaBooklet(pdfDoc, regularFont, boldFont, model, logos);

    const pdfBytes = await pdfDoc.save();
    return saveOrDownloadExportedFile({
      bytes: pdfBytes,
      defaultFilename: "Ten10_Halachot.pdf",
      filters: [{ name: "PDF", extensions: ["pdf"] }],
      mimeType: "application/pdf",
    });
  } catch (error) {
    logger.error("Error exporting halacha PDF:", error);
    throw error;
  }
}
