import type { Transaction } from "@/types/transaction";
import { transactionTypeLabels } from "@/types/transactionLabels";

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
  filename = "Ten10-transactions.csv"
) {
  if (!transactions || transactions.length === 0) {
    console.warn("No transactions to export to CSV.");
    // Optionally, show a user notification here
    return;
  }

  const headers = [
    "תאריך",
    "סוג",
    "תיאור",
    "קטגוריה",
    "נמען/משלם",
    "סכום",
    "מטבע",
    "חומש?",
    "קבועה?",
    "יום בחודש (קבועה)",
    "סך חזרות (קבועה)",
    "מזהה",
    "מזהה משתמש",
    "נוצר בתאריך",
    "עודכן בתאריך",
  ];

  const csvRows = [
    headers.join(","), // Header row
    ...transactions.map((t) => {
      const row = [
        new Date(t.date).toLocaleDateString("he-IL", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }),
        transactionTypeLabels[t.type] || t.type,
        t.description || "",
        t.category || "",
        t.recipient || "",
        t.amount,
        t.currency,
        t.is_chomesh ? "כן" : t.is_chomesh === false ? "לא" : "",
        t.is_recurring ? "כן" : t.is_recurring === false ? "לא" : "",
        t.recurring_day_of_month ?? "",
        t.recurring_total_count ?? "",
        t.id,
        t.user_id,
        t.created_at ? new Date(t.created_at).toLocaleString("he-IL") : "",
        t.updated_at ? new Date(t.updated_at).toLocaleString("he-IL") : "",
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
