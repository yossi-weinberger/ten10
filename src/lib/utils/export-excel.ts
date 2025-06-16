import ExcelJS from "exceljs";
import { transactionTypeLabels } from "@/types/transactionLabels";
import type { Transaction } from "@/types/transaction";
import {
  recurringFrequencyLabels,
  recurringStatusLabels,
} from "@/types/recurringTransactionLabels";

export async function exportTransactionsToExcel(transactions: Transaction[]) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Ten10";
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet("טרנזקציות", {
    views: [{ rightToLeft: true }],
    properties: { defaultRowHeight: 20 },
  });

  sheet.columns = [
    {
      header: "תאריך",
      key: "date",
      width: 12,
      style: { numFmt: "dd/mm/yyyy" },
    },
    { header: "סוג", key: "type", width: 15 },
    { header: "תיאור", key: "description", width: 30 },
    { header: "קטגוריה", key: "category", width: 20 },
    { header: "מקבל/משלם", key: "recipient", width: 20 },
    { header: "סכום", key: "amount", width: 15, style: { numFmt: "#,##0.00" } },
    { header: "מטבע", key: "currency", width: 8 },
    { header: "חומש?", key: "is_chomesh", width: 8 },
    { header: "סוג תנועה", key: "transaction_type", width: 15 },
    { header: 'סטטוס ה"ק', key: "recurring_status", width: 15 },
    { header: 'תדירות ה"ק', key: "recurring_frequency", width: 15 },
    { header: 'התקדמות ה"ק', key: "recurring_progress", width: 15 },
  ];

  sheet.addRows(
    transactions.map((t) => {
      const r = t.recurring_info;
      const progress = r
        ? r.total_occurrences
          ? `${r.execution_count} מתוך ${r.total_occurrences}`
          : `${r.execution_count}`
        : "";

      return {
        date: new Date(t.date),
        type: transactionTypeLabels[t.type] || t.type,
        description: t.description || "",
        category: t.category || "",
        recipient: t.recipient || "",
        amount: t.amount,
        currency: t.currency,
        is_chomesh: t.type === "income" ? (t.is_chomesh ? "כן" : "לא") : "",
        transaction_type: r ? "הוראת קבע" : "רגילה",
        recurring_status: r ? recurringStatusLabels[r.status] || r.status : "",
        recurring_frequency: r
          ? recurringFrequencyLabels[r.frequency] || r.frequency
          : "",
        recurring_progress: progress,
      };
    })
  );

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle", horizontal: "right" };
  [
    "type",
    "description",
    "category",
    "recipient",
    "is_chomesh",
    "transaction_type",
    "recurring_status",
    "recurring_frequency",
    "recurring_progress",
  ].forEach((key) => {
    const col = sheet.getColumn(key);
    if (col) {
      col.alignment = {
        vertical: "middle",
        horizontal: "right",
        wrapText: true,
      };
    }
  });

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
