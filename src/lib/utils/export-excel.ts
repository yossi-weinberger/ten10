import ExcelJS from "exceljs";
import type { Transaction } from "@/types/transaction";

export async function exportTransactionsToExcel(
  transactions: Transaction[],
  filename = "Ten10-transactions.xlsx",
  currentLanguage: string = "he",
  translations?: Record<string, string>
) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Ten10";
  workbook.created = new Date();
  workbook.modified = new Date();

  // Use provided translations or fallback to static ones
  const isHebrew = currentLanguage === "he";
  const t = (key: string) => {
    if (translations && translations[key]) {
      return translations[key];
    }

    // Fallback static translations
    const fallbackTranslations = isHebrew
      ? {
          "sheet.name": "עסקאות",
          "columns.date": "תאריך",
          "columns.type": "סוג",
          "columns.amount": "סכום",
          "columns.description": "תיאור",
          "columns.category": "קטגוריה",
          "columns.is_chomesh": "חומש?",
          "columns.is_recurring": "הוראת קבע?",
          "columns.recurring_status": 'סטטוס הו"ק',
          "columns.recurring_progress": 'התקדמות הו"ק',
          "values.yes": "כן",
          "values.no": "לא",
          "transactionTypes.income": "הכנסה",
          "transactionTypes.expense": "הוצאה",
          "transactionTypes.donation": "תרומה",
          "transactionTypes.exempt-income": "הכנסה פטורה",
          "transactionTypes.recognized-expense": "הוצאה מוכרת",
          "transactionTypes.non_tithe_donation": "תרומה ללא מעשר",
          "frequencies.daily": "יומית",
          "frequencies.weekly": "שבועית",
          "frequencies.monthly": "חודשית",
          "frequencies.yearly": "שנתית",
        }
      : {
          "sheet.name": "Transactions",
          "columns.date": "Date",
          "columns.type": "Type",
          "columns.amount": "Amount",
          "columns.description": "Description",
          "columns.category": "Category",
          "columns.is_chomesh": "Chomesh?",
          "columns.is_recurring": "Recurring?",
          "columns.recurring_status": "Rec. Status",
          "columns.recurring_progress": "Rec. Progress",
          "values.yes": "Yes",
          "values.no": "No",
          "transactionTypes.income": "Income",
          "transactionTypes.expense": "Expense",
          "transactionTypes.donation": "Donation",
          "transactionTypes.exempt-income": "Exempt Income",
          "transactionTypes.recognized-expense": "Recognized Expense",
          "transactionTypes.non_tithe_donation": "Non-tithe Donation",
          "frequencies.daily": "Daily",
          "frequencies.weekly": "Weekly",
          "frequencies.monthly": "Monthly",
          "frequencies.yearly": "Yearly",
        };
    return (
      fallbackTranslations[key as keyof typeof fallbackTranslations] || key
    );
  };

  const sheet = workbook.addWorksheet(t("sheet.name"), {
    views: [{ rightToLeft: isHebrew }],
    properties: { defaultRowHeight: 20 },
  });

  // Column order: Date, Type, Amount+Currency, Description, Category, Is Chomesh, Is Recurring, Rec Status, Rec Progress
  const baseColumns = [
    {
      header: t("columns.date"),
      key: "date",
      width: 12,
      style: { numFmt: "dd/mm/yyyy" },
    },
    { header: t("columns.type"), key: "type", width: 15 },
    {
      header: t("columns.amount"),
      key: "amount",
      width: 18,
      style: { numFmt: "#,##0.00" }, // Generic number format, currency will be set per cell
    },
    { header: t("columns.description"), key: "description", width: 30 },
    { header: t("columns.category"), key: "category", width: 20 },
    { header: t("columns.is_chomesh"), key: "is_chomesh", width: 10 },
    { header: t("columns.is_recurring"), key: "is_recurring", width: 12 },
    {
      header: t("columns.recurring_status"),
      key: "recurring_status",
      width: 18,
    },
    {
      header: t("columns.recurring_progress"),
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
    const freqMap = isHebrew
      ? {
          daily: "יומית",
          weekly: "שבועית",
          monthly: "חודשית",
          yearly: "שנתית",
        }
      : {
          daily: "Daily",
          weekly: "Weekly",
          monthly: "Monthly",
          yearly: "Yearly",
        };

    const frequencyText = transaction.recurring_frequency
      ? freqMap[transaction.recurring_frequency as keyof typeof freqMap] ||
        transaction.recurring_frequency
      : "";

    const progressText =
      transaction.occurrence_number && transaction.total_occurrences
        ? `${transaction.occurrence_number}/${transaction.total_occurrences}`
        : transaction.occurrence_number
        ? `${transaction.occurrence_number}/∞`
        : "";

    const rowData = {
      date: new Date(transaction.date),
      type: t(`transactionTypes.${transaction.type}`) || transaction.type,
      amount: transaction.amount,
      description: transaction.description || "",
      category: transaction.category || "",
      is_chomesh:
        transaction.type === "income"
          ? transaction.is_chomesh
            ? t("values.yes")
            : t("values.no")
          : "",
      is_recurring: isRecurring ? t("values.yes") : t("values.no"),
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
  a.download = `Ten10-transactions-${
    new Date().toISOString().split("T")[0]
  }.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}
