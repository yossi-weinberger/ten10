import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { Income, Donation, Currency } from '@/lib/store';
import { formatCurrency, convertCurrency } from './currency';
import { addFontToJsPDF } from '../pdf-fonts';

export async function exportToPDF(incomes: Income[], donations: Donation[], currency: Currency) {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    putOnlyUsedFonts: true,
    compress: true,
    hotfixes: ['px_scaling'],
    encoding: 'UTF-8'
  });

  await addFontToJsPDF(doc);
  
  // כותרת
  doc.setFontSize(20);
  doc.text("דוח הכנסות ותרומות", 190, 20, { align: "right" });
  
  // סיכום נתונים
  doc.setFontSize(12);
  const totalIncome = incomes.reduce((sum, income) => {
    const amount = income.currency === currency 
      ? income.amount 
      : convertCurrency(income.amount, income.currency || 'ILS', currency);
    return sum + amount;
  }, 0);
  
  const totalDonations = donations.reduce((sum, donation) => {
    const amount = donation.currency === currency 
      ? donation.amount 
      : convertCurrency(donation.amount, donation.currency || 'ILS', currency);
    return sum + amount;
  }, 0);
  
  doc.text(`סך הכנסות: ${formatCurrency(totalIncome, currency)}`, 190, 30, { align: "right" });
  doc.text(`סך תרומות: ${formatCurrency(totalDonations, currency)}`, 190, 40, { align: "right" });

  // טבלת הכנסות
  doc.setFontSize(14);
  doc.text("הכנסות", 190, 55, { align: "right" });
  
  const incomesTableData = incomes.map(income => [
    new Date(income.date).toLocaleDateString('he-IL'),
    income.description,
    formatCurrency(income.amount, income.currency || currency),
    income.isChomesh ? 'כן' : 'לא',
    income.isRecurring ? 'כן' : 'לא',
    income.recurringDay?.toString() || ''
  ]);

  (doc as any).autoTable({
    startY: 60,
    head: [['תאריך', 'תיאור', 'סכום', 'חומש', 'תשלום קבוע', 'יום בחודש']],
    body: incomesTableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'right'
    },
    styles: {
      font: 'helvetica',
      halign: 'right',
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 50 },
      2: { cellWidth: 30 },
      3: { cellWidth: 20 },
      4: { cellWidth: 25 },
      5: { cellWidth: 25 }
    }
  });

  // טבלת תרומות
  doc.setFontSize(14);
  doc.text("תרומות", 190, (doc as any).lastAutoTable.finalY + 15, { align: "right" });

  const donationsTableData = donations.map(donation => [
    new Date(donation.date).toLocaleDateString('he-IL'),
    donation.recipient,
    formatCurrency(donation.amount, donation.currency || currency),
    donation.isRecurring ? 'כן' : 'לא',
    donation.recurringDay?.toString() || ''
  ]);

  (doc as any).autoTable({
    startY: (doc as any).lastAutoTable.finalY + 20,
    head: [['תאריך', 'מקבל', 'סכום', 'תשלום קבוע', 'יום בחודש']],
    body: donationsTableData,
    theme: 'grid',
    headStyles: { 
      fillColor: [60, 60, 60],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'right'
    },
    styles: {
      font: 'helvetica',
      halign: 'right',
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { cellWidth: 25 },
      1: { cellWidth: 60 },
      2: { cellWidth: 30 },
      3: { cellWidth: 25 },
      4: { cellWidth: 25 }
    }
  });

  doc.save(`tenten-report-${new Date().toISOString().split('T')[0]}.pdf`);
}