import ExcelJS from "exceljs";
import type { Transaction } from "@/types/transaction";
import i18n from "@/lib/i18n";
import { formatPaymentMethod } from "@/lib/payment-methods";

export async function exportTransactionsToExcel(
  transactions: Transaction[],
  filename = "Ten10-transactions.xlsx",
  currentLanguage: string = "he"
) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Ten10";
  workbook.created = new Date();
  workbook.modified = new Date();

  const isHebrew = currentLanguage === "he";

  const sheetName = i18n.t("sheetName", {
    lng: currentLanguage,
    ns: "data-tables",
  });
  const sheet = workbook.addWorksheet(sheetName, {
    views: [{ rightToLeft: isHebrew }],
    properties: { defaultRowHeight: 20 },
  });

  // Column order: Date, Type, Amount+Currency, Description, Category, Is Chomesh, Is Recurring, Rec Status, Rec Progress
  const baseColumns = [
    {
      header: i18n.t("columns.date", {
        lng: currentLanguage,
        ns: "data-tables",
      }),
      key: "date",
      width: 12,
      style: { numFmt: "dd/mm/yyyy" },
    },
    {
      header: i18n.t("columns.type", {
        lng: currentLanguage,
        ns: "data-tables",
      }),
      key: "type",
      width: 15,
    },
    {
      header: i18n.t("columns.amount", {
        lng: currentLanguage,
        ns: "data-tables",
      }),
      key: "amount",
      width: 18,
      style: { numFmt: "#,##0.00" }, // Generic number format, currency will be set per cell
    },
    {
      header: i18n.t("columns.description", {
        lng: currentLanguage,
        ns: "data-tables",
      }),
      key: "description",
      width: 30,
    },
    {
      header: i18n.t("columns.category", {
        lng: currentLanguage,
        ns: "data-tables",
      }),
      key: "category",
      width: 20,
    },
    {
      header: i18n.t("columns.paymentMethod", {
        lng: currentLanguage,
        ns: "data-tables",
      }),
      key: "payment_method",
      width: 18,
    },
    {
      header: i18n.t("columns.chomesh", {
        lng: currentLanguage,
        ns: "data-tables",
      }),
      key: "is_chomesh",
      width: 10,
    },
    {
      header: i18n.t("columns.recurring", {
        lng: currentLanguage,
        ns: "data-tables",
      }),
      key: "is_recurring",
      width: 12,
    },
    {
      header: i18n.t("columns.recurringStatus", {
        lng: currentLanguage,
        ns: "data-tables",
      }),
      key: "recurring_status",
      width: 18,
    },
    {
      header: i18n.t("columns.recurringProgress", {
        lng: currentLanguage,
        ns: "data-tables",
      }),
      key: "recurring_progress",
      width: 18,
    },
  ];

  sheet.columns = baseColumns;

  // Add rows with proper currency formatting
  transactions.forEach((transaction) => {
    // Use Transaction fields instead of recurring_info
    const isRecurring = !!(
      transaction.source_recurring_id || transaction.recurring_frequency
    );
    const frequencyText = transaction.recurring_frequency
      ? i18n.t(`pdf.frequencies.${transaction.recurring_frequency}`, {
          lng: currentLanguage,
          ns: "common",
        }) || transaction.recurring_frequency
      : "";

    const progressText =
      transaction.occurrence_number && transaction.total_occurrences
        ? `${transaction.occurrence_number}/${transaction.total_occurrences}`
        : transaction.occurrence_number
        ? `${transaction.occurrence_number}/∞`
        : "";

    const rowData = {
      date: new Date(transaction.date),
      type:
        i18n.t(`export.transactionTypes.${transaction.type}`, {
          lng: currentLanguage,
          ns: "common",
        }) || transaction.type,
      amount: transaction.amount,
      description: transaction.description || "",
      category: transaction.category || "",
      payment_method: formatPaymentMethod(
        transaction.payment_method,
        currentLanguage
      ),
      is_chomesh:
        transaction.type === "income"
          ? transaction.is_chomesh
            ? i18n.t("boolean.yes", { lng: currentLanguage, ns: "common" })
            : i18n.t("boolean.no", { lng: currentLanguage, ns: "common" })
          : "",
      is_recurring: isRecurring
        ? i18n.t("boolean.yes", { lng: currentLanguage, ns: "common" })
        : i18n.t("boolean.no", { lng: currentLanguage, ns: "common" }),
      recurring_status: frequencyText,
      recurring_progress: progressText,
    };

    const row = sheet.addRow(rowData);

    // Set currency format for amount cell
    const currencyFormats = {
      ILS: '#,##0.00 "₪"',
      USD: '#,##0.00 "$"',
      EUR: '#,##0.00 "€"',
    };

    const amountCell = row.getCell("amount");
    amountCell.numFmt =
      currencyFormats[transaction.currency as keyof typeof currencyFormats] ||
      "#,##0.00";
  });

  // Header formatting
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = {
    vertical: "middle",
    horizontal: isHebrew ? "right" : "left",
  };

  // Column alignment based on language
  const textAlignment = isHebrew ? "right" : "left";
  [
    "type",
    "description",
    "category",
    "payment_method",
    "is_chomesh",
    "is_recurring",
    "recurring_status",
    "recurring_progress",
  ].forEach((key) => {
    const col = sheet.getColumn(key);
    if (col) {
      col.alignment = {
        vertical: "middle",
        horizontal: textAlignment,
        wrapText: true,
      };
    }
  });

  // Amount column - always center aligned
  const amountCol = sheet.getColumn("amount");
  if (amountCol) {
    amountCol.alignment = {
      vertical: "middle",
      horizontal: "center",
      wrapText: false,
    };
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  const baseName = filename.replace(/\.xlsx$/i, "");
  a.download = `${baseName}-${new Date().toISOString().split("T")[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}
