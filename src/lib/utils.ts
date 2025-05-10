import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import ExcelJS from "exceljs";
import jsPDF from "jspdf";
import "jspdf-autotable";
import type { Income, Donation, Currency } from "./store";
import { addFontToJsPDF } from "./pdf-fonts";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function isDesktop(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  return Boolean(window.electronAPI);
}

export async function isOnline(): Promise<boolean> {
  if (typeof window === "undefined") return true;
  return navigator.onLine;
}

export async function getPlatformInfo() {
  const desktop = await isDesktop();
  const online = await isOnline();

  return {
    platform: desktop ? "desktop" : "web",
    online,
    storageType: desktop ? "sqlite" : "supabase",
    features: {
      offlineSupport: desktop,
      sync: !desktop && online,
      localBackup: desktop,
      cloudBackup: !desktop && online,
    },
  };
}

export function formatCurrency(
  amount: number,
  currency: Currency = "ILS"
): string {
  const formats: Record<Currency, { locale: string; currency: string }> = {
    ILS: { locale: "he-IL", currency: "ILS" },
    USD: { locale: "en-US", currency: "USD" },
    EUR: { locale: "de-DE", currency: "EUR" },
  };

  const format = formats[currency];
  return new Intl.NumberFormat(format.locale, {
    style: "currency",
    currency: format.currency,
  }).format(amount);
}

export function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): number {
  if (from === to) return amount;

  const rates: Record<Currency, Record<Currency, number>> = {
    ILS: { USD: 0.27, EUR: 0.25, ILS: 1 },
    USD: { ILS: 3.7, EUR: 0.93, USD: 1 },
    EUR: { ILS: 4, USD: 1.07, EUR: 1 },
  };

  return amount * rates[from][to];
}

export async function exportToExcel(
  incomes: Income[],
  donations: Donation[],
  currency: Currency
) {
  const workbook = new ExcelJS.Workbook();

  workbook.creator = "Ten10";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = true;

  const incomesSheet = workbook.addWorksheet("הכנסות", {
    properties: {
      defaultRowHeight: 20,
      rightToLeft: true,
    },
  });
  const donationsSheet = workbook.addWorksheet("תרומות", {
    properties: {
      defaultRowHeight: 20,
      rightToLeft: true,
    },
  });

  incomesSheet.columns = [
    { header: "תאריך", key: "date", width: 12 },
    { header: "תיאור", key: "description", width: 30 },
    { header: "סכום", key: "amount", width: 15 },
    { header: "חומש", key: "chomesh", width: 10 },
    { header: "תשלום קבוע", key: "recurring", width: 15 },
    { header: "יום בחודש", key: "day", width: 12 },
  ];

  donationsSheet.columns = [
    { header: "תאריך", key: "date", width: 12 },
    { header: "מקבל", key: "recipient", width: 30 },
    { header: "סכום", key: "amount", width: 15 },
    { header: "תשלום קבוע", key: "recurring", width: 15 },
    { header: "יום בחודש", key: "day", width: 12 },
  ];

  incomesSheet.addRows(
    incomes.map((income) => ({
      date: income.date,
      description: income.description,
      amount: formatCurrency(income.amount, income.currency || currency),
      chomesh: income.isChomesh ? "כן" : "לא",
      recurring: income.isRecurring ? "כן" : "לא",
      day: income.recurringDay || "",
    }))
  );

  donationsSheet.addRows(
    donations.map((donation) => ({
      date: donation.date,
      recipient: donation.recipient,
      amount: formatCurrency(donation.amount, donation.currency || currency),
      recurring: donation.isRecurring ? "כן" : "לא",
      day: donation.recurringDay || "",
    }))
  );

  [incomesSheet, donationsSheet].forEach((sheet) => {
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: "middle", horizontal: "right" };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `Ten10-report-${new Date().toISOString().split("T")[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}

export async function exportToPDF(
  incomes: Income[],
  donations: Donation[],
  currency: Currency
) {
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
    putOnlyUsedFonts: true,
    compress: true,
    hotfixes: ["px_scaling"],
    encoding: "UTF-8",
  });

  await addFontToJsPDF(doc);

  // כותרת
  doc.setFontSize(20);
  doc.text("דוח הכנסות ותרומות", 190, 20, { align: "right" });

  // סיכום נתונים
  doc.setFontSize(12);
  const totalIncome = incomes.reduce((sum, income) => {
    const amount =
      income.currency === currency
        ? income.amount
        : convertCurrency(income.amount, income.currency || "ILS", currency);
    return sum + amount;
  }, 0);

  const totalDonations = donations.reduce((sum, donation) => {
    const amount =
      donation.currency === currency
        ? donation.amount
        : convertCurrency(
            donation.amount,
            donation.currency || "ILS",
            currency
          );
    return sum + amount;
  }, 0);

  doc.text(`סך הכנסות: ${formatCurrency(totalIncome, currency)}`, 190, 30, {
    align: "right",
  });
  doc.text(`סך תרומות: ${formatCurrency(totalDonations, currency)}`, 190, 40, {
    align: "right",
  });

  // טבלת הכנסות
  doc.setFontSize(14);
  doc.text("הכנסות", 190, 55, { align: "right" });

  const incomesTableData = incomes.map((income) => [
    new Date(income.date).toLocaleDateString("he-IL"),
    income.description,
    formatCurrency(income.amount, income.currency || currency),
    income.isChomesh ? "כן" : "לא",
    income.isRecurring ? "כן" : "לא",
    income.recurringDay?.toString() || "",
  ]);

  (doc as any).autoTable({
    startY: 60,
    head: [["תאריך", "תיאור", "סכום", "חומש", "תשלום קבוע", "יום בחודש"]],
    body: incomesTableData,
    theme: "grid",
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "right",
    },
    styles: {
      font: "helvetica",
      halign: "right",
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 50 },
      2: { cellWidth: 30 },
      3: { cellWidth: 20 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 },
    },
  });

  // טבלת תרומות
  doc.setFontSize(14);
  doc.text("תרומות", 190, (doc as any).lastAutoTable.finalY + 15, {
    align: "right",
  });

  const donationsTableData = donations.map((donation) => [
    new Date(donation.date).toLocaleDateString("he-IL"),
    donation.recipient,
    formatCurrency(donation.amount, donation.currency || currency),
    donation.isRecurring ? "כן" : "לא",
    donation.recurringDay?.toString() || "",
  ]);

  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [["תאריך", "מקבל", "סכום", "תשלום קבוע", "יום בחודש"]],
    body: donationsTableData,
    theme: "grid",
    headStyles: {
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: "bold",
      halign: "right",
    },
    styles: {
      font: "helvetica",
      halign: "right",
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 60 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 },
    },
  });

  doc.save(`Ten10-report-${new Date().toISOString().split("T")[0]}.pdf`);
}
