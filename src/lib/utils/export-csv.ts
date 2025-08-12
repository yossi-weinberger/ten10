import type { Transaction } from "@/types/transaction";
import i18n from "@/lib/i18n";

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

export function exportTransactionsToCSV(
  transactions: Transaction[],
  filename = "Ten10-transactions.csv",
  currentLanguage: string = "he"
) {
  if (!transactions || transactions.length === 0) {
    console.warn("No transactions to export to CSV.");
    // Optionally, show a user notification here
    return;
  }

  const isHebrew = currentLanguage === "he";

  const headers = [
    i18n.t("columns.date", { lng: currentLanguage, ns: "data-tables" }) ||
      (isHebrew ? "תאריך" : "Date"),
    i18n.t("columns.type", { lng: currentLanguage, ns: "data-tables" }) ||
      (isHebrew ? "סוג" : "Type"),
    i18n.t("columns.description", {
      lng: currentLanguage,
      ns: "data-tables",
    }) || (isHebrew ? "תיאור" : "Description"),
    i18n.t("columns.category", { lng: currentLanguage, ns: "data-tables" }) ||
      (isHebrew ? "קטגוריה" : "Category"),
    i18n.t("columns.recipient", { lng: currentLanguage, ns: "data-tables" }) ||
      (isHebrew ? "נמען/משלם" : "Recipient/Payer"),
    i18n.t("columns.amount", { lng: currentLanguage, ns: "data-tables" }) ||
      (isHebrew ? "סכום" : "Amount"),
    i18n.t("columns.currency", { lng: currentLanguage, ns: "data-tables" }) ||
      (isHebrew ? "מטבע" : "Currency"),
    i18n.t("columns.chomesh", { lng: currentLanguage, ns: "data-tables" }) ||
      (isHebrew ? "חומש?" : "Chomesh?"),
    isHebrew ? "סוג תנועה" : "Movement Type",
    isHebrew ? 'סטטוס ה"ק' : "Rec. Status",
    isHebrew ? 'תדירות ה"ק' : "Rec. Frequency",
    isHebrew ? 'התקדמות ה"ק' : "Rec. Progress",
    isHebrew ? "מזהה" : "ID",
    isHebrew ? "מזהה משתמש" : "User ID",
    isHebrew ? "נוצר בתאריך" : "Created At",
    isHebrew ? "עודכן בתאריך" : "Updated At",
    isHebrew ? 'מזהה ה"ק מקור' : "Source Rec. ID",
  ];

  const csvRows = [
    headers.join(","), // Header row
    ...transactions.map((transaction) => {
      // Use Transaction fields instead of recurring_info
      const isRecurring = !!(
        transaction.source_recurring_id || transaction.recurring_frequency
      );

      const frequencyText = transaction.recurring_frequency
        ? (isHebrew
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
              })[transaction.recurring_frequency] ||
          transaction.recurring_frequency
        : "";

      const progressText =
        transaction.occurrence_number && transaction.total_occurrences
          ? `${transaction.occurrence_number}/${transaction.total_occurrences}`
          : transaction.occurrence_number
          ? `${transaction.occurrence_number}/∞`
          : "";

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
        transaction.category || "",
        transaction.recipient || "",
        transaction.amount,
        transaction.currency,
        transaction.is_chomesh
          ? isHebrew
            ? "כן"
            : "Yes"
          : transaction.is_chomesh === false
          ? isHebrew
            ? "לא"
            : "No"
          : "",
        isRecurring
          ? isHebrew
            ? "הוראת קבע"
            : "Recurring"
          : isHebrew
          ? "רגילה"
          : "Regular",
        "", // recurring status - not available in current Transaction type
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

  const link = document.createElement("a");
  if (link.download !== undefined) {
    // Feature detection
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute(
      "download",
      `${filename}_${new Date().toISOString().split("T")[0]}.csv`
    );
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    // Fallback for older browsers (e.g., IE)
    // This might not work as well for UTF-8 or large files
    console.warn("CSV download method not fully supported in this browser.");
    // (navigator as any).msSaveBlob(blob, filename); // If you need IE10+ support
  }
}
