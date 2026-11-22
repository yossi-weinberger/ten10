/**
 * Synthetic Israeli bank/card export builders for import tests.
 * Mirrors fake-banks/gen.mjs layouts — no real personal data.
 */
import ExcelJS from "exceljs";

function encodeWindows1255(text: string): Uint8Array {
  const bytes: number[] = [];
  for (const char of text) {
    const cp = char.codePointAt(0)!;
    if (cp >= 0x5d0 && cp <= 0x5ea) {
      bytes.push(cp - 0x5d0 + 0xe0);
    } else if (cp < 128) {
      bytes.push(cp);
    } else {
      throw new Error(`unmapped windows-1255 char U+${cp.toString(16)}`);
    }
  }
  return Uint8Array.from(bytes);
}

async function workbookToBuffer(
  sheets: Array<{ title: string; rows: unknown[][]; merges?: string[] }>,
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  for (const { title, rows, merges = [] } of sheets) {
    const worksheet = workbook.addWorksheet(title, {
      views: [{ rightToLeft: true }],
    });
    for (const row of rows) worksheet.addRow(row);
    for (const merge of merges) worksheet.mergeCells(merge);
  }
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

export function buildLeumiCsv(options: {
  encoding: "utf8" | "windows-1255";
  withTitle: boolean;
}): { name: string; bytes: Uint8Array } {
  const lines = [
    'תנועות בחשבון עו"ש - לאומי',
    "תאריך,תאריך ערך,תיאור,אסמכתא,בחובה,בזכות,היתרה בש''ח",
    '02/11/26,02/11/26,משכורת,1001,,"12,500.00","15,300.00"',
    '03/11/26,03/11/26,לאומי קארד,1002,"4,210.55",,"11,089.45"',
    '05/11/26,05/11/26,העברה - צדקה,1003,360.00,,"10,729.45"',
    '14/11/26,14/11/26,ביטוח לאומי,1004,,548.00,"11,277.45"',
  ];
  const body = (options.withTitle ? lines : lines.slice(1)).join("\r\n");
  if (options.encoding === "windows-1255") {
    return { name: "leumi-1255.csv", bytes: encodeWindows1255(body) };
  }
  const utf8 = new TextEncoder().encode(`\uFEFF${body}`);
  return {
    name: options.withTitle ? "leumi-utf8.csv" : "leumi-utf8-noTitle.csv",
    bytes: utf8,
  };
}

export const LEUMI_HTML_XLS = `<html><head><meta charset="utf-8"></head><body>
<table>
<tr><td colspan="7">בנק לאומי | תנועות בחשבון</td></tr>
<tr><td colspan="7">מס' חשבון : 12-345-678901</td></tr>
<tr>
  <th>תאריך</th><th>תאריך ערך</th><th>תיאור</th><th>אסמכתא</th>
  <th>בחובה</th><th>בזכות</th><th>היתרה בש"ח</th>
</tr>
<tr><td>02/11/26</td><td>02/11/26</td><td>משכורת</td><td>1001</td><td></td><td>12,500.00</td><td>15,300.00</td></tr>
<tr><td>03/11/26</td><td>03/11/26</td><td>לאומי קארד</td><td>1002</td><td>4,210.55</td><td></td><td>11,089.45</td></tr>
<tr><td>05/11/26</td><td>05/11/26</td><td>העברה - צדקה</td><td>1003</td><td>360.00</td><td></td><td>10,729.45</td></tr>
</table>
</body></html>`;

export const MIZRAHI_HTML_XLS = `\uFEFF<html><head><meta charset="utf-8"></head><body>
<table>
<tr><td colspan="7">יתרה ותנועות בחשבון</td></tr>
<tr><td colspan="7">מספר חשבון: 12-345-678</td></tr>
<tr>
  <td>תאריך</td><td>תאריך ערך</td><td>סוג תנועה</td><td>זכות</td><td>חובה</td><td>יתרה בש"ח</td><td>אסמכתא</td>
</tr>
<tr><td>02/11/26</td><td>02/11/26</td><td>העברה</td><td>12500</td><td></td><td>15300</td><td>7001</td></tr>
<tr><td>03/11/26</td><td>03/11/26</td><td>חיוב</td><td></td><td>4210.55</td><td>11089.45</td><td>7002</td></tr>
</table>
</body></html>`;

export async function buildHapoalimXlsx(): Promise<File> {
  const buffer = await workbookToBuffer([
    {
      title: "תנועות בחשבון",
      merges: ["A1:I1"],
      rows: [
        ['תנועות בחשבון עו"ש'],
        ["מספר חשבון: 12-345-678901"],
        ["תאריך הפקה: 20/11/2026"],
        [],
        [
          "תאריך",
          "תיאור הפעולה",
          "פרטים",
          "חשבון",
          "אסמכתא",
          "תאריך ערך",
          "חובה",
          "זכות",
          'יתרה בש"ח',
        ],
        ["02/11/2026", "משכורת", 'חברה בע"מ', "", "99001", "02/11/2026", "", "12,500.00", "15,300.00"],
        ["03/11/2026", "כרטיס אשראי", "ישראכרט", "", "99002", "03/11/2026", "4,210.55", "", "11,089.45"],
      ],
    },
  ]);
  return new File([buffer], "hapoalim.xlsx");
}

export async function buildMizrahiXlsxAsXls(): Promise<File> {
  const buffer = await workbookToBuffer([
    {
      title: "תנועות",
      rows: [
        ["תאריך", "סוג תנועה", "תאור", "₪ זכות", "₪ חובה", "₪ יתרה", "אסמכתא", "תאריך ערך"],
        ["02/11/26", "העברה", "משכורת", "12500", "", "15300", "7001", "02/11/26"],
        ["03/11/26", "חיוב", "כרטיס אשראי", "", "4210.55", "11089.45", "7002", "03/11/26"],
      ],
    },
  ]);
  return new File([buffer], "mizrahi.xls");
}

export async function buildMaxXlsx(): Promise<File> {
  const maxHead = [
    "תאריך עסקה",
    "שם בית העסק",
    "קטגוריה",
    "4 ספרות אחרונות של כרטיס האשראי",
    "סוג עסקה",
    "סכום חיוב",
    "מטבע חיוב",
    "סכום עסקה מקורי",
    "מטבע עסקה מקורי",
    "תאריך חיוב",
    "הערות",
    "תיוג",
    "מועדון הנחות",
    "מפתח דיסקונט",
    "אופן ביצוע ההעסקה",
    'שער המרה ממטבע מקור/התחשבנות לש"ח',
  ];
  const buffer = await workbookToBuffer([
    {
      title: "עסקאות במועד החיוב",
      rows: [
        ["כל המשתמש"],
        ["כל הכרטיסים"],
        ["11/2026"],
        maxHead,
        [
          "03-11-2026",
          "שופרסל",
          "מזון וצריכה",
          "1234",
          "רגילה",
          412.3,
          "₪",
          412.3,
          "₪",
          "10-12-2026",
          "",
          "",
          "",
          "",
          "טלפוני",
          "",
        ],
      ],
    },
    {
      title: 'עסקאות חו"ל ומט"ח',
      rows: [
        ["כל המשתמש"],
        [],
        [],
        maxHead,
        [
          "10-11-2026",
          "AMAZON",
          "שונות",
          "1234",
          "רגילה",
          171.2,
          "₪",
          45.99,
          "USD",
          "10-12-2026",
          "",
          "",
          "",
          "",
          "אינטרנט",
          "3.72",
        ],
      ],
    },
  ]);
  return new File([buffer], "max.xlsx");
}

export async function buildCalXlsx(): Promise<File> {
  const buffer = await workbookToBuffer([
    {
      title: "פירוט",
      rows: [
        ["פירוט עסקאות - כאל"],
        [],
        ["תאריך עסקה", "שם בית עסק", "סכום עסקה", "סכום חיוב", "סוג עסקה", "ענף", "הערות"],
        ["03/11/26", "שופרסל", "₪ 412.30", "₪ 412.30", "רגילה", "מזון", ""],
        ["05/11/26", "פז", "₪ 250.00", "₪ 250.00", "רגילה", "דלק", ""],
      ],
    },
  ]);
  return new File([buffer], "cal.xlsx");
}
