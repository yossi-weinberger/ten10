import type { Transaction } from "@/types/transaction";
import i18n from "@/lib/i18n";
import { logger } from "@/lib/logger";
import { saveOrDownloadExportedFile } from "@/lib/utils/save-export-file";
import { formatPaymentMethod } from "@/lib/payment-methods";
import { getRecurringExportInfo, getExportCategoryLabel } from "@/lib/utils/export-transaction-fields";

function escapeCsvCell(
  cellData: string | number | boolean | null | undefined
): string {
  if (cellData == null) {
    // handles undefined and null
    return "";
  }
  const stringData = String(cellData);
  // If the string contains a comma, newline, or double quote, enclose it in double quotes.
  // Also, any existing double quotes within the string must be escaped by doubling them.
  if (
    stringData.includes(",") ||
    stringData.includes("\n") ||
    stringData.includes('"')
  ) {
    return `"${stringData.replace(/"/g, '""')}"`;
  }
  return stringData;
}

export async function exportTransactionsToCSV(
  transactions: Transaction[],
  filename = "Ten10-transactions.csv",
  currentLanguage: string = "he"
): Promise<boolean> {
  if (!transactions || transactions.length === 0) {
    logger.warn("No transactions to export to CSV.");
    return true;
  }

  const isHebrew = currentLanguage === "he";

  const headers = [
    i18n.t("columns.date", { lng: currentLanguage, ns: "data-tables" }),
    i18n.t("columns.type", { lng: currentLanguage, ns: "data-tables" }),
    i18n.t("columns.description", { lng: currentLanguage, ns: "data-tables" }),
    i18n.t("columns.category", { lng: currentLanguage, ns: "data-tables" }),
    i18n.t("columns.recipient", { lng: currentLanguage, ns: "data-tables" }),
    i18n.t("columns.paymentMethod", {
      lng: currentLanguage,
      ns: "data-tables",
    }),
    i18n.t("columns.amount", { lng: currentLanguage, ns: "data-tables" }),
    i18n.t("columns.currency", { lng: currentLanguage, ns: "data-tables" }),
    i18n.t("columns.chomesh", { lng: currentLanguage, ns: "data-tables" }),
    i18n.t("columns.movementType", { lng: currentLanguage, ns: "data-tables" }),
    i18n.t("columns.recurringStatus", {
      lng: currentLanguage,
      ns: "data-tables",
    }),
    i18n.t("columns.recurringProgress", {
      lng: currentLanguage,
      ns: "data-tables",
    }),
    i18n.t("columns.id", { lng: currentLanguage, ns: "data-tables" }),
    i18n.t("columns.userId", { lng: currentLanguage, ns: "data-tables" }),
    i18n.t("columns.createdAt", { lng: currentLanguage, ns: "data-tables" }),
    i18n.t("columns.updatedAt", { lng: currentLanguage, ns: "data-tables" }),
    i18n.t("columns.sourceRecurringId", {
      lng: currentLanguage,
      ns: "data-tables",
    }),
  ];

  const csvRows = [
    headers.map(escapeCsvCell).join(","), // Header row
    ...transactions.map((transaction) => {
      const { isRecurring, frequencyText, progressText } = getRecurringExportInfo(
        transaction,
        currentLanguage
      );

      const locale = isHebrew ? "he-IL" : "en-US";

      const row = [
        new Date(transaction.date).toLocaleDateString(locale, {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
        i18n.t(`export.transactionTypes.${transaction.type}`, {
          lng: currentLanguage,
          ns: "common",
        }) || transaction.type,
        transaction.description || "",
        getExportCategoryLabel(transaction, currentLanguage),
        transaction.recipient || "",
        formatPaymentMethod(transaction.payment_method, currentLanguage),
        transaction.amount,
        transaction.currency,
        transaction.is_chomesh
          ? i18n.t("boolean.yes", { lng: currentLanguage, ns: "common" })
          : transaction.is_chomesh === false
          ? i18n.t("boolean.no", { lng: currentLanguage, ns: "common" })
          : "",
        isRecurring
          ? i18n.t("movementType.recurring", {
              lng: currentLanguage,
              ns: "data-tables",
            })
          : i18n.t("movementType.regular", {
              lng: currentLanguage,
              ns: "data-tables",
            }),
        frequencyText,
        progressText,
        transaction.id,
        transaction.user_id || "",
        transaction.created_at
          ? new Date(transaction.created_at).toLocaleString(locale)
          : "",
        transaction.updated_at
          ? new Date(transaction.updated_at).toLocaleString(locale)
          : "",
        transaction.source_recurring_id || "",
      ];
      return row.map(escapeCsvCell).join(",");
    }),
  ];

  const csvString = csvRows.join("\n");
  const blob = new Blob([`\uFEFF${csvString}`], {
    type: "text/csv;charset=utf-8;",
  }); // \uFEFF for BOM to ensure Excel opens UTF-8 correctly

  const bytes = new Uint8Array(await blob.arrayBuffer());
  const defaultFilename = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  return saveOrDownloadExportedFile({
    bytes,
    defaultFilename,
    filters: [{ name: "CSV", extensions: ["csv"] }],
    mimeType: "text/csv;charset=utf-8",
  });
}
