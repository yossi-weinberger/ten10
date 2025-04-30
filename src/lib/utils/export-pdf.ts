import jsPDF from "jspdf";
import "jspdf-autotable";
import type { Transaction } from "@/types/transaction";
import { addFontToJsPDF } from "../pdf-fonts";
import { transactionTypeLabels } from "@/components/tables/AllTransactionsDataTable";
import { formatCurrency } from "./currency";

export async function exportTransactionsToPDF(transactions: Transaction[]) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    putOnlyUsedFonts: true,
    compress: true,
    hotfixes: ["px_scaling"],
  });

  await addFontToJsPDF(doc);

  // כותרת
  doc.setFontSize(20);
  doc.text("דוח תנועות", 190, 20, { align: "right" });

  // טבלת הכנסות
  doc.setFontSize(14);
  doc.text("תנועות", 190, 30, { align: "right" });

  const tableData = transactions.map((t) => [
    new Date(t.date).toLocaleDateString("he-IL"),
    transactionTypeLabels[t.type] || t.type,
    t.description || (t.type === "donation" ? t.recipient : t.category) || "-",
    formatCurrency(t.amount, t.currency),
    t.type === "income" ? (t.isChomesh ? "כן" : "לא") : "",
  ]);

  (doc as any).autoTable({
    startY: 35,
    head: [["תאריך", "סוג", "פרטים", "סכום", "חומש?"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "right",
      font: "assistant",
    },
    styles: {
      font: "assistant",
      halign: "right",
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 30 },
      2: { cellWidth: 70 },
      3: { cellWidth: 30 },
      4: { cellWidth: 15 },
    },
  });

  doc.save(`tenten-transactions-${new Date().toISOString().split("T")[0]}.pdf`);
}
