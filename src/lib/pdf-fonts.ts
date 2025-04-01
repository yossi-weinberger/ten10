import type { jsPDF } from 'jspdf';

export async function addFontToJsPDF(doc: jsPDF) {
  // הגדרת כיוון טקסט מימין לשמאל
  doc.setR2L(true);
  
  // הגדרת שפה לעברית
  doc.setLanguage("he");
  
  // שימוש בפונט ברירת מחדל של jsPDF
  doc.setFont('helvetica');
  
  return doc;
}