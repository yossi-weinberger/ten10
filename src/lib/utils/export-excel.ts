import ExcelJS from 'exceljs';
import type { Income, Donation, Currency } from '@/lib/store';
import { formatCurrency } from './currency';

export async function exportToExcel(incomes: Income[], donations: Donation[], currency: Currency) {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'Tenten';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = true;

  const incomesSheet = workbook.addWorksheet('הכנסות', {
    properties: { 
      defaultRowHeight: 20,
      rightToLeft: true
    }
  });
  const donationsSheet = workbook.addWorksheet('תרומות', {
    properties: { 
      defaultRowHeight: 20,
      rightToLeft: true
    }
  });

  incomesSheet.columns = [
    { header: 'תאריך', key: 'date', width: 12 },
    { header: 'תיאור', key: 'description', width: 30 },
    { header: 'סכום', key: 'amount', width: 15 },
    { header: 'חומש', key: 'chomesh', width: 10 },
    { header: 'תשלום קבוע', key: 'recurring', width: 15 },
    { header: 'יום בחודש', key: 'day', width: 12 }
  ];

  donationsSheet.columns = [
    { header: 'תאריך', key: 'date', width: 12 },
    { header: 'מקבל', key: 'recipient', width: 30 },
    { header: 'סכום', key: 'amount', width: 15 },
    { header: 'תשלום קבוע', key: 'recurring', width: 15 },
    { header: 'יום בחודש', key: 'day', width: 12 }
  ];

  incomesSheet.addRows(incomes.map(income => ({
    date: income.date,
    description: income.description,
    amount: formatCurrency(income.amount, income.currency || currency),
    chomesh: income.isChomesh ? 'כן' : 'לא',
    recurring: income.isRecurring ? 'כן' : 'לא',
    day: income.recurringDay || ''
  })));

  donationsSheet.addRows(donations.map(donation => ({
    date: donation.date,
    recipient: donation.recipient,
    amount: formatCurrency(donation.amount, donation.currency || currency),
    recurring: donation.isRecurring ? 'כן' : 'לא',
    day: donation.recurringDay || ''
  })));

  [incomesSheet, donationsSheet].forEach(sheet => {
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'right' };
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `tenten-report-${new Date().toISOString().split('T')[0]}.xlsx`;
  a.click();
  window.URL.revokeObjectURL(url);
}