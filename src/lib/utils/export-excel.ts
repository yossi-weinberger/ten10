import ExcelJS from "exceljs";
import type { Transaction } from "@/types/transaction";
import { transactionTypeLabels } from "@/components/tables/AllTransactionsDataTable";

export async function exportTransactionsToExcel(transactions: Transaction[]) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Tenten";
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
    { header: "מקבל", key: "recipient", width: 20 },
    { header: "סכום", key: "amount", width: 15, style: { numFmt: "#,##0.00" } },
    { header: "מטבע", key: "currency", width: 8 },
    { header: "חומש?", key: "chomesh", width: 8 },
  ];

  sheet.addRows(
    transactions.map((t) => {
      let desc = t.description || "";

      return {
        date: new Date(t.date),
        type: transactionTypeLabels[t.type] || t.type,
        description: t.description || "",
        category: t.category || "",
        recipient: t.recipient || "",
        amount: t.amount,
        currency: t.currency,
        chomesh: t.type === "income" ? (t.isChomesh ? "כן" : "לא") : "",
      };
    })
  );

  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).alignment = { vertical: "middle", horizontal: "right" };
  ["type", "description", "category", "recipient", "chomesh"].forEach((key) => {
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
  a.download = `tenten-transactions-${
    new Date().toISOString().split("T")[0]
  }.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}
